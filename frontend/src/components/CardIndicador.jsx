import { Card } from 'react-bootstrap'

// Card reutilizável para mostrar um número com um título
function CardIndicador({ titulo, valor, cor = 'primary', detalhe }) {
  return (
    <Card border={cor} className="h-100 text-center shadow-sm">
      <Card.Body>
        <Card.Subtitle className="text-muted mb-2">{titulo}</Card.Subtitle>
        <Card.Title as="h2" className={`text-${cor} mb-0`}>{valor}</Card.Title>
        {detalhe && <small className="text-muted">{detalhe}</small>}
      </Card.Body>
    </Card>
  )
}

export default CardIndicador
