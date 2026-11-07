import { ELEMENTS, type Element } from './elements'
import { NAME_VI_EXTRA } from './facts.vi'

/* ------------------------------------------------------------------ */
/* Electron configuration                                              */
/* ------------------------------------------------------------------ */

export interface Subshell {
  n: number
  l: 's' | 'p' | 'd' | 'f'
  e: number
}

export interface ElectronConfig {
  /** Noble-gas core, e.g. "Ar", or null for H and He. */
  core: string | null
  /** Subshells outside the core, written shell by shell (the way Vietnamese textbooks do). */
  parts: Subshell[]
  /** Superheavy elements (Z ≥ 104): predicted, not measured. */
  predicted: boolean
}

const CAP = { s: 2, p: 6, d: 10, f: 14 } as const
const L_ORDER = { s: 0, p: 1, d: 2, f: 3 } as const
// Madelung (n + l) filling order.
const FILL: [number, Subshell['l']][] = [
  [1, 's'], [2, 's'], [2, 'p'], [3, 's'], [3, 'p'], [4, 's'], [3, 'd'], [4, 'p'], [5, 's'], [4, 'd'],
  [5, 'p'], [6, 's'], [4, 'f'], [5, 'd'], [6, 'p'], [7, 's'], [5, 'f'], [6, 'd'], [7, 'p'],
]

// Measured ground states that break the simple filling rule (valence part only).
const EXCEPTIONS: Record<number, string> = {
  24: '3d5 4s1', // Cr
  29: '3d10 4s1', // Cu
  41: '4d4 5s1', // Nb
  42: '4d5 5s1', // Mo
  44: '4d7 5s1', // Ru
  45: '4d8 5s1', // Rh
  46: '4d10', // Pd
  47: '4d10 5s1', // Ag
  57: '5d1 6s2', // La
  58: '4f1 5d1 6s2', // Ce
  64: '4f7 5d1 6s2', // Gd
  78: '4f14 5d9 6s1', // Pt
  79: '4f14 5d10 6s1', // Au
  89: '6d1 7s2', // Ac
  90: '6d2 7s2', // Th
  91: '5f2 6d1 7s2', // Pa
  92: '5f3 6d1 7s2', // U
  93: '5f4 6d1 7s2', // Np
  96: '5f7 6d1 7s2', // Cm
  103: '5f14 7s2 7p1', // Lr
}

const NOBLE: [number, string][] = [
  [86, 'Rn'],
  [54, 'Xe'],
  [36, 'Kr'],
  [18, 'Ar'],
  [10, 'Ne'],
  [2, 'He'],
]

const parseParts = (s: string): Subshell[] =>
  s.split(' ').map((p) => {
    const m = /^(\d)([spdf])(\d+)$/.exec(p)!
    return { n: Number(m[1]), l: m[2] as Subshell['l'], e: Number(m[3]) }
  })

function fill(z: number): Subshell[] {
  const out: Subshell[] = []
  let left = z
  for (const [n, l] of FILL) {
    if (left <= 0) break
    const e = Math.min(CAP[l], left)
    out.push({ n, l, e })
    left -= e
  }
  return out
}

const byShell = (a: Subshell, b: Subshell) => a.n - b.n || L_ORDER[a.l] - L_ORDER[b.l]

export function electronConfig(z: number): ElectronConfig {
  const core = NOBLE.find(([nz]) => nz < z)
  const coreZ = core?.[0] ?? 0
  let parts: Subshell[]
  if (EXCEPTIONS[z]) {
    parts = parseParts(EXCEPTIONS[z])
  } else {
    const coreSet = new Set(fill(coreZ).map((s) => `${s.n}${s.l}`))
    const all = fill(z)
    // Keep the core's subshells only where they hold more electrons now (never happens for full cores).
    parts = all.filter((s) => !coreSet.has(`${s.n}${s.l}`) || s.e !== fill(coreZ).find((c) => c.n === s.n && c.l === s.l)?.e)
  }
  return { core: core ? core[1] : null, parts: [...parts].sort(byShell), predicted: z >= 104 }
}

