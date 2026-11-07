import { shellCounts } from '../data/chem'

interface Props {
  z: number
  symbol: string
  size?: number
}

/**
 * Animated Bohr model: nucleus in the middle, electrons spread evenly on each shell,
 * outer shells turn more slowly (and alternate direction) so the atom looks alive.
 */
export function BohrAtom({ z, symbol, size = 260 }: Props) {
  const shells = shellCounts(z)
  const c = size / 2
  const nucleus = size * 0.11
  const step = (c - nucleus - 10) / shells.length
  const dot = Math.max(2.2, Math.min(5.5, step * 0.32))

  return (
    <svg className="bohr" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${symbol}: ${shells.join(', ')}`}>
      <defs>
        <radialGradient id="bohr-nuc" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fff6c9" />
          <stop offset="55%" stopColor="var(--c, #f6e27a)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
        </radialGradient>
        <radialGradient id="bohr-glow">
          <stop offset="0%" stopColor="var(--c, #f6e27a)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--c, #f6e27a)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={c} cy={c} r={c} fill="url(#bohr-glow)" />
      {shells.map((n, i) => {
        const r = nucleus + step * (i + 1)
        const dur = 6 + i * 3.5
        return (
          <g key={i}>
            <circle cx={c} cy={c} r={r} className="bohr__orbit" />
            <g className="bohr__shell" style={{ animationDuration: `${dur}s`, animationDirection: i % 2 ? 'reverse' : 'normal', transformOrigin: `${c}px ${c}px` }}>
              {Array.from({ length: n }, (_, k) => {
                const a = (k / n) * Math.PI * 2 + i * 0.4
                return <circle key={k} cx={c + r * Math.cos(a)} cy={c + r * Math.sin(a)} r={dot} className="bohr__e" />
              })}
            </g>
          </g>
        )
      })}
      <circle cx={c} cy={c} r={nucleus} fill="url(#bohr-nuc)" className="bohr__nucleus" />
      <text x={c} y={c} className="bohr__sym" fontSize={nucleus * 0.95} textAnchor="middle" dominantBaseline="central">
        {symbol}
      </text>
    </svg>
  )
}
