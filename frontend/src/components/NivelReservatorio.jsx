import { Card, ProgressBar, Badge, Alert } from 'react-bootstrap'
import { situacaoNivel } from '../utils/calculos'

function NivelReservatorio({ nivel }) {
  const situacao = situacaoNivel(nivel)

  return (
    <Card className="h-100 shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <Card.Subtitle className="text-muted">Nível do reservatório</Card.Subtitle>
          <Badge bg={situacao.cor}>{situacao.texto}</Badge>
        </div>
        <ProgressBar
          now={nivel}
          label={`${nivel}%`}
          variant={situacao.cor}
          style={{ height: '2rem' }}
        />
        {/* Renderização condicional: aviso só aparece quando o nível está crítico */}
        {situacao.cor === 'danger' && (
          <Alert variant="danger" className="fw-bold mt-2 mb-0 py-2">
            Reservatório quase cheio! Esvazie antes de parar a esteira.
          </Alert>
        )}
      </Card.Body>
    </Card>
  )
}

export default NivelReservatorio
