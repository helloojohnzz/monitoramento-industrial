import { Routes, Route } from 'react-router-dom'
import { Container } from 'react-bootstrap'
import Menu from './components/Menu'
import Dashboard from './pages/Dashboard'
import Historico from './pages/Historico'
import Alertas from './pages/Alertas'
import NaoEncontrada from './pages/NaoEncontrada'
import { useFetch } from './hooks/useFetch'
import { URL_LEITURAS, INTERVALO_ATUALIZACAO } from './config'
import dadosDemo from '../db.json'

function App() {
  // As leituras são buscadas uma vez aqui e passadas para as páginas por props
  const { data: leituras, loading, erro } = useFetch(URL_LEITURAS, INTERVALO_ATUALIZACAO, dadosDemo.records)

  const dados = { leituras: leituras || [], loading, erro }

  return (
    <>
      <Menu />
      <Container className="py-4">
        <Routes>
          <Route path="/" element={<Dashboard {...dados} />} />
          <Route path="/historico" element={<Historico {...dados} />} />
          <Route path="/alertas" element={<Alertas {...dados} />} />
          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
      </Container>
    </>
  )
}

export default App
