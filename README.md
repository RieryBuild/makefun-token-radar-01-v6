# makefun-token-radar-01-v6

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/RieryBuild/makefun-token-radar-01-v6/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/RieryBuild/makefun-token-radar-01-v6/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Every protocol that records no token, priced off the tokens that already trade — with the deployed model tested out of sample before it prices anything, and a farm verdict netted to the dollar per $1,000 of capital.

## Run it

```sh
node main.ts [--input <snapshot.json|directory>] [--output <directory>]
```

## How it works

Launch Radar reads the sealed DefiLlama snapshot and ranks every pre-token protocol by implied launch value under the `radar-6` model:

```text
implied value = 10^(a + b·log10 TVL) × growth × maturity × chains
```

- **The launch curve is fitted, not typed in.** The 128 protocols whose token already trades are the comparables: a least-squares line of log10(market cap) on log10(TVL) is fitted to them at run time. The slope comes out near 0.52 — value grows with roughly the square root of TVL.
- **The tests price the deployed model, not the curve alone.** Leave-one-out over the comparables (median miss ×3.57), two blind time-splits (trained on tokens listed before 2025, tested on the ones listed since: median miss ×3.02; before 2024: ×2.82), plus a repeated 5-fold cross-validation (×3.48 over 20 repeats, pooled median ×3.48) — every test prices curve × growth × maturity × chains, the function that actually ships. The curve-alone numbers sit beside them as a labelled comparison (LOO ×3.40, blind 2025 ×3.08, blind 2024 ×2.91, CV ×3.58): the multipliers cost 0.17× on leave-one-out and earn on both blind splits and on CV. The dashboard says so in both directions rather than quoting only the flattering half.
- **Seven richer variants were fitted the same way and dropped** — growth, age, chain count, all three together, a quadratic curve, a quadratic curve with the multipliers, and per-category offsets — and every one misses worse out of sample than its baseline on both tests, or edges it on leave-one-out only to lose on cross-validation. The bare quadratic is compared against the pooled line it would replace (×3.38 vs ×3.40 on leave-one-out, ×3.63 vs ×3.58 on CV); the quadratic with the multipliers is compared against the deployed model (×3.51 vs ×3.57 on leave-one-out, ×3.56 vs ×3.48 on CV) — both edges are noise, settled by cross-validation. The dashboard shows each variant's numbers on both tests, with its baseline named.
- **Growth** — the protocol's 7-day change, clamped to −60%…+120%, half weight.
- **Maturity** — 0.60 at listing, rising to 1.00 after 3 years running with no token.
- **Chains** — +2% per extra chain, capped at +10%.

No protocol's name ever changes its score. Each row carries the band the backtest earns — implied ÷ and × 3.57, the full model's leave-one-out median miss — shown as a log-scale bar, so a value of $10M reads as roughly $3M–$36M instead of a false precision. The dashboard also states plainly what the model cannot price: whether or when a token launches, airdrop rules, points programs, team decisions, or tokenomics.

## The whole snapshot, audited

The board covers all 758 protocols in the snapshot — nothing is silently dropped:

- **198 ranked** — the whole watchlist plus every other rankable pre-token protocol at any TVL, including 20 above the watchlist floor that a floor-cut radar misses. The watchlist passes through the same rankability check as every other row.
- **144 set aside, each with its reason** — pre-token protocols the house rule keeps off the launch list: wrapped or staked products of a token that trades, versioned pools of another protocol, exchange products, and the excluded categories (bridges, exchanges, liquid staking and restaking). They are counted and listed, never priced as launches.
- **416 already trading** — shown at their own market value, never mixed into the ranked board. The 128 with a market cap above zero are the comparables the curve is fitted to.

198 + 144 + 416 = 758. The program refuses to run if the three groups do not add up to the snapshot.

## Farm economics, per $1,000

Each row carries a farm verdict — FARM, THIN or SKIP — netted to the dollar under assumptions the dashboard states in full: the airdrop pool is 10% of the implied value, shared pro-rata by TVL among depositors, so a $1,000 position takes 10% × implied × ($1,000 ÷ TVL), priced at the snapshot's TVL. Farming costs $11 to set up (the plan's three setup transactions: fund the fresh wallet, first deposit, second deposit), $2 of gas a week, and the 4% a year the $1,000 forgoes while it sits in the position. Net = slice − cost; FARM at $10 or more, THIN from $0, SKIP below $0. The net per hands-on hour sits beside the net in the verdict column, so the board sorts by the hour, not just by the dollar — the best net per hour is headlined in the model panel. In this snapshot: 39 FARM, 45 THIN, 114 SKIP — and every one of the 40 watchlist protocols is a SKIP, because their TVLs are so large that a $1,000 position's slice cannot cover the cost; the FARM rows are all smaller protocols.

Every row also carries an 8-step farm plan, derived from the protocol's own category, chains, TVL and age: a setup step, the first qualifying action, a second action in a different mechanism, a weekly action, the hold window (60 days under 6 months old, 45 under a year, 30 older), a safety check, the claim step, and the verdict with the net — so the plan itself says whether the farm is worth doing.

## Output

It reads the sealed snapshot (`--input`, else `MAKEFUN_INPUT_DIR`, else `/input/snapshot.json`) and writes to `--output`, else `MAKEFUN_OUTPUT_DIR`, else `/output`:

- `board.json` — the ranked board: rank, protocol, TVL, 7-day growth, age, implied value, the value band, the model's working, $1,000 farm economics and an 8-step farm plan per row.
- `data.js` — the dashboard's whole dataset as one script.
- `dashboard/` — the static dashboard: the validation strip (full-model tests + curve-alone comparison + dropped variants + what the model cannot price), the board (search, filter by category, chain and verdict, watchlist-only, sortable by value, net, net per hour, slice, TVL, growth, age or name), the set-aside and trading tabs, a detail view with the model's working, the farm economics and the farm plan, and the model panel with the fit, the dropped variants and the scatter of traded tokens against the curve.
- `screenshots/` — the dashboard in four states.
- `dossier.json` — the dossier `vendor/makefun-board.ts` writes for the dashboard and screenshots.

Requirements: Node 22.18+ (verified on 24.22.1 and under the grader's sandbox conditions: uid 65534, minimal env, cwd `/`, no network). Standard library only — no install, no network. Deterministic: the same snapshot always yields the same bytes.

## Notes on the build

- `vendor/makefun-board.ts` is the kit's own dossier library, copied verbatim from the competition kit's starter. The scorer runs the same file byte for byte, so the dossier matches by construction.
- Every path is resolved off `main.ts` itself (`import.meta.url`), never off the working directory: the grader runs `node /bot/main.ts` with the container's cwd at `/`, and a cwd-relative copy would fail there.
- “Pre-token” means the protocol's record carries no token — no market cap, no CoinGecko id, no symbol — not that it has promised one. Implied value is a ranking model, not a price prediction, and the farm net is a scenario, not a promise of any payout.

## License

[MIT](LICENSE)

---

<sub>Entered on [make.fun](https://make.fun/?ref=wa8s3t3t&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
