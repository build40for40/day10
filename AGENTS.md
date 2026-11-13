# Day 10

Day 10 of 40 for 40, built live on Twitch on Friday 13 November 2026. The problem is "Chipped nails". Work is tracked on the Superthread "Day 10" page.

- **Form factor:** data visualisation.
- **Name:** TBC. Once it has one, this repo is renamed after it and the app is served at `build40for40.com/<app>/`.

Shared 40 for 40 context lives in `../AGENTS.md`.

## The problem

My nails are always chipped

## Data: chips and nails versus the S&P 500

The angle is every kind of chip and nail, charted against the stock market with a straight face. `scripts/fetch.mjs` downloads the series into `data/raw/` (gitignored) and writes the tidy files in `data/`. It needs Node 18 or later and no keys.

```sh
node scripts/fetch.mjs           # download, then build
node scripts/fetch.mjs --build   # only rebuild from data/raw/
```

| File | What | Covers | Source |
| --- | --- | --- | --- |
| `data/sp500.csv` | S&P 500 monthly level, consumer prices and the inflation-adjusted level | Jan 1871 to Sep 2026 (inflation-adjusted stops at Sep 2023) | Robert Shiller's dataset, via `datasets/s-and-p-500` on GitHub |
| `data/potato-chips.csv` | Average US price of a 16oz bag of potato chips, dollars, monthly | Jan 1980 to Oct 2026 (Oct 2025 missing at source) | Bureau of Labor Statistics series `APU0000718311`, via FRED |
| `data/nails-ppi.csv` | US producer price index for steel nails, staples, tacks, spikes and brads, June 2009 = 100 | Jun 2009 to Sep 2026 (Jul to Sep 2009 missing at source) | BLS series `WPU10881201`, via FRED |
| `data/nails-ppi-1997-2009.csv` | The older nail index, June 1997 = 100. A different basket, so not spliced onto the new one | Jun 1997 to Jun 2009 | BLS series `WPU108812012`, via FRED |
| `data/nails-eras.json` | Average yearly change in the real price of nails in five eras | 1791 to 2018 | Sichel, "The Price of Nails since 1695", NBER Working Paper 29617, Table 1 |
| `data/nails-long-run.csv` | Those era averages compounded into an index, 1790 = 100. Six points, not a yearly series | 1790 to 2018 | Built from `nails-eras.json` |
| `data/yearly.csv` | One row per year with every series averaged over the year. A year needs at least 11 monthly readings to count | 1871 to 2025 | Built from the files above |
| `data/events.json` | Timeline of nails, potato chips, nail polish and the index, each row with its source | 1645 to 2012 | Sichel's data appendix and Wikipedia |

First look (yearly averages, 13 Nov 2026):

- Potato chips went from $2.04 a bag in 1980 to $6.71 in 2025. Against the S&P 500 over those 46 years the correlation is 0.91.
- Nails against the S&P 500, 2010 to 2025: 0.83. Chips against nails: 0.74.
- Real nail prices fell to about a tenth of their 1790 level by 1930, then quadrupled by 2018.

Those correlations are two lines that both go up, nothing more. Inflation and time drive all of them, which is the joke. Don't present any of it as a real link.

Gaps: Sichel's year-by-year nail prices from 1695 are in a replication package behind an openICPSR login, so only the era averages are here. There is no price series for nail polish or manicures yet. Lay's and Pringles are not in the timeline because their dates haven't been checked against a source.