/** Plain text, e.g. "[Ar] 3d6 4s2" (digits after the letter are the superscripts). */
export const configText = (c: ElectronConfig) => [c.core ? `[${c.core}]` : '', ...c.parts.map((p) => `${p.n}${p.l}${p.e}`)].filter(Boolean).join(' ')

/* ------------------------------------------------------------------ */
/* State at room temperature (25 °C)                                   */
/* ------------------------------------------------------------------ */

export type MatterState = 'gas' | 'liquid' | 'solid' | 'unknown'
const GASES = new Set([1, 2, 7, 8, 9, 10, 17, 18, 36, 54, 86])
const LIQUIDS = new Set([35, 80])

export function matterState(z: number): MatterState {
  if (GASES.has(z)) return 'gas'
  if (LIQUIDS.has(z)) return 'liquid'
  return z <= 100 ? 'solid' : 'unknown'
}

/* ------------------------------------------------------------------ */
/* Well-known equations (all balanced — checked by scripts/check-chem.ts) */
/* ------------------------------------------------------------------ */

/** Reaction condition written above the arrow. */
export type Cond = 'heat' | 'cat' | 'light' | 'spark' | 'concHeat' | 'electro'

export interface Equation {
  /** Species separated by " + ", sides by " → " or " ⇌ ". Leading digits are coefficients. */
  eq: string
  cond?: Cond
}

