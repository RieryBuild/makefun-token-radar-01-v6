// Launch Radar, model radar-6: one sealed snapshot in, one ranked board out.
//
// radar-6 keeps radar-5's value core and fixes what its independent review found: every
// out-of-sample test now prices the DEPLOYED model — the fitted curve times the growth,
// maturity and chains multipliers — instead of the bare curve. The proof strip shows the
// full-model numbers; the curve-alone numbers stay beside them as a labelled comparison,
// so a reader can see exactly what the multipliers cost or earn. If the full model tests
// worse than the curve alone, the dashboard says so: an honest complete validation beats
// an overclaiming strip.
//
// What the tests are, and what each one prices:
//   leave-one-out     refit the curve without each traded token, price it with the full
//                     model (curve x its own multipliers), score the miss — and the same
//                     pass with the curve alone, for comparison
//   blind time-split  train on tokens listed before a cut, test on the ones listed since,
//                     full model and curve alone side by side
//   repeated 5-fold   20 seeded repeats of 5-fold cross-validation, full model and curve
//                     alone, each summarised two ways (mean of per-repeat medians, and the
//                     pooled median over every miss)
//   dropped variants  six richer fits plus a quadratic curve WITH the multipliers, each
//                     tested the same way and compared against the FULL model — the
//                     quadratic comparison is no longer a straw man, because the
//                     multiplier version of the quadratic is in the table too
//
// The board ranks every protocol the house rule admits as a launch candidate: the whole
// watchlist (the floor, never a ceiling) plus every other rankable pre-token protocol at
// any TVL — and the watchlist now passes through the same isRankable() check as every
// other row, instead of being admitted unconditionally. Protocols whose token already
// trades are kept apart and shown at the market's own value, never mixed into the ranked
// board. Pre-token protocols the rule sets aside — wrapped or staked products, versioned
// pools, exchange products, excluded categories — are listed with the reason each, never
// hidden and never priced as launches. Ranked + set aside + trading must add up to the
// snapshot, or the program refuses to run.
//
// "Pre-token" means the protocol's record carries no token — no market cap, no CoinGecko
// id, no symbol — not that it has promised one. Implied value is a ranking model, not a
// price prediction, and the farm net is a scenario, not a promise of any payout.

/** One protocol entry: exactly the ten fields the sealed snapshot carries. */
export interface Protocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: Protocol[];
  watchlist: string[];
}

/** The fitted launch curve: log10(market cap) = a + b * log10(TVL). */
export interface Curve {
  intercept: number;
  slope: number;
  r_squared: number;
  comparables: number;
}

/** One out-of-sample test's record: how the model priced tokens it had not trained on. */
export interface TestRecord {
  method: string;
  tested: number;
  median_miss_x: number;
  within_2x: number;
  within_3x: number;
}

/** One richer variant that was fitted, tested and dropped, with both its test numbers.
 * `baseline` names what it is compared against: 'full' for the deployed model, 'curve'
 * for the pooled line alone. A variant that prices through its own curve only (the bare
 * quadratic) is compared against the pooled line, not against a model with multipliers
 * it never had — comparing it against the full model would conflate the curve family
 * with the multipliers. */
export interface DroppedVariant {
  name: string;
  loo_median_miss_x: number;
  cv_median_miss_x: number;
  baseline: 'full' | 'curve';
  note: string;
}

/**
 * The whole validation record. Every headline test exists twice: the FULL model (the
 * deployed pricing function, curve x multipliers) and the curve alone, so the dashboard
 * can show what the multipliers do to out-of-sample accuracy instead of hiding it.
 */
export interface Validation {
  loo: TestRecord;
  loo_curve: TestRecord;
  blind2025: TestRecord;
  blind2025_curve: TestRecord;
  blind2024: TestRecord;
  blind2024_curve: TestRecord;
  cv_median_miss_x: number;
  cv_pooled_median_miss_x: number;
  cv_curve_median_miss_x: number;
  cv_curve_pooled_median_miss_x: number;
  cv_quad_median_miss_x: number;
  dropped: DroppedVariant[];
}

/** The farm-economics assumptions, stated so a reader can re-run them. */
export interface FarmAssumptions {
  airdrop_share: number;
  position_usd: number;
  tbill_annual_rate: number;
  farm_at_net_usd: number;
  thin_at_net_usd: number;
  setup_gas_usd: number;
  weekly_gas_usd: number;
  setup_minutes: number;
  weekly_minutes: number;
  claim_minutes: number;
  hold_days_young: number;
  hold_days_mid: number;
  hold_days_old: number;
}

/** The model's constants, as the dashboard states them. */
export interface ModelParams {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  chain_bonus: number;
  chain_bonus_max: number;
  economics: FarmAssumptions;
}

export const PARAMS: ModelParams = {
  growth_weight: 0.5,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  chain_bonus: 0.02,
  chain_bonus_max: 5,
  economics: {
    airdrop_share: 0.1,
    position_usd: 1000,
    tbill_annual_rate: 0.04,
    farm_at_net_usd: 10,
    thin_at_net_usd: 0,
    // The setup gas and minutes are the plan's own setup steps added up, not a
    // separate guess: funding the fresh wallet (~$3, 5 min), the first deposit
    // (~$4, 15 min), the second deposit (~$4, 10 min). The weekly minutes are one
    // qualifying action (10) plus the weekly safety check (5); the claim minutes
    // are the claim itself (10) plus the farm log (5). The cost model and the
    // eight-step plan describe the same farm, so their numbers must agree.
    setup_gas_usd: 11,
    weekly_gas_usd: 2,
    setup_minutes: 30,
    weekly_minutes: 15,
    claim_minutes: 15,
    // The hold windows are scenario choices, set before any test: a young
    // protocol's launch is further out, so its farming window is longer; an old
    // protocol is nearer a launch decision, so the window is shorter.
    hold_days_young: 60,
    hold_days_mid: 45,
    hold_days_old: 30,
  },
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-6';

/** The blind splits' cuts: tokens listed before the cut train the curve, the rest test it. */
export const BLIND_CUT_2025 = '2025-01-01';
export const BLIND_CUT_2024 = '2024-01-01';

/** One farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

export type Verdict = 'FARM' | 'THIN' | 'SKIP';

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  band_low_usd: number;
  band_high_usd: number;
  model: {
    base_value_usd: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    age_days: number | null;
  };
  farm: {
    slice_usd: number;
    farm_cost_usd: number;
    net_per_1000_usd: number;
    net_per_hour_usd: number;
    hands_on_hours: number;
    hold_days: number;
    verdict: Verdict;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one board row. */
export interface DashRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  band_low_usd: number;
  band_high_usd: number;
  watchlist: boolean;
  base_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
  slice_usd: number;
  farm_cost_usd: number;
  net_per_1000_usd: number;
  net_per_hour_usd: number;
  hands_on_hours: number;
  hold_days: number;
  verdict: Verdict;
  farm_steps: string[];
}

