import { useState } from 'react'
import { Card } from 'react-bootstrap'
import { useLargura } from '../hooks/useLargura'

const COR_METALICA = 'var(--bs-dark)'
const COR_NAO_METALICA = 'var(--bs-primary)'

const pct = (valor, total) => (total ? (valor / total) * 100 : 0)
const fmtPct = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'

// Gráfico de barras horizontais: proporção de peças metálicas x não metálicas
function GraficoProporcao({ metalicas, naoMetalicas }) {
  const [ref, largura] = useLargura()
  const [destaque, setDestaque] = useState(null)
  const total = metalicas + naoMetalicas

  const itens = [
    { nome: 'Metálicas', valor: metalicas, cor: COR_METALICA },
    { nome: 'Não metálicas', valor: naoMetalicas, cor: COR_NAO_METALICA },
  ]

  const W = Math.max(260, largura)
  const estreito = W < 420
  const rotW = estreito ? 92 : 112
  const valW = estreito ? 90 : 104
  const barH = 24
  const passo = 48
  const H = itens.length * passo
  const maior = Math.max(1, ...itens.map((i) => i.valor))

  return (
    <Card className="h-100 shadow-sm">
      <Card.Body>
        <Card.Subtitle className="text-muted mb-2">Proporção metálicas x não metálicas</Card.Subtitle>

        <div className="grafico-legenda mb-2">
          {itens.map((i) => (
            <span key={i.nome} style={{ '--cor': i.cor }}>{i.nome}</span>
          ))}
        </div>

        <div ref={ref} className="position-relative">
          {total === 0 ? (
            <p className="text-muted text-center my-4">Nenhuma peça contada ainda.</p>
          ) : (
            largura > 0 && (
              <svg className="grafico-svg" width={W} height={H} role="img"
                aria-label={`Metálicas ${metalicas} (${fmtPct(pct(metalicas, total))}), não metálicas ${naoMetalicas} (${fmtPct(pct(naoMetalicas, total))})`}>
                <line x1={rotW} x2={rotW} y1={0} y2={H} className="grafico-eixo" />
                {itens.map((item, i) => {
                  const y = i * passo + (passo - barH) / 2
                  const w = Math.max(2, (item.valor / maior) * (W - rotW - valW))
                  const r = Math.min(4, w / 2)
                  return (
                    <g key={item.nome}
                      onMouseEnter={() => setDestaque(i)}
                      onMouseLeave={() => setDestaque(null)}
                      opacity={destaque === null || destaque === i ? 1 : 0.45}>
                      <text x={rotW - 8} y={y + barH / 2 + 4} textAnchor="end">{item.nome}</text>
                      {/* barra com a ponta arredondada e a base reta */}
                      <path fill={item.cor}
                        d={`M${rotW},${y}h${w - r}a${r},${r} 0 0 1 ${r},${r}v${barH - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${r - w}z`} />
                      <text x={rotW + w + 8} y={y + barH / 2 + 4} className="grafico-valor">
                        {item.valor} · {fmtPct(pct(item.valor, total))}
                      </text>
                      {/* área maior que a barra para facilitar o hover */}
                      <rect x={0} y={i * passo} width={W} height={passo} fill="transparent">
                        <title>{`${item.nome}: ${item.valor} peças (${fmtPct(pct(item.valor, total))})`}</title>
                      </rect>
                    </g>
                  )
                })}
              </svg>
            )
          )}
        </div>
      </Card.Body>
    </Card>
  )
}

export default GraficoProporcao