export const EQUATIONS: Record<string, Equation[]> = {
  H: [{ eq: '2H2 + O2 → 2H2O', cond: 'heat' }, { eq: 'H2 + Cl2 → 2HCl', cond: 'light' }, { eq: 'N2 + 3H2 ⇌ 2NH3', cond: 'cat' }],
  Li: [{ eq: '2Li + 2H2O → 2LiOH + H2' }, { eq: '4Li + O2 → 2Li2O', cond: 'heat' }],
  Be: [{ eq: '2Be + O2 → 2BeO', cond: 'heat' }],
  B: [{ eq: '4B + 3O2 → 2B2O3', cond: 'heat' }],
  C: [{ eq: 'C + O2 → CO2', cond: 'heat' }, { eq: 'CH4 + 2O2 → CO2 + 2H2O', cond: 'heat' }, { eq: 'CaCO3 + 2HCl → CaCl2 + CO2 + H2O' }],
  N: [{ eq: 'N2 + 3H2 ⇌ 2NH3', cond: 'cat' }, { eq: 'N2 + O2 → 2NO', cond: 'spark' }, { eq: 'NH3 + HCl → NH4Cl' }],
  O: [{ eq: '2KClO3 → 2KCl + 3O2', cond: 'cat' }, { eq: '2H2O2 → 2H2O + O2', cond: 'cat' }, { eq: '3Fe + 2O2 → Fe3O4', cond: 'heat' }],
  F: [{ eq: 'H2 + F2 → 2HF' }, { eq: '2F2 + 2H2O → 4HF + O2' }],
  Na: [{ eq: '2Na + 2H2O → 2NaOH + H2' }, { eq: '2Na + Cl2 → 2NaCl', cond: 'heat' }, { eq: 'NaOH + HCl → NaCl + H2O' }],
  Mg: [{ eq: '2Mg + O2 → 2MgO', cond: 'heat' }, { eq: 'Mg + 2HCl → MgCl2 + H2' }],
  Al: [{ eq: '4Al + 3O2 → 2Al2O3', cond: 'heat' }, { eq: '2Al + 6HCl → 2AlCl3 + 3H2' }, { eq: '2Al + Fe2O3 → Al2O3 + 2Fe', cond: 'heat' }],
  Si: [{ eq: 'Si + O2 → SiO2', cond: 'heat' }, { eq: 'SiO2 + 2C → Si + 2CO', cond: 'heat' }],
  P: [{ eq: '4P + 5O2 → 2P2O5', cond: 'heat' }, { eq: 'P2O5 + 3H2O → 2H3PO4' }],
  S: [{ eq: 'S + O2 → SO2', cond: 'heat' }, { eq: '2SO2 + O2 ⇌ 2SO3', cond: 'cat' }, { eq: 'Fe + S → FeS', cond: 'heat' }],
  Cl: [{ eq: 'H2 + Cl2 → 2HCl', cond: 'light' }, { eq: 'Cl2 + 2NaOH → NaCl + NaClO + H2O' }, { eq: '2Fe + 3Cl2 → 2FeCl3', cond: 'heat' }],
  K: [{ eq: '2K + 2H2O → 2KOH + H2' }, { eq: '2KClO3 → 2KCl + 3O2', cond: 'cat' }],
  Ca: [{ eq: 'Ca + 2H2O → Ca(OH)2 + H2' }, { eq: 'CaCO3 → CaO + CO2', cond: 'heat' }, { eq: 'CaO + H2O → Ca(OH)2' }],
  Ti: [{ eq: 'TiCl4 + 2Mg → Ti + 2MgCl2', cond: 'heat' }],
  Cr: [{ eq: '4Cr + 3O2 → 2Cr2O3', cond: 'heat' }],
  Mn: [{ eq: 'MnO2 + 4HCl → MnCl2 + Cl2 + 2H2O', cond: 'heat' }, { eq: '2KMnO4 → K2MnO4 + MnO2 + O2', cond: 'heat' }],
  Fe: [
    { eq: 'Fe + 2HCl → FeCl2 + H2' },
    { eq: 'Fe + CuSO4 → FeSO4 + Cu' },
    { eq: 'Fe2O3 + 3CO → 2Fe + 3CO2', cond: 'heat' },
  ],
  Ni: [{ eq: 'Ni + 2HCl → NiCl2 + H2' }],
  Cu: [{ eq: '2Cu + O2 → 2CuO', cond: 'heat' }, { eq: 'Cu + 2AgNO3 → Cu(NO3)2 + 2Ag' }, { eq: 'Cu + 2H2SO4 → CuSO4 + SO2 + 2H2O', cond: 'concHeat' }],
  Zn: [{ eq: 'Zn + 2HCl → ZnCl2 + H2' }, { eq: 'Zn + CuSO4 → ZnSO4 + Cu' }],
  Br: [{ eq: 'H2 + Br2 → 2HBr', cond: 'heat' }, { eq: 'Cl2 + 2NaBr → 2NaCl + Br2' }],
  Ag: [{ eq: 'AgNO3 + NaCl → AgCl + NaNO3' }, { eq: '2AgCl → 2Ag + Cl2', cond: 'light' }],
  Sn: [{ eq: 'Sn + 2HCl → SnCl2 + H2' }],
  I: [{ eq: 'H2 + I2 ⇌ 2HI', cond: 'heat' }, { eq: 'Cl2 + 2KI → 2KCl + I2' }],
  Ba: [{ eq: 'BaCl2 + H2SO4 → BaSO4 + 2HCl' }],
  Hg: [{ eq: '2HgO → 2Hg + O2', cond: 'heat' }],
  Pb: [{ eq: 'Pb(NO3)2 + 2KI → PbI2 + 2KNO3' }],
}

export const equationsFor = (el: Element) => EQUATIONS[el.symbol] ?? []

/* ------------------------------------------------------------------ */
/* Guessing: accepted answers                                          */
/* ------------------------------------------------------------------ */

export const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '')