/** A protocol the house rule sets aside, with the reason. */
export interface AsideRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  reason: string;
}

/** A protocol whose token already trades, at the market's own value. */
export interface TradedRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard renders. */
export interface DashData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelParams;
  model_version: string;
  curve: Curve;
  validation: Validation;
  band_median_miss_x: number;
  watchlist_size: number;
  snapshot_size: number;
  board_size: number;
  early_size: number;
  traded_size: number;
  aside_size: number;
  verdict_counts: { FARM: number; THIN: number; SKIP: number };
  best_per_hour: { slug: string; name: string; net_per_hour_usd: number };
  best_per_hour_watchlist: { slug: string; name: string; net_per_hour_usd: number };
  rows: DashRow[];
  traded: TradedRow[];
  aside: AsideRow[];
  comps: [number, number][];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const round2 = (n: number): number => Math.round(n * 100) / 100;
const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A finite number, else `fallback`. */
function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a list, or NaN when it is empty. */
function medianOf(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Whole days from `listedAt` to `asOf`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/* ------------------------------------------------------------------ */
/* The fit: least squares in log space, over the traded comparables.   */
/* ------------------------------------------------------------------ */

/** The comparables: protocols whose token trades with a market value above zero and a
 * TVL above zero — a comparable with no TVL cannot price anything, and log10(0) would
 * poison the fit with -Infinity. */
export function comparablesOf(snapshot: Snapshot): Protocol[] {
  return snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
}

/** Least squares for y = a + b*x, with R squared. */
function lineFit(xs: number[], ys: number[]): { a: number; b: number; r2: number } {
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let sst = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i]! - mx) ** 2;
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sst += (ys[i]! - my) ** 2;
  }
  const b = sxx === 0 ? 0 : sxy / sxx;
  const a = my - b * mx;
  let sse = 0;
  for (let i = 0; i < n; i++) sse += (ys[i]! - (a + b * xs[i]!)) ** 2;
  return { a, b, r2: sst === 0 ? 0 : 1 - sse / sst };
}

/**
 * Small OLS for a feature matrix: normal equations solved by Gaussian elimination with
 * partial pivoting. The 1e-8 added to each diagonal entry of X'X is a ridge so small it
 * exists only to keep a perfectly collinear direction solvable: X'X's entries here are
 * O(n * x^2), in the thousands, so 1e-8 shifts any fitted coefficient by far less than
 * one part in a million. It is a numerical guard, not a fitted regulariser.
 */
function solveOls(rows: number[][], y: number[]): number[] {
  const k = rows[0]!.length;
  const ata: number[][] = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const atb: number[] = new Array<number>(k).fill(0);
  for (let i = 0; i < rows.length; i++) {
    for (let r = 0; r < k; r++) {
      atb[r]! += rows[i]![r]! * y[i]!;
      for (let c = 0; c < k; c++) ata[r]![c]! += rows[i]![r]! * rows[i]![c]!;
    }
  }
  for (let r = 0; r < k; r++) ata[r]![r]! += 1e-8;
  const aug = ata.map((row, i) => [...row, atb[i]!]);
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(aug[r]![c]!) > Math.abs(aug[piv]![c]!)) piv = r;
    [aug[c], aug[piv]] = [aug[piv]!, aug[c]!];
    const d = aug[c]![c]!;
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = aug[r]![c]! / d;
      for (let j = c; j <= k; j++) aug[r]![j]! -= f * aug[c]![j]!;
    }
  }
  return aug.map((row, i) => row[k]! / row[i]!);
}

const dot = (a: number[], b: number[]): number => a.reduce((s, v, i) => s + v * b[i]!, 0);

/** The launch curve fitted over a set of comparables. Refuses an empty pool: a line
 * fitted to nothing would be NaN, and a NaN curve would price every protocol NaN. */
export function fitCurve(pool: Protocol[]): Curve {
  if (pool.length === 0) throw new SnapshotError('cannot fit the launch curve: no comparables');
  const fit = lineFit(
    pool.map((p) => Math.log10(p.tvl_usd)),
    pool.map((p) => Math.log10(p.mcap_usd!)),
  );
  return { intercept: fit.a, slope: fit.b, r_squared: fit.r2, comparables: pool.length };
}

/**
 * The curve's base value for a TVL: 10^(a + b*log10(TVL)). A TVL at or below zero is
 * clamped to $1 before the log, because log10(0) is undefined; the snapshot's floor is
 * $5M, so no live protocol reaches the clamp — it guards a future snapshot with a
 * zero-TVL row, and the clamped price is 10^intercept, the curve's value at $1 of TVL.
 */
function curveBase(curve: Curve, tvlUsd: number): number {
  return 10 ** (curve.intercept + curve.slope * Math.log10(Math.max(1, tvlUsd)));
}

/** The miss of a prediction against the truth, as a multiple: 2 means off by 2x either way. */
function missFactor(predicted: number, actual: number): number {
  return 10 ** Math.abs(Math.log10(predicted / actual));
}

