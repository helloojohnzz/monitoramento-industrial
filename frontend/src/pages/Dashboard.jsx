import { Row, Col } from 'react-bootstrap'
import CardIndicador from '../components/CardIndicador'
import NivelReservatorio from '../components/NivelReservatorio'
import GraficoBarras from '../components/GraficoBarras'
import StatusConexao from '../components/StatusConexao'
import { calcularResumo, calcularNivel, situacaoNivel, ehMetal, formatarData } from '../utils/calculos'

// Agrupa as leituras por hora para ver a evolução da contagem
const contarPorHora = (leituras) => {
  const grupos = {}
  leituras.forEach((l) => {
    const hora = new Date(l.dateTime).getHours() + 'h'
    if (!grupos[hora]) grupos[hora] = { metalicas: 0, naoMetalicas: 0 }
    if (ehMetal(l)) grupos[hora].metalicas++
    else grupos[hora].naoMetalicas++
  })
  return grupos
}

function Dashboard({ leituras, loading, erro }) {
  const resumo = calcularResumo(leituras)
  const porHora = contarPorHora(leituras)

  // Últimas 10 leituras do nível do reservatório
  const ultimosNiveis = leituras.slice(-10).map((l) => {
    const nivel = calcularNivel(l.distance)
    return {
      rotulo: new Date(l.dateTime).toLocaleTimeString('pt-BR'),
      valor: nivel,
      cor: situacaoNivel(nivel).cor,
    }
  })

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-end mb-3">
        <h1 className="h3 mb-0">Esteira de triagem</h1>
        <small className="text-muted">Última leitura: {formatarData(resumo.atualizadoEm)}</small>
      </div>

      <StatusConexao loading={loading} erro={erro} temDados={leituras.length > 0} />

      <Row className="g-3 mb-3">
        <Col xs={12} sm={4}>
          <CardIndicador titulo="Total de peças" valor={resumo.total} cor="secondary" />
        </Col>
        <Col xs={6} sm={4}>
          <CardIndicador titulo="Metálicas" valor={resumo.metalicas} cor="dark" />
        </Col>
        <Col xs={6} sm={4}>
          <CardIndicador titulo="Não metálicas" valor={resumo.naoMetalicas} cor="primary" />
        </Col>
      </Row>

      <Row className="g-3 mb-3">
        <Col md={6}>
          <NivelReservatorio nivel={resumo.nivel} />
        </Col>
        <Col md={6}>
          <GraficoBarras
            titulo="Metálico x não metálico"
            itens={[
              { rotulo: 'Metálicas', valor: resumo.metalicas, cor: 'dark' },
              { rotulo: 'Não metálicas', valor: resumo.naoMetalicas, cor: 'primary' },
            ]}
          />
        </Col>
      </Row>

      <Row className="g-3">
        <Col md={6}>
          <GraficoBarras
            titulo="Peças por hora"
            itens={Object.keys(porHora).map((hora) => ({
              rotulo: `${hora} (metálicas / não metálicas: ${porHora[hora].metalicas} / ${porHora[hora].naoMetalicas})`,
              valor: porHora[hora].metalicas + porHora[hora].naoMetalicas,
              cor: 'primary',
            }))}
          />
        </Col>
        <Col md={6}>
          <GraficoBarras titulo="Nível do reservatório nas últimas leituras (%)" itens={ultimosNiveis} maximo={100} />
        </Col>
      </Row>
    </>
  )
}

export default Dashboard
