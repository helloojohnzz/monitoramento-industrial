import { useState } from 'react'
import { Card, Table } from 'react-bootstrap'
import { useLargura } from '../hooks/useLargura'

const COR_LINHA = 'var(--bs-primary)'
const fmt = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const hora = (d) => new Date(d).toLocaleTimeString('pt-BR')

// Escolhe um passo "redondo" para o eixo Y (1, 2, 5, 10, 20, 25, 50...)
const passoRedondo = (intervalo) =>
  [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000].find((p) => intervalo / p <= 5) || 2000

// Gráfico de segmentos (linha): distâncias medidas pelo sensor nas últimas leituras
function GraficoDistancias({ leituras, quantidade = 50 }) {
  const [ref, largura] = useLargura()
  const [foco, setFoco] = useState(null)

  const pontos = leituras.slice(-quantidade).map((l) => ({ id: l.id, hora: l.dateTime, valor: Number(l.distance) }))

  const W = Math.max(260, largura)
  const estreito = W < 500
  const H = estreito ? 220 : 280
  const m = { t: 14, r: 64, b: 30, l: 44 }
  const pw = W - m.l - m.r
  const ph = H - m.t - m.b

  // Sem leituras ainda: usa uma faixa padrão para não quebrar o eixo
  const valores = pontos.length ? pontos.map((p) => p.valor) : [0]
  const minV = Math.min(...valores)
  const maxV = Math.max(...valores)
  const passo = passoRedondo(maxV - minV || 5)
  const y0 = Math.floor(minV / passo) * passo
  const y1 = Math.max(Math.ceil(maxV / passo) * passo, y0 + passo)
  const sx = (i) => m.l + (pontos.length > 1 ? (i / (pontos.length - 1)) * pw : pw / 2)
  const sy = (v) => m.t + ph - ((v - y0) / (y1 - y0)) * ph

  const ticksY = []
  for (let v = y0; v <= y1 + 1e-9; v += passo) ticksY.push(v)
  const qtdTicksX = Math.min(estreito ? 3 : 5, pontos.length)
  const ticksX = Array.from({ length: qtdTicksX }, (_, k) =>
    Math.round((k / Math.max(1, qtdTicksX - 1)) * (pontos.length - 1)))

  const caminho = pontos.map((p, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(p.valor).toFixed(1)}`).join('')
  const ultimo = pontos[pontos.length - 1]

  // Hover: acha a leitura mais próxima do mouse
  const aoMover = (e) => {
    const caixa = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - caixa.left
    const i = Math.round(((x - m.l) / pw) * (pontos.length - 1))
    setFoco(Math.min(pontos.length - 1, Math.max(0, i)))
  }

  const p = foco !== null ? pontos[foco] : null

  return (
    <Card className="h-100 shadow-sm">
      <Card.Body>
        <Card.Subtitle className="text-muted mb-1">Distâncias medidas pelo sensor (cm)</Card.Subtitle>
        <small className="text-muted d-block mb-2">Últimas {pontos.length} leituras</small>

        <div ref={ref} className="position-relative">
          {pontos.length === 0 ? (
            <p className="text-muted text-center my-4">Nenhuma leitura ainda.</p>
          ) : (
            largura > 0 && (
              <>
                <svg className="grafico-svg" width={W} height={H} role="img"
                  aria-label={`Linha com ${pontos.length} leituras de distância. Última: ${fmt(ultimo.valor)} cm`}
                  onMouseMove={aoMover} onMouseLeave={() => setFoco(null)}>
                  {ticksY.map((v) => (
                    <g key={v}>
                      <line x1={m.l} x2={W - m.r} y1={sy(v)} y2={sy(v)} className="grafico-grade" />
                      <text x={m.l - 8} y={sy(v) + 4} textAnchor="end">{fmt(v)}</text>
                    </g>
                  ))}
                  {ticksX.map((i) => (
                    <text key={i} x={sx(i)} y={H - 8} textAnchor="middle">{hora(pontos[i].hora)}</text>
                  ))}

                  <path d={caminho} fill="none" stroke={COR_LINHA} strokeWidth="2"
                    strokeLinejoin="round" strokeLinecap="round" />

                  {/* rótulo só na última leitura */}
                  <circle cx={sx(pontos.length - 1)} cy={sy(ultimo.valor)} r="4" fill={COR_LINHA} className="grafico-ponto" />
                  <text x={sx(pontos.length - 1) + 8} y={sy(ultimo.valor) + 4} className="grafico-valor">
                    {fmt(ultimo.valor)} cm
                  </text>

                  {p && (
                    <g pointerEvents="none">
                      <line x1={sx(foco)} x2={sx(foco)} y1={m.t} y2={m.t + ph} className="grafico-cruz" />
                      <circle cx={sx(foco)} cy={sy(p.valor)} r="5" fill={COR_LINHA} className="grafico-ponto" />
                    </g>
                  )}
                  <rect x={m.l} y={m.t} width={pw} height={ph} fill="transparent" />
                </svg>

                {p && (
                  <div className="grafico-tooltip"
                    style={{ left: Math.min(Math.max(sx(foco) + 12, 0), W - 150), top: Math.max(sy(p.valor) - 44, 0) }}>
                    {hora(p.hora)}: <strong>{fmt(p.valor)} cm</strong>
                  </div>
                )}
              </>
            )
          )}
        </div>

        {pontos.length > 0 && (
          <details className="mt-2 small text-muted">
            <summary>Ver dados em tabela</summary>
            <Table size="sm" className="mt-2 mb-0" style={{ maxWidth: 320 }}>
              <thead><tr><th>Horário</th><th>Distância (cm)</th></tr></thead>
              <tbody>
                {[...pontos].reverse().map((q) => (
                  <tr key={q.id}><td>{hora(q.hora)}</td><td>{fmt(q.valor)}</td></tr>
                ))}
              </tbody>
            </Table>
          </details>
        )}
      </Card.Body>
    </Card>
  )
}

export default GraficoDistancias
