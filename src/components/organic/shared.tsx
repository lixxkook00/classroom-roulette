import { Fragment } from 'react'
import { formatFormulas } from '../../chemFormat'
import { Species } from '../chemText'

/** Prose with formulas: "khí CO2" → "khí CO₂" (uses the app's formula formatter, so "E5", "40°" stay as they are). */
export function Chem({ text }: { text: string }) {
  return <>{formatFormulas(text)}</>
}

/** One side of an equation: "2CO2 + 3H2O" with coefficients and subscripts. */
export function Side({ text }: { text: string }) {
  return (
    <>
      {text.split(' + ').map((sp, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="eq__plus">+</span>}
          <Species text={sp} />
        </Fragment>
      ))}
    </>
  )
}

export function Arrow({ cond }: { cond?: string }) {
  return (
    <span className="eq__arrow">
      {cond && <span className="eq__cond">{cond}</span>}
      <span>⟶</span>
    </span>
  )
}

export function Equation({ left, right, cond }: { left: string; right: string; cond?: string }) {
  return (
    <span className="eq">
      <Side text={left} />
      <Arrow cond={cond} />
      <Side text={right} />
    </span>
  )
}
