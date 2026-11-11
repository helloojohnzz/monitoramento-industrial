import { Table, Badge, Alert } from 'react-bootstrap'
import StatusConexao from '../components/StatusConexao'
import { calcularNivel, situacaoNivel, formatarData } from '../utils/calculos'
import { NIVEL_ATENCAO, NIVEL_CRITICO } from '../config'

function Alertas({ leituras, loading, erro }) {
  // Só as leituras em que o reservatório passou do nível de atenção
  const alertas = leituras
    .map((l) => ({ ...l, nivel: calcularNivel(l.distance) }))
    .filter((l) => l.nivel >= NIVEL_ATENCAO)
    .reverse()

  return (
    <>
      <h1 className="h3 mb-3">Alertas do reservatório</h1>
      <StatusConexao loading={loading} erro={erro} temDados={leituras.length > 0} />

      <p className="text-muted">
        Atenção a partir de {NIVEL_ATENCAO}% e crítico a partir de {NIVEL_CRITICO}% da capacidade.
      </p>

      {alertas.length === 0 ? (
        <Alert variant="success">Nenhum alerta. O reservatório está dentro do normal.</Alert>
      ) : (
        <Table striped bordered responsive size="sm">
          <thead>
            <tr>
              <th>Data/hora</th>
              <th>Nível (%)</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {alertas.map((l) => {
              const situacao = situacaoNivel(l.nivel)
              return (
                <tr key={l.id}>
                  <td>{formatarData(l.dateTime)}</td>
                  <td>{l.nivel}</td>
                  <td><Badge bg={situacao.cor}>{situacao.texto}</Badge></td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </>
  )
}

export default Alertas