/** A test record out of a list of misses. */
function recordOf(method: string, misses: number[]): TestRecord {
  const share = (times: number): number => misses.filter((m) => m <= times).length / misses.length;
  return {
    method,
    tested: misses.length,
    median_miss_x: round2(medianOf(misses)),
    within_2x: Math.round(share(2) * 1000) / 1000,
    within_3x: Math.round(share(3) * 1000) / 1000,
  };
}

/* ------------------------------------------------------------------ */
/* The multipliers: the three adjustments on top of the fitted curve.  */
/* ------------------------------------------------------------------ */

/** The three multipliers one protocol gets, from its own record only. */
export interface Multipliers {
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  chainMult: number;
  age: number | null;
}

/**
 * The multipliers for one protocol. Each is a deterministic function of the protocol's
 * own fields — its 7-day change, its age, its chain count — with constants fixed before
 * any test runs. That is what makes full-model validation possible without leakage: in
 * leave-one-out, in a blind split, in a CV fold, the held-out protocol's multipliers
 * come from its own record, never from the training set, so only the curve itself is
 * refitted per fold.
 */
export function multipliersOf(p: Protocol, asOf: string, params: ModelParams): Multipliers {
  const age = ageDays(asOf, p.listed_at);
  const growthPct = clamp(num(p.change_7d, 0), params.growth_floor, params.growth_cap);
  const growthMult = 1 + (growthPct / 100) * params.growth_weight;
  const ageForModel = age ?? params.unknown_age_days;
  const maturityMult = params.maturity_floor + (clamp(ageForModel, 0, params.maturity_days) / params.maturity_days) * params.maturity_range;
  const chainMult = 1 + params.chain_bonus * clamp(p.chains.length - 1, 0, params.chain_bonus_max);
  return { growthPct, growthMult, maturityMult, chainMult, age };
}

/** The multipliers and the implied value one protocol gets under the fitted curve. */
export function priceProtocol(
  p: Protocol,
  asOf: string,
  curve: Curve,
  params: ModelParams,
): { implied: number; base: number; growthPct: number; growthMult: number; maturityMult: number; chainMult: number; age: number | null } {
  const m = multipliersOf(p, asOf, params);
  const base = curveBase(curve, p.tvl_usd);
  const implied = Math.max(1, Math.round(base * m.growthMult * m.maturityMult * m.chainMult));
  return { implied, base: Math.round(base), ...m };
}

/** A base value (from any curve) times one protocol's own multipliers. */
export function withMultipliers(p: Protocol, asOf: string, base: number, params: ModelParams): number {
  const m = multipliersOf(p, asOf, params);
  return Math.max(1, Math.round(base * m.growthMult * m.maturityMult * m.chainMult));
}

/* ------------------------------------------------------------------ */
/* Out-of-sample tests: leave-one-out, blind splits, repeated CV.      */
/*                                                                     */
/* Every test below runs TWICE: once pricing through the full deployed */
/* model (curve x multipliers) and once through the curve alone. The   */
/* full-model numbers are the headline; the curve-alone numbers are    */
/* the labelled comparison that shows what the multipliers do.         */
/* ------------------------------------------------------------------ */

/** Leave-one-out: refit without each comparable, price it, score the miss. */
function leaveOneOut(pool: Protocol[], price: (p: Protocol, others: Protocol[]) => number, method: string): TestRecord {
  const misses: number[] = [];
  for (let i = 0; i < pool.length; i++) {
    const others = [...pool.slice(0, i), ...pool.slice(i + 1)];
    misses.push(missFactor(price(pool[i]!, others), pool[i]!.mcap_usd!));
  }
  return recordOf(method, misses);
}

/** Blind time-split: train on the older tokens, test on the newer ones. Comparables
 * with no listed date are excluded from BOTH train and test — there is no honest side
 * to put them on — so a blind split tests fewer than the full pool (33 of this
 * snapshot's 128 comparables carry no listed date). The record's `tested` count says
 * how many were actually tested, and the dashboard shows it. */
function blindSplit(pool: Protocol[], cutoff: string, price: (p: Protocol, train: Protocol[]) => number, method: string): TestRecord {
  const train = pool.filter((p) => p.listed_at !== null && p.listed_at < cutoff);
  const test = pool.filter((p) => p.listed_at !== null && p.listed_at >= cutoff);
  if (train.length < 10 || test.length === 0) {
    return { method, tested: 0, median_miss_x: Number.NaN, within_2x: Number.NaN, within_3x: Number.NaN };
  }
  return recordOf(method, test.map((p) => missFactor(price(p, train), p.mcap_usd!)));
}

/** Deterministic PRNG (mulberry32): the same snapshot always folds the same way. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Repeated k-fold cross-validation of one predictor family: 20 repeats, each a complete
 * 5-fold pass over the pool. Two summaries are returned, because the choice of summary
 * is a real one and hiding it would be a second overclaim:
 *   mean_of_medians — the mean of the 20 per-repeat medians. The headline. Each repeat
 *     is one complete pass, so averaging per-repeat medians weights each repeat equally.
 *   pooled_median — the median over every miss of every repeat (2,560 misses at n=128).
 *     The cross-check: the two agree when no single repeat is driving the result.
 * `fit` turns a training set into a function that prices a protocol.
 */
function repeatedKFold(
  pool: Protocol[],
  fit: (train: Protocol[]) => (p: Protocol) => number,
  repeats = 20,
  folds = 5,
): { mean_of_medians: number; pooled_median: number } {
  const repeatMedians: number[] = [];
  const allMisses: number[] = [];
  for (let rep = 0; rep < repeats; rep++) {
    const rand = mulberry32(1000 + rep);
    const idx = pool.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [idx[i], idx[j]] = [idx[j]!, idx[i]!];
    }
    const misses: number[] = [];
    for (let fold = 0; fold < folds; fold++) {
      const testIdx = new Set(idx.filter((_, j) => j % folds === fold));
      const train = pool.filter((_, i) => !testIdx.has(i));
      const test = pool.filter((_, i) => testIdx.has(i));
      const price = fit(train);
      for (const p of test) misses.push(missFactor(price(p), p.mcap_usd!));
    }
    repeatMedians.push(medianOf(misses));
    allMisses.push(...misses);
  }
  return {
    mean_of_medians: round2(repeatMedians.reduce((s, v) => s + v, 0) / repeatMedians.length),
    pooled_median: round2(medianOf(allMisses)),
  };
}

