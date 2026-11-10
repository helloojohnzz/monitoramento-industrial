import { Link } from 'react-router-dom'

function NaoEncontrada() {
  return (
    <div className="text-center my-5">
      <h1 className="h3">Página não encontrada</h1>
      <Link to="/">Voltar para o dashboard</Link>
    </div>
  )
}

export default NaoEncontrada
