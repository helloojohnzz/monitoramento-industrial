import { Alert, Spinner } from 'react-bootstrap'

// Mostra "carregando" ou erro de conexão com a API
function StatusConexao({ loading, erro, temDados }) {
  if (loading && !temDados) {
    return (
      <div className="text-center my-4">
        <Spinner animation="border" /> <span className="ms-2">Carregando dados...</span>
      </div>
    )
  }

  if (erro) {
    return <Alert variant="danger">{erro}. Verifique se o servidor está rodando.</Alert>
  }

  return null
}

export default StatusConexao