/* ------------------------------------------------------------------ */
/* The dropped variants: richer fits, tested the same way, kept out.   */
/* ------------------------------------------------------------------ */

type VariantKind = 'growth' | 'age' | 'chains' | 'full' | 'quad';

/** The feature vector a variant fits: the pooled line plus one fitted effect. */
function variantFeatures(asOf: string, kind: VariantKind): (p: Protocol) => number[] {
  return (p: Protocol): number[] => {
    const x = Math.log10(p.tvl_usd);
    const growth = clamp(p.change_7d ?? 0, -60, 120) / 100;
    const age = Math.log10((ageDays(asOf, p.listed_at) ?? 365) + 30);
    const chains = clamp(p.chains.length - 1, 0, 5);
    if (kind === 'growth') return [1, x, growth];
    if (kind === 'age') return [1, x, age];
    if (kind === 'chains') return [1, x, chains];
    if (kind === 'full') return [1, x, growth, age, chains];
    return [1, x, x * x]; // quad
  };
}

/** A variant's pricer, fitted over a training set. */
function variantPricer(asOf: string, kind: VariantKind): (train: Protocol[]) => (p: Protocol) => number {
  const feat = variantFeatures(asOf, kind);
  return (train: Protocol[]) => {
    const beta = solveOls(
      train.map(feat),
      train.map((q) => Math.log10(q.mcap_usd!)),
    );
    return (p: Protocol) => 10 ** dot(feat(p), beta);
  };
}

/**
 * The category-offset variant's leave-one-out median miss: the pooled line plus each
 * category's own residual, shrunk toward zero by k = 5. The 5 is a pseudo-count, set
 * before the test and never tuned to it: a category's mean residual counts as 5
 * comparables of evidence, so a category with 5 members counts at half weight and one
 * with 20 at four-fifths. With 128 comparables spread over roughly 25 categories, most
 * categories hold fewer than 10 members, so unshrunk offsets would be mostly noise.
 */
function categoryLoo(pool: Protocol[]): number {
  const misses: number[] = [];
  for (let i = 0; i < pool.length; i++) {
    const others = [...pool.slice(0, i), ...pool.slice(i + 1)];
    const curve = fitCurve(others);
    const base = curveBase(curve, pool[i]!.tvl_usd);
    const same = others.filter((q) => q.category === pool[i]!.category);
    let offset = 0;
    if (same.length > 0) {
      const residuals = same.map((q) => Math.log10(q.mcap_usd!) - Math.log10(curveBase(curve, q.tvl_usd)));
      offset = (residuals.reduce((s, v) => s + v, 0) / residuals.length) * (same.length / (same.length + 5));
    }
    misses.push(missFactor(base * 10 ** offset, pool[i]!.mcap_usd!));
  }
  return round2(medianOf(misses));
}

/** The category-offset variant's repeated 5-fold score, by the same shrunk-residual rule. */
function categoryCv(pool: Protocol[]): number {
  return repeatedKFold(pool, (train) => {
    const curve = fitCurve(train);
    return (p: Protocol) => {
      const base = curveBase(curve, p.tvl_usd);
      const same = train.filter((q) => q.category === p.category);
      if (same.length === 0) return base;
      const residuals = same.map((q) => Math.log10(q.mcap_usd!) - Math.log10(curveBase(curve, q.tvl_usd)));
      const offset = (residuals.reduce((s, v) => s + v, 0) / residuals.length) * (same.length / (same.length + 5));
      return base * 10 ** offset;
    };
  }).mean_of_medians;
}

/**
 * The verdict sentence for a dropped variant, written from its own numbers against its
 * baseline: both tests worse, or a leave-one-out edge that the cross-validation does
 * not confirm — or, honestly, a variant that beats its baseline on both tests, which
 * the note flags instead of hiding. `baselineLabel` names the baseline in the sentence
 * ('the deployed model' or 'the pooled line').
 */
function dropNote(name: string, loo: number, cv: number, baseLoo: number, baseCv: number, baselineLabel: string): string {
  const f = (n: number): string => `x${n.toFixed(2)}`;
  if (loo < baseLoo && cv > baseCv) {
    return `${name} edges ${baselineLabel} on leave-one-out (${f(loo)} vs ${f(baseLoo)}) but misses worse on repeated 5-fold (${f(cv)} vs ${f(baseCv)}) — the leave-one-out edge is noise, so ${baselineLabel} stands.`;
  }
  if (loo <= baseLoo && cv <= baseCv) {
    return `${name} beats ${baselineLabel} on both tests (${f(loo)} / ${f(cv)}) — kept out only because ${baselineLabel} is the simpler claim; re-check before trusting this.`;
  }
  return `${name} misses worse than ${baselineLabel} on leave-one-out (${f(loo)} vs ${f(baseLoo)}) and on repeated 5-fold (${f(cv)} vs ${f(baseCv)}), so it stays out.`;
}

/**
 * The full validation record: every test priced through the deployed model, with the
 * curve-alone numbers beside it, then every richer variant's numbers against the
 * deployed model. The quadratic appears twice — once as a bare curve, once with the
 * multipliers — so the quadratic comparison is against the model that actually ships,
 * not a straw man.
 */
