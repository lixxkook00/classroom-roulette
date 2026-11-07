// Sanity checks for the chemistry data: electron counts, balanced equations, guess matching.
// Run with: npx tsx scripts/check-chem.ts
import { electronConfig, configText, EQUATIONS, resolveGuess, maskFact, matterState } from '../src/data/chem.ts'
import { ELEMENTS } from '../src/data/elements.ts'
import { FACTS_VI } from '../src/data/facts.vi.ts'
// 1) every configuration holds exactly Z electrons
const nobleZ: Record<string, number> = { He: 2, Ne: 10, Ar: 18, Kr: 36, Xe: 54, Rn: 86 }
let bad = 0
for (const el of ELEMENTS) {
  const c = electronConfig(el.z)
  const total = (c.core ? nobleZ[c.core] : 0) + c.parts.reduce((a, p) => a + p.e, 0)
  if (total !== el.z) { bad++; console.log('BAD e-count', el.symbol, configText(c), total) }
}
for (const z of [1,2,6,8,11,17,18,19,20,24,26,29,30,35,47,53,56,57,64,79,80,82,92,103,118]) console.log(ELEMENTS[z-1].symbol.padEnd(3), configText(electronConfig(z)))
// 2) equations balance
function count(formula: string): Record<string, number> {
  const m = /^(\d*)(.*)$/.exec(formula)!; const coef = m[1] ? +m[1] : 1; let f = m[2]
  const out: Record<string, number> = {}
  const parse = (s: string, mult: number) => {
    const re = /([A-Z][a-z]?)(\d*)|\(([^()]+)\)(\d*)/g; let r
    while ((r = re.exec(s))) {
      if (r[1]) out[r[1]] = (out[r[1]] ?? 0) + (r[2] ? +r[2] : 1) * mult
      else parse(r[3], mult * (r[4] ? +r[4] : 1))
    }
  }
  parse(f, coef); return out
}
const sum = (side: string) => side.split(' + ').map(count).reduce((a, b) => { for (const k in b) a[k] = (a[k] ?? 0) + b[k]; return a }, {} as Record<string, number>)
for (const [sym, eqs] of Object.entries(EQUATIONS)) for (const { eq } of eqs) {
  const [l, r] = eq.split(/ → | ⇌ /); const L = sum(l), R = sum(r)
  const keys = new Set([...Object.keys(L), ...Object.keys(R)])
  for (const k of keys) if (L[k] !== R[k]) { bad++; console.log('UNBALANCED', sym, eq, k, L[k], R[k]) }
  if (!eq.includes(sym)) console.log('note: eq for', sym, 'does not mention it:', eq)
}
// 3) guesses
for (const g of ['Fe','fe','sắt','sat','Iron','iron','26','natri','Sodium','luu huynh','Lưu huỳnh','oxi','Oxygen','xyz','0','119','cesium','I','iot']) console.log('guess', JSON.stringify(g), '→', resolveGuess(g))
// 4) masking
for (const z of [6, 11, 26, 13, 16, 82, 79, 31]) { const el = ELEMENTS[z-1]; console.log(el.symbol, '|', maskFact(el.fact, el), '|', maskFact(FACTS_VI[z-1], el)) }
console.log(matterState(35), matterState(1), matterState(26), matterState(110))
console.log(bad ? `FAILED ${bad}` : 'ALL OK')

// 5) shells add up, IPA covers every element
import { shellCounts, neutronCount } from '../src/data/chem.ts'
import { ipa, ipaCount } from '../src/data/pronunciation.ts'
let bad2 = 0
for (const el of ELEMENTS) {
  const s = shellCounts(el.z)
  if (s.reduce((a, b) => a + b, 0) !== el.z) { bad2++; console.log('BAD shells', el.symbol, s) }
  if (!ipa(el.symbol, 'uk') || !ipa(el.symbol, 'us')) { bad2++; console.log('MISSING IPA', el.symbol) }
}
console.log('Fe shells', shellCounts(26), 'n', neutronCount(ELEMENTS[25]), '| Au', shellCounts(79), '| Og', shellCounts(118), '| IPA entries', ipaCount)
console.log(bad2 ? `FAILED ${bad2}` : 'SHELLS + IPA OK')
