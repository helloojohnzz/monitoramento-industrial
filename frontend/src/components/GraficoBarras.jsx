import { Card, ProgressBar } from 'react-bootstrap'

// Gráfico de barras horizontal feito com ProgressBar do Bootstrap.
// Recebe uma lista de itens: { rotulo, valor, cor }
// "maximo" é opcional: se não vier, a maior barra vira 100%
function GraficoBarras({ titulo, itens, maximo }) {
  const maior = maximo || Math.max(1, ...itens.map((item) => item.valor))

  return (
    <Card className="h-100 shadow-sm">
      <Card.Body>
        <Card.Subtitle className="text-muted mb-3">{titulo}</Card.Subtitle>
        {itens.map((item) => (
          <div key={item.rotulo} className="mb-2">
            <div className="d-flex justify-content-between">
              <small>{item.rotulo}</small>
              <small className="fw-bold">{item.valor}</small>
            </div>
            <ProgressBar now={(item.valor / maior) * 100} variant={item.cor} />
          </div>
        ))}
      </Card.Body>
    </Card>
  )
}

export default GraficoBarras