export function validateModel(pool: Protocol[], asOf: string, params: ModelParams): Validation {
  const fullPrice = (p: Protocol, train: Protocol[]): number => priceProtocol(p, asOf, fitCurve(train), params).implied;
  const curvePrice = (p: Protocol, train: Protocol[]): number => curveBase(fitCurve(train), p.tvl_usd);
  const fullFit = (train: Protocol[]) => {
    const curve = fitCurve(train);
    return (p: Protocol) => priceProtocol(p, asOf, curve, params).implied;
  };
  const curveFit = (train: Protocol[]) => {
    const curve = fitCurve(train);
    return (p: Protocol) => curveBase(curve, p.tvl_usd);
  };

  const loo = leaveOneOut(pool, fullPrice, 'leave-one-out (full model)');
  const looCurve = leaveOneOut(pool, curvePrice, 'leave-one-out (curve alone)');
  const blind2025 = blindSplit(pool, BLIND_CUT_2025, fullPrice, 'blind time-split 2025 (full model)');
  const blind2025Curve = blindSplit(pool, BLIND_CUT_2025, curvePrice, 'blind time-split 2025 (curve alone)');
  const blind2024 = blindSplit(pool, BLIND_CUT_2024, fullPrice, 'blind time-split 2024 (full model)');
  const blind2024Curve = blindSplit(pool, BLIND_CUT_2024, curvePrice, 'blind time-split 2024 (curve alone)');
  const cv = repeatedKFold(pool, fullFit);
  const cvCurve = repeatedKFold(pool, curveFit);
  const quadFit = variantPricer(asOf, 'quad');
  const cvQuad = repeatedKFold(pool, quadFit).mean_of_medians;

  const kinds: { kind: VariantKind; name: string; baseline: 'full' | 'curve' }[] = [
    { kind: 'growth', name: 'Fitted growth effect', baseline: 'full' },
    { kind: 'age', name: 'Fitted age effect', baseline: 'full' },
    { kind: 'chains', name: 'Fitted chains effect', baseline: 'full' },
    { kind: 'full', name: 'All three fitted together', baseline: 'full' },
    // The bare quadratic prices through its own curve only, so its baseline is the
    // pooled line — the curve family it would replace — not the deployed model.
    { kind: 'quad', name: 'Quadratic curve', baseline: 'curve' },
  ];
  const dropped: DroppedVariant[] = kinds.map(({ kind, name, baseline }) => {
    const fit = variantPricer(asOf, kind);
    const variantLoo = leaveOneOut(pool, (p, others) => fit(others)(p), `leave-one-out (${kind})`).median_miss_x;
    const variantCv = kind === 'quad' ? cvQuad : repeatedKFold(pool, fit).mean_of_medians;
    const baseLoo = baseline === 'curve' ? looCurve.median_miss_x : loo.median_miss_x;
    const baseCv = baseline === 'curve' ? cvCurve.mean_of_medians : cv.mean_of_medians;
    const label = baseline === 'curve' ? 'the pooled line' : 'the deployed model';
    return { name, loo_median_miss_x: variantLoo, cv_median_miss_x: variantCv, baseline, note: dropNote(name, variantLoo, variantCv, baseLoo, baseCv, label) };
  });
  // The quadratic with the multipliers: the comparison the bare quadratic cannot make.
  const quadFullFit = (train: Protocol[]) => {
    const quad = quadFit(train);
    return (p: Protocol) => withMultipliers(p, asOf, quad(p), params);
  };
  const quadFullLoo = leaveOneOut(pool, (p, others) => quadFullFit(others)(p), 'leave-one-out (quad x multipliers)').median_miss_x;
  const quadFullCv = repeatedKFold(pool, quadFullFit).mean_of_medians;
  dropped.push({
    name: 'Quadratic curve, with multipliers',
    loo_median_miss_x: quadFullLoo,
    cv_median_miss_x: quadFullCv,
    baseline: 'full',
    note: dropNote('Quadratic curve, with multipliers', quadFullLoo, quadFullCv, loo.median_miss_x, cv.mean_of_medians, 'the deployed model'),
  });
  const catLoo = categoryLoo(pool);
  const catCv = categoryCv(pool);
  dropped.push({
    name: 'Category offsets',
    loo_median_miss_x: catLoo,
    cv_median_miss_x: catCv,
    baseline: 'full',
    note: dropNote('Category offsets', catLoo, catCv, loo.median_miss_x, cv.mean_of_medians, 'the deployed model'),
  });
  return {
    loo,
    loo_curve: looCurve,
    blind2025,
    blind2025_curve: blind2025Curve,
    blind2024,
    blind2024_curve: blind2024Curve,
    cv_median_miss_x: cv.mean_of_medians,
    cv_pooled_median_miss_x: cv.pooled_median,
    cv_curve_median_miss_x: cvCurve.mean_of_medians,
    cv_curve_pooled_median_miss_x: cvCurve.pooled_median,
    cv_quad_median_miss_x: cvQuad,
    dropped,
  };
}

/* ------------------------------------------------------------------ */
/* The $1,000 farm economics around one implied value.                 */
/* ------------------------------------------------------------------ */

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
/** How long to hold a position before the farm is judged, in days, from the protocol's
 * age: a young protocol's launch is further out, so its window is longer. An unknown
 * age is treated as a year old — the same assumption the maturity multiplier makes —
 * so the hold and the pricing agree: a 365-day-old protocol and an unknown-age protocol
 * get the same hold and the same maturity. The windows live in PARAMS, set before any
 * test, not as magic numbers here. */
export function holdDaysFor(age: number | null, params: ModelParams): number {
  const a = age ?? params.unknown_age_days;
  if (a < 180) return params.economics.hold_days_young;
  if (a < 365) return params.economics.hold_days_mid;
  return params.economics.hold_days_old;
}