// Older Vietnamese / alternative spellings a student might type.
const EXTRA_ALIASES: Record<string, string[]> = {
  H: ['hidro', 'hydro'], He: ['heli'], Li: ['liti'], Be: ['beri'], B: ['bo'], C: ['cacbon', 'carbon'], N: ['nito', 'nitrogen'],
  O: ['oxi', 'oxy'], F: ['flo'], Na: ['natri'], Mg: ['magie', 'magne'], Al: ['nhom', 'aluminum'], Si: ['silic'], P: ['photpho', 'phospho'],
  S: ['luuhuynh', 'sulphur'], Cl: ['clo'], Ar: ['agon'], K: ['kali'], Ca: ['canxi'], Ti: ['titan'], V: ['vanadi'], Cr: ['crom'],
  Mn: ['mangan'], Fe: ['sat'], Co: ['coban'], Ni: ['niken'], Cu: ['dong'], Zn: ['kem'], Ga: ['gali'], Ge: ['gemani'], As: ['asen'],
  Se: ['selen'], Br: ['brom'], Kr: ['kripton'], Rb: ['rubidi'], Sr: ['stronti'], Ag: ['bac'], Sn: ['thiec'], I: ['iot', 'iod'],
  Cs: ['xesi', 'cesium'], Ba: ['bari'], W: ['vonfram', 'wolfram'], Pt: ['platin', 'bachkim'], Au: ['vang'], Hg: ['thuyngan'],
  Pb: ['chi'], U: ['urani'], Ra: ['radi'], Rn: ['radon'],
}

const ALIASES = new Map<string, number>()
for (const el of ELEMENTS) {
  for (const a of [el.name, el.symbol, NAME_VI_EXTRA[el.symbol] ?? '', ...(EXTRA_ALIASES[el.symbol] ?? [])]) {
    const k = fold(a)
    if (k && !ALIASES.has(k)) ALIASES.set(k, el.z)
  }
}

/** Which element a typed guess means (symbol, English, Vietnamese or atomic number), or null. */
export function resolveGuess(text: string): number | null {
  const t = text.trim()
  if (/^\d{1,3}$/.test(t)) {
    const z = Number(t)
    return z >= 1 && z <= ELEMENTS.length ? z : null
  }
  // Symbols are matched case-insensitively ("fe", "FE"), names without accents ("sat" = "sắt").
  const sym = ELEMENTS.find((e) => e.symbol.toLowerCase() === t.toLowerCase())
  if (sym) return sym.z
  return ALIASES.get(fold(t)) ?? null
}

/** Hides the element's own name/symbol in a fun fact so it can be used as a hint. */
export function maskFact(fact: string, el: Element): string {
  const words = [el.name, NAME_VI_EXTRA[el.symbol] ?? '', ...(EXTRA_ALIASES[el.symbol] ?? [])].filter((w) => w.length > 2)
  let out = fact
  // Whole words only, so a short alias like "chi" doesn't eat part of "chiếm".
  for (const w of words) {
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(`(?<![\\p{L}])${esc}(?![\\p{L}])`, 'giu'), '▢▢▢')
  }
  // The symbol as a standalone word (but not the C in "°C").
  out = out.replace(new RegExp(`(?<![°\\p{L}])${el.symbol}(?![\\p{L}])`, 'gu'), '▢▢')
  return out
}

/* ------------------------------------------------------------------ */
/* Atom structure for the Bohr model                                   */
/* ------------------------------------------------------------------ */

const CORE_SHELLS: Record<string, number[]> = {
  He: [2],
  Ne: [2, 8],
  Ar: [2, 8, 8],
  Kr: [2, 8, 18, 8],
  Xe: [2, 8, 18, 18, 8],
  Rn: [2, 8, 18, 32, 18, 8],
}

/** Electrons per shell (K, L, M, …), e.g. Fe → [2, 8, 14, 2]. */
export function shellCounts(z: number): number[] {
  const c = electronConfig(z)
  const shells = [...(c.core ? CORE_SHELLS[c.core] : [])]
  for (const p of c.parts) {
    while (shells.length < p.n) shells.push(0)
    shells[p.n - 1] += p.e
  }
  return shells
}

/** Neutrons in the most common (or most stable) isotope: mass number − Z. */
export function neutronCount(el: Element): number {
  const a = Math.round(parseFloat(el.mass.replace(/[[\]]/g, '')))
  return Math.max(0, a - el.z)
}
