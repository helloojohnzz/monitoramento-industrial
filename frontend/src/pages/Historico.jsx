import { useState } from 'react'
import { Table, Form } from 'react-bootstrap'
import StatusConexao from '../components/StatusConexao'
import { contarPecas, calcularNivel, formatarData } from '../utils/calculos'

function Historico({ leituras, loading, erro }) {
  // Filtro controlado pelo formulário
  const [filtro, setFiltro] = useState('todas')

  const filtradas = leituras.filter((l) => {
    const { metalicas, naoMetalicas } = contarPecas(l)
    if (filtro === 'metalicas') return metalicas > 0
    if (filtro === 'nao-metalicas') return naoMetalicas > 0
    return true
  })

  return (
    <>
      <h1 className="h3 mb-3">Histórico de leituras</h1>
      <StatusConexao loading={loading} erro={erro} temDados={leituras.length > 0} />

      <Form.Group className="mb-3" style={{ maxWidth: 300 }}>
        <Form.Label>Tipo de peça</Form.Label>
        <Form.Select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="todas">Todas</option>
          <option value="metalicas">Metálicas</option>
          <option value="nao-metalicas">Não metálicas</option>
        </Form.Select>
      </Form.Group>

      <Table striped bordered hover responsive size="sm">
        <thead>
          <tr>
            <th>#</th>
            <th>Data/hora</th>
            <th>Metálicas</th>
            <th>Não metálicas</th>
            <th>Situação</th>
            <th>Distância (cm)</th>
            <th>Nível (%)</th>
          </tr>
        </thead>
        <tbody>
          {[...filtradas].reverse().map((l) => (
            <tr key={l.id}>
              <td>{l.id}</td>
              <td>{formatarData(l.dateTime)}</td>
              <td>{contarPecas(l).metalicas}</td>
              <td>{contarPecas(l).naoMetalicas}</td>
              <td>{l.situation === 'unknown' || !l.situation ? '—' : l.situation}</td>
              <td>{l.distance ?? '—'}</td>
              <td>{calcularNivel(l.distance) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {filtradas.length === 0 && !loading && <p className="text-muted">Nenhuma leitura encontrada.</p>}
    </>
  )
}

export default Historico