/**
 * The $1,000 farm economics of one implied value: the slice, the cost, the net, the net
 * per hands-on hour, and the verdict. The slice is the position's pro-rata share of the
 * 10% of the implied value the scenario pays to depositors: 10% x implied x
 * ($1,000 / TVL), priced at the snapshot's TVL — the protocol as it stands today. TVL
 * is deliberately NOT projected forward from the 7-day change: compounding a 7-day rate
 * over a 30–60 day hold would turn a noisy signal into an absurd one (a +100% week
 * becomes an ~85x TVL), and the implied value itself is a point-in-time estimate. The
 * direction of the error is stated in the dashboard: if TVL grows during the hold the
 * slice overstates (dilution); if it shrinks it understates (concentration). The cost
 * is setup gas, weekly gas over the hold, and the 4% T-bill yield the $1,000 forgoes
 * while it is locked in the position — the setup gas and minutes are the eight-step
 * plan's own setup steps added up, so the model and the plan describe the same farm.
 * The hours are hands-on time only — setup, one weekly action plus the weekly safety
 * check, the claim and the log — never the hold itself, because the hold is waiting,
 * not work. TVL is clamped to $1 here as in curveBase: a zero-TVL protocol would
 * otherwise divide by zero and price an infinite slice.
 */
export function farmMath(
  implied: number,
  p: Protocol,
  age: number | null,
  params: ModelParams,
): { slice: number; cost: number; net: number; perHour: number; hours: number; holdDays: number; verdict: Verdict } {
  const e = params.economics;
  const holdDays = holdDaysFor(age, params);
  const weeks = Math.ceil(holdDays / 7);
  const hours = round2(e.setup_minutes / 60 + (e.weekly_minutes / 60) * weeks + e.claim_minutes / 60);
  const cost = round2(e.setup_gas_usd + e.weekly_gas_usd * weeks + e.position_usd * e.tbill_annual_rate * (holdDays / 365));
  const slice = round2(e.airdrop_share * implied * (e.position_usd / Math.max(1, p.tvl_usd)));
  const net = round2(slice - cost);
  const perHour = round2(net / hours);
  const verdict = net >= e.farm_at_net_usd ? 'FARM' : net >= e.thin_at_net_usd ? 'THIN' : 'SKIP';
  return { slice, cost, net, perHour, hours, holdDays, verdict };
}

/* ------------------------------------------------------------------ */
/* Farm plans: eight steps per row, from the protocol's own record.    */
/* ------------------------------------------------------------------ */

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: Protocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

type Action = (name: string, chain: string) => string;

/** First qualifying actions by category, in the words a farmer can follow. The first
 * matching pattern wins; the fallback covers every category the table does not name. */
const FIRST_ACTIONS: [RegExp, Action][] = [
  [/lend|cdp|collateral/i, (n, c) => `Lend $1,000 of USDC on ${n} on ${c}, borrow a small amount against the deposit, and keep the loan's health factor comfortable.`],
  [/dex|leveraged farm/i, (n, c) => `Add $1,000 of liquidity to ${n}'s deepest pool on ${c} in a balanced pair and leave the position staked.`],
  [/yield aggregator/i, (n, c) => `Put $1,000 of USDC into ${n}'s auto-compounding vault on ${c} and leave the vault shares alone.`],
  [/yield/i, (n, c) => `Deposit $1,000 into ${n}'s largest yield vault on ${c} and hold the receipt token in the farm wallet.`],
  [/bridge|canonical/i, (n, c) => `Move $1,000 of USDC onto ${c} through ${n}, then use the bridged funds inside the destination app.`],
  [/restak|liquid staking|staking/i, (n, c) => `Stake $1,000 of the chain's staking asset through ${n} and hold the liquid receipt token it issues.`],
  [/perpetual|derivative/i, (n, c) => `Post $1,000 of USDC as margin on ${n} and open one small hedged position, then leave it untouched.`],
  [/prediction/i, (n, c) => `Fund the account with $1,000 and take one market position on ${n} on an outcome you have actually read up on.`],
  [/curator|allocator|capital/i, (n, c) => `Allocate $1,000 to a ${n} vault on ${c} and hold the vault shares for the whole season.`],
  [/stable/i, (n, c) => `Mint or deposit $1,000 of the stable asset through ${n} on ${c} and hold the balance in the farm wallet.`],
  [/rwa/i, (n, c) => `Mint $1,000 of the protocol's yield-bearing asset on ${c} and keep it in the same wallet for the hold.`],
  [/insurance/i, (n, c) => `Buy $1,000 of cover from ${n} on ${c} and keep the policy active through the hold.`],
  [/basis/i, (n, c) => `Deposit $1,000 into ${n}'s basis-trading vault on ${c} and hold it through at least one funding cycle.`],
  [/chain/i, (n, c) => `Bridge $1,000 of the chain's native asset onto ${n} and put it to work in one of its own apps.`],
  [/cedefi/i, (n, c) => `Deposit $1,000 into ${n}'s CeDeFi vault on ${c} and hold the shares.`],
];

/** Second qualifying actions: a different mechanism from the first, so the wallet's
 * activity spans two of the protocol's markets instead of one repeated motion. */
const SECOND_ACTIONS: [RegExp, Action][] = [
  [/lend|cdp|collateral/i, (n) => `Borrow $100 of USDC against the deposit on ${n} and repay it a week later, so the wallet shows both sides of the market.`],
  [/dex|leveraged farm/i, (n, c) => `Swap $100 through ${n}'s main pool on ${c} the other way, so the wallet shows trading as well as liquidity.`],
  [/yield/i, (n, c) => `Add a further $100 to a second ${n} vault on ${c} in a different asset, so the wallet's activity spans two vaults.`],
  [/bridge|canonical/i, (n) => `Bridge $100 back through ${n} in the opposite direction, so the wallet shows two-way use of the bridge.`],
  [/restak|liquid staking|staking/i, (n) => `Stake a further $100 of a second asset through ${n}, so the wallet holds two of its receipt tokens.`],
  [/perpetual|derivative/i, (n) => `Open a second small position on ${n} on a different market, so the wallet shows more than one market.`],
  [/prediction/i, (n) => `Take a second small position on ${n} on a different market, so the wallet shows more than one outcome.`],
  [/curator|allocator|capital/i, (n, c) => `Allocate a further $100 to a second ${n} vault on ${c}, so the wallet holds shares in two vaults.`],
  [/stable/i, (n, c) => `Mint a further $100 of the stable asset through ${n} on ${c} from a second collateral asset.`],
  [/rwa/i, (n, c) => `Mint a further $100 of a second yield-bearing asset of ${n} on ${c}.`],
  [/insurance/i, (n, c) => `Buy a second small cover from ${n} on ${c} for a different protocol.`],
  [/basis/i, (n, c) => `Deposit a further $100 into a second ${n} vault on ${c} and hold it through one funding cycle.`],
  [/chain/i, (n) => `Use the bridged asset in a second app on ${n}, so the wallet shows two of its apps.`],
  [/cedefi/i, (n, c) => `Deposit a further $100 into a second ${n} vault on ${c}.`],
];

