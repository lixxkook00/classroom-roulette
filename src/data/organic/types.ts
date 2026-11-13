// Types for the "Lab hữu cơ" tab. A lesson is plain data: add a file in ./lessons and list it in ./index.ts.

/** Text in both languages. In prose, digits right after an element symbol become subscripts (CO2 → CO₂). */
export interface Txt {
  vi: string
  en: string
}

/* ---------- Molecules ---------- */
export type AtomKind = 'C' | 'H' | 'O' | 'N' | 'Cl'

export interface Atom {
  id: string
  kind: AtomKind
  /** Position in the 2-D structural formula (640 × 400 box). */
  x: number
  y: number
  /** 3-D position in Å for the ball-and-stick model (falls back to the 2-D layout when missing). */
  p?: [number, number, number]
  /** Extra line shown when the atom is tapped (e.g. "this H is the one Na replaces"). */
  note?: Txt
}

/** [from, to, order]: order 2 = double bond, 3 = triple. */
export type Bond = [string, string, (1 | 2 | 3)?]

/** A functional group to circle, e.g. –OH or –COOH. */
export interface Group {
  atoms: string[]
  label: Txt
  note: Txt
  /** Ellipse around the group, in the 640 × 400 viewBox. */
  ring: { cx: number; cy: number; rx: number; ry: number; rotate?: number }
  /** Where the label goes. */
  labelAt: { x: number; y: number }
}

export interface Molecule {
  id: string
  name: Txt
  /** Molecular formula, e.g. "C2H6O". */
  formula: string
  /** Condensed structural formula, e.g. "CH3–CH2–OH". */
  condensed: string
  /** Elements present, e.g. "C, H, O". */
  elements: string
  atoms: Atom[]
  bonds: Bond[]
  group?: Group
}

/* ---------- Reactions & experiments ---------- */
export type Phase = 'idle' | 'running' | 'done'

/**
 * What the experiment looks like. One test-tube scene covers most school experiments:
 * drop in a solid, add drops, heat, dip indicator paper, watch bubbles and colour changes.
 */
export type Scene =
  | { kind: 'burn'; vessel: 'lamp' | 'dish'; fuel: string; products: string[] }
  | { kind: 'ferment'; sugar: string; gas: string }
  | {
      kind: 'tube'
      /** Liquid in the tube: label ("\n" for a second line) and colour before / after. */
      liquid: { label: string; color: string; after?: string }
      /** Solid dropped in: pellet (Na), ribbon (Mg), powder (CuO), chunk (CaCO3). */
      solid?: { label: string; shape: 'pellet' | 'ribbon' | 'powder' | 'chunk'; color: string; dissolves?: boolean }
      /** Liquid dripped in from a dropper. */
      drops?: { label: string; color: string }
      /** Indicator paper dipped in: colour before and after. */
      paper?: { label: string; from: string; to: string }
      bubbles?: boolean
      heat?: boolean
      /** After the reaction, a burning splint makes the gas "pop" (hydrogen). */
      splint?: boolean
    }

export interface Reaction {
  id: string
  title: Txt
  /** Species separated by " + ", leading digits are coefficients. Empty `right` = no equation (e.g. litmus). */
  left: string
  right: string
  cond?: Txt
  scene: Scene
  /** Button that starts the experiment. */
  start: Txt
  /** Question to ask the class before the products are revealed. */
  hint: Txt
  observe: Txt
  meaning: Txt
  /** A second equation shown with the answer (e.g. the industrial method). */
  extra?: { left: string; right: string; cond?: Txt; note: Txt }
}

/* ---------- "Which ones react?" ---------- */
export interface ReactItem {
  /** Formula or symbol shown on the card, e.g. "CH3–OH", "Zn". */
  label: string
  name?: Txt
  reacts: boolean
  /** Equation when it reacts. */
  left?: string
  right?: string
  why?: Txt
}

export interface WhoReacts {
  question: Txt
  items: ReactItem[]
}

/* ---------- Practice ---------- */
/** `period` = which tiết (1, 2, 3…) the question belongs to, so the teacher can practise just that period. */
export type QuizItem =
  | { kind: 'tf'; period?: number; text: Txt; answer: boolean; why: Txt }
  | { kind: 'mcq'; period?: number; text: Txt; options: Txt[]; answer: number; why: Txt }

/* ---------- Alcohol-degree mixer ---------- */
export interface Mixer {
  kind: 'alcohol-degree'
  definition: Txt
  marks: { degree: number; label: Txt }[]
}

/* ---------- Lesson ---------- */
export interface Fact {
  label: Txt
  value: Txt
}

export interface Lesson {
  /** Used in the link: #/lab?bai=26 */
  id: string
  /** "Bài 26" */
  number: Txt
  title: Txt
  sub: Txt
  /** Formula in the title badge, e.g. "C2H5OH". */
  badge: string
  /** The star molecule of the lesson (id from molecules.ts). */
  molecule: string
  /** Molecules for the comparison worksheet, in column order; the lesson's molecule is the one to fill in. */
  compare?: string[]
  facts: Fact[]
  /** What each tiết covers, e.g. ["Công thức, tính chất vật lí", "Tính chất hoá học"]. */
  periods?: Txt[]
  /** Optional interactive extras. */
  mixer?: Mixer
  reactions: Reaction[]
  whoReacts?: WhoReacts[]
  quiz: QuizItem[]
}
