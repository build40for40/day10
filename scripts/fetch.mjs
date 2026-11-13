// Downloads the raw series into data/raw/ (gitignored) and writes tidy files into data/.
// Run: node scripts/fetch.mjs            (download, then build)
//      node scripts/fetch.mjs --build    (only rebuild from what is already in data/raw/)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const RAW = new URL('../data/raw/', import.meta.url);
const OUT = new URL('../data/', import.meta.url);

const fred = (id) => `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`;

// file in data/raw/ -> where it comes from
const SOURCES = {
  'sp500.csv': 'https://raw.githubusercontent.com/datasets/s-and-p-500/main/data/data.csv',
  'chips.csv': fred('APU0000718311'),
  'nails_WPU10881201.csv': fred('WPU10881201'),
  'nails_WPU108812012.csv': fred('WPU108812012'),
};

async function download() {
  await mkdir(RAW, { recursive: true });
  for (const [file, url] of Object.entries(SOURCES)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${file}: ${res.status} from ${url}`);
    const text = await res.text();
    if (!/^[A-Za-z_]+,/.test(text)) throw new Error(`${file}: did not get a CSV back from ${url}`);
    await writeFile(new URL(file, RAW), text);
    console.log(`fetched ${file} (${text.trim().split('\n').length - 1} rows)`);
  }
}

async function rows(file) {
  const text = await readFile(new URL(file, RAW), 'utf8');
  const [head, ...lines] = text.trim().split('\n');
  const cols = head.split(',');
  return lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v])));
}

// A blank, "." or 0 means "no reading" in these files, never a real zero.
const num = (v) => {
  const n = Number(v);
  return v === '' || v === '.' || !Number.isFinite(n) || n === 0 ? null : n;
};

const csv = (header, data) =>
  [header.join(','), ...data.map((r) => header.map((h) => r[h] ?? '').join(','))].join('\n') + '\n';

function yearly(series, key) {
  const by = new Map();
  for (const r of series) {
    if (r[key] == null) continue;
    const y = r.date.slice(0, 4);
    by.set(y, [...(by.get(y) ?? []), r[key]]);
  }
  // Only (nearly) full years, so a half-finished year never looks like a dip or a jump. One missing month is allowed.
  return new Map([...by].filter(([, v]) => v.length >= 11).map(([y, v]) => [y, v.reduce((a, b) => a + b) / v.length]));
}

async function build() {
  const sp = (await rows('sp500.csv')).map((r) => ({
    date: r.Date,
    sp500: num(r.SP500),
    cpi: num(r['Consumer Price Index']),
    sp500_real: num(r['Real Price']),
  }));
  const chips = (await rows('chips.csv')).map((r) => ({ date: r.observation_date, usd_per_16oz: num(r.APU0000718311) }));
  const nailsNew = (await rows('nails_WPU10881201.csv')).map((r) => ({ date: r.observation_date, index_jun2009: num(r.WPU10881201) }));
  const nailsOld = (await rows('nails_WPU108812012.csv')).map((r) => ({ date: r.observation_date, index_jun1997: num(r.WPU108812012) }));

  await writeFile(new URL('sp500.csv', OUT), csv(['date', 'sp500', 'cpi', 'sp500_real'], sp));
  await writeFile(new URL('potato-chips.csv', OUT), csv(['date', 'usd_per_16oz'], chips));
  await writeFile(new URL('nails-ppi.csv', OUT), csv(['date', 'index_jun2009'], nailsNew));
  await writeFile(new URL('nails-ppi-1997-2009.csv', OUT), csv(['date', 'index_jun1997'], nailsOld));

  // Long-run nails: compound the paper's average yearly change per era into an index, 1790 = 100.
  const eras = JSON.parse(await readFile(new URL('nails-eras.json', OUT), 'utf8'));
  let level = 100;
  const longRun = [{ year: eras.eras[0].from - 1, real_index_1790: 100 }];
  for (const e of eras.eras) {
    level *= (1 + e.real_change_pct_per_year / 100) ** (e.to - e.from + 1);
    longRun.push({ year: e.to, real_index_1790: level.toFixed(1) });
  }
  await writeFile(new URL('nails-long-run.csv', OUT), csv(['year', 'real_index_1790'], longRun));

  // One row per year for charting everything on the same axis.
  const cols = {
    sp500: yearly(sp, 'sp500'),
    sp500_real: yearly(sp, 'sp500_real'),
    chips_usd_per_16oz: yearly(chips, 'usd_per_16oz'),
    nails_ppi_jun2009: yearly(nailsNew, 'index_jun2009'),
  };
  const years = [...new Set(Object.values(cols).flatMap((m) => [...m.keys()]))].sort();
  const table = years.map((year) => ({
    year,
    ...Object.fromEntries(Object.entries(cols).map(([k, m]) => [k, m.has(year) ? m.get(year).toFixed(k.startsWith('chips') ? 3 : 2) : ''])),
  }));
  await writeFile(new URL('yearly.csv', OUT), csv(['year', ...Object.keys(cols)], table));

  console.log(`sp500 ${sp[0].date} to ${sp.at(-1).date}, chips ${chips[0].date} to ${chips.at(-1).date}, nails PPI ${nailsOld[0].date} to ${nailsNew.at(-1).date}`);
  console.log(`yearly.csv: ${table.length} years; nails long run: ${longRun.map((r) => `${r.year}=${r.real_index_1790}`).join(', ')}`);
}

if (!process.argv.includes('--build')) await download();
else if (!existsSync(new URL('sp500.csv', RAW))) throw new Error('data/raw/ is empty, run without --build first');
await build();