const money = (n: number): string => n.toLocaleString('en-US');

/** The table's action for a category, or the fallback. */
function pickAction(table: [RegExp, Action][], category: string | null, fallback: Action): Action {
  const c = category ?? '';
  for (const [re, action] of table) if (re.test(c)) return action;
  return fallback;
}

/**
 * A protocol's farm plan: eight steps, each an action with a cost and a time. Derived
 * from the protocol's own record (category, chains, age) and its $1,000 farm economics,
 * never from a hand-written list of names. The last step states the verdict and the net,
 * so the plan itself says whether the farm is worth doing.
 */
export function farmPlan(
  p: Protocol,
  age: number | null,
  econ: { slice: number; cost: number; net: number; perHour: number; hours: number; holdDays: number; verdict: Verdict },
): FarmStep[] {
  const chain = chainOf(p);
  const hold = econ.holdDays;
  const weeks = Math.ceil(hold / 7);
  const first = pickAction(FIRST_ACTIONS, p.category, (n, c) => `Deposit $1,000 of USDC into ${n} on ${c} and keep the position open for the hold.`)(p.name, chain);
  const second = pickAction(SECOND_ACTIONS, p.category, (n, c) => `Deposit a further $100 into ${n} on ${c} from a second asset, so the wallet shows two deposits.`)(p.name, chain);
  const chainNote = p.chains.length > 1 ? ` It also runs on ${p.chains.slice(1, 3).join(' and ')}, but farm on ${chain} first.` : '';
  const verdictLine =
    econ.verdict === 'FARM'
      ? `Verdict: FARM — a $1,000 position nets about $${money(econ.net)} after costs, about $${money(econ.perHour)} per hands-on hour.`
      : econ.verdict === 'THIN'
        ? `Verdict: THIN — a $1,000 position nets only about $${money(econ.net)}, so farm small or wait for a bigger slice.`
        : `Verdict: SKIP — a $1,000 position nets about $${money(econ.net)}, below the cost of farming it.`;
  return [
    { text: `Use a fresh wallet that holds only the $1,000 you plan to farm, and keep its seed phrase offline.`, cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
    { text: `${first}${chainNote}`, cost: '$1,000 of capital and about $4 of gas', time: '15 minutes to set up' },
    { text: second, cost: 'about $4 of gas', time: '10 minutes' },
    { text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote on ${chain}.`, cost: 'about $2 of gas a week', time: '10 minutes a week' },
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: 'the $1,000 stays in the position', time: `${hold} days` },
    { text: `Check the position is still earning and the protocol has not been exploited: read ${p.name}'s own announcements before you add anything, and never pay anyone to claim for you.`, cost: 'nothing but the check', time: '5 minutes a week' },
    { text: `Before you withdraw, open ${p.name}'s own points or rewards page and claim only from the link it publishes. The slice this radar estimates for a $1,000 position is about $${money(econ.slice)}, against about $${money(econ.cost)} of farming cost over ${weeks} weeks — gas plus the 4% yield the $1,000 forgoes while it is locked in the position.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: `${verdictLine} Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`, cost: 'nothing but the log', time: '5 minutes' },
  ];
}

/* ------------------------------------------------------------------ */
/* The house rule: which pre-token protocols the board may rank.       */
/* ------------------------------------------------------------------ */

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** A name carrying a whole word wrapped, staked or staking is a product of a token that trades. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
/** Categories the house rule keeps off the launch list. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
/** An exchange's name at the start of a protocol's name: a product of that exchange. */
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** Whether a protocol records no token at all. */
export function isPreToken(p: Protocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token and not a wrapped, staked or
 * bridged product, not an exchange, not a versioned pool — the house rule, applied to
 * every row alike, watchlist included. */
export function isRankable(p: Protocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  if (EXCHANGE_PREFIXES.some((prefix) => p.name.startsWith(prefix))) return false;
  return true;
}

/** Why a pre-token protocol is set aside instead of ranked, or null when it is rankable. */
export function asideReason(p: Protocol): string | null {
  if (!isPreToken(p)) return null;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return `Excluded category: ${p.category}`;
  if (WRAPPED_WORD.test(p.name)) return 'Wrapped or staked product of a token that trades';
  if (VERSIONED.test(p.name)) return 'Versioned pool of another protocol';
  if (EXCHANGE_PREFIXES.some((prefix) => p.name.startsWith(prefix))) return 'Exchange product';
  return null;
}

/* ------------------------------------------------------------------ */
/* Building the board, the audit lists, and the dashboard dataset.     */
/* ------------------------------------------------------------------ */

const byTvlDesc = (a: Protocol, b: Protocol): number => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);

/**
 * The ranked board: the whole watchlist plus every other rankable pre-token protocol.
 * The watchlist passes through isRankable() exactly like every other row. That check
 * costs nothing on any snapshot the house rule built: the watchlist is DEFINED by the
 * same properties isRankable() tests (pre-token, no version marker, no wrapped/staked
 * word, no excluded category, no exchange prefix — the snapshot's own field guide), so
 * a watchlist entry can only fail it if the snapshot contradicts its own rule. In that
 * case the honest outcome is a refusal, not a silent ranking of an excluded protocol
 * and not a silent drop: the entry would fall to the set-aside or trading lists, and
 * boardProblem would refuse the board for missing coverage. Refusing loudly is the
 * correct behaviour for a self-contradictory snapshot; fabricating a board is not.
 */
export function buildBoard(snapshot: Snapshot, curve: Curve, params: ModelParams = PARAMS): BoardRow[] {
  const index = new Map(snapshot.protocols.map((p) => [p.slug, p]));
  const chosen = new Map<string, Protocol>();
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined && isRankable(p)) chosen.set(slug, p);
  }
  for (const p of snapshot.protocols.filter((q) => !chosen.has(q.slug) && isRankable(q)).sort(byTvlDesc)) {
    chosen.set(p.slug, p);
  }
  const scored = [...chosen.values()].map((p) => {
    const v = priceProtocol(p, snapshot.as_of, curve, params);
    const econ = farmMath(v.implied, p, v.age, params);
    return { p, ...v, econ };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    band_low_usd: 0, // filled in by buildAll, once the full-model backtest's median miss is known
    band_high_usd: 0,
    model: {
      base_value_usd: s.base,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      chain_multiplier: round4(s.chainMult),
      age_days: s.age,
    },
    farm: {
      slice_usd: s.econ.slice,
      farm_cost_usd: s.econ.cost,
      net_per_1000_usd: s.econ.net,
      net_per_hour_usd: s.econ.perHour,
      hands_on_hours: s.econ.hours,
      hold_days: s.econ.holdDays,
      verdict: s.econ.verdict,
    },
    farm_steps: farmPlan(s.p, s.age, s.econ).map(stepText),
  }));
}

/** The protocols the house rule sets aside, with the reason each, largest TVL first. */
export function buildAside(snapshot: Snapshot): AsideRow[] {
  return snapshot.protocols
    .filter((p) => isPreToken(p) && asideReason(p) !== null)
    .sort(byTvlDesc)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      change_7d: p.change_7d,
      listed_at: p.listed_at,
      age_days: ageDays(snapshot.as_of, p.listed_at),
      reason: asideReason(p)!,
    }));
}

/** Every protocol whose token already trades, by market cap. */
export function buildTraded(snapshot: Snapshot): TradedRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p))
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js. */
function dashRow(row: BoardRow, watchlist: boolean): DashRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    band_low_usd: row.band_low_usd,
    band_high_usd: row.band_high_usd,
    watchlist,
    base_value_usd: row.model.base_value_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
    slice_usd: row.farm.slice_usd,
    farm_cost_usd: row.farm.farm_cost_usd,
    net_per_1000_usd: row.farm.net_per_1000_usd,
    net_per_hour_usd: row.farm.net_per_hour_usd,
    hands_on_hours: row.farm.hands_on_hours,
    hold_days: row.farm.hold_days,
    verdict: row.farm.verdict,
    farm_steps: row.farm_steps,
  };
}

/** Everything the program writes, from the snapshot: the fit, its tests, the board, the audit. */
export function buildAll(snapshot: Snapshot, params: ModelParams = PARAMS): { board: BoardRow[]; dash: DashData } {
  const pool = comparablesOf(snapshot);
  const curve = fitCurve(pool);
  const validation = validateModel(pool, snapshot.as_of, params);
  // The value band belongs to the deployed model: the FULL-model leave-one-out median
  // miss, not the curve-alone one.
  const band = validation.loo.median_miss_x;
  const board = buildBoard(snapshot, curve, params);
  for (const row of board) {
    row.band_low_usd = Math.max(1, Math.round(row.implied_value_usd / band));
    row.band_high_usd = Math.round(row.implied_value_usd * band);
  }
  const traded = buildTraded(snapshot);
  const aside = buildAside(snapshot);
  if (board.length + aside.length + traded.length !== snapshot.protocols.length) {
    throw new SnapshotError(
      `snapshot not fully accounted: ${board.length} ranked + ${aside.length} set aside + ${traded.length} trading != ${snapshot.protocols.length}`,
    );
  }
  const byHour = [...board].sort((a, b) => b.farm.net_per_hour_usd - a.farm.net_per_hour_usd);
  const best = byHour[0]!;
  const bestWatch = byHour.find((r) => snapshot.watchlist.includes(r.slug)) ?? best;
  const counts: { FARM: number; THIN: number; SKIP: number } = { FARM: 0, THIN: 0, SKIP: 0 };
  for (const row of board) counts[row.farm.verdict]++;
  const dash: DashData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model: params,
    model_version: MODEL_VERSION,
    curve,
    validation,
    band_median_miss_x: band,
    watchlist_size: snapshot.watchlist.length,
    snapshot_size: snapshot.protocols.length,
    board_size: board.length,
    early_size: board.filter((r) => !snapshot.watchlist.includes(r.slug)).length,
    traded_size: traded.length,
    aside_size: aside.length,
    verdict_counts: counts,
    best_per_hour: { slug: best.slug, name: best.name, net_per_hour_usd: best.farm.net_per_hour_usd },
    best_per_hour_watchlist: { slug: bestWatch.slug, name: bestWatch.name, net_per_hour_usd: bestWatch.farm.net_per_hour_usd },
    rows: board.map((r) => dashRow(r, snapshot.watchlist.includes(r.slug))),
    traded,
    aside,
    comps: pool.map((p) => [Math.log10(p.tvl_usd), Math.log10(p.mcap_usd!)] as [number, number]),
  };
  return { board, dash };
}

/* ------------------------------------------------------------------ */
/* Input, output, and the gate's own shape check.                      */
/* ------------------------------------------------------------------ */

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return { as_of: o.as_of, source: o.source, floor_usd: o.floor_usd, protocols, watchlist: o.watchlist as string[] };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardProblem(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    if (r.farm_steps.length < 3 || r.farm_steps.length > 12) return `${r.slug} has ${r.farm_steps.length} farm steps`;
    for (const s of r.farm_steps) if (s.trim().length < 20 || s.trim().length > 600) return `${r.slug} has a farm step of ${s.trim().length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(dash: DashData): string {
  return `window.RADAR=${JSON.stringify(dash)};\n`;
}
