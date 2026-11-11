import React from 'react'
import ReactDOM from 'react-dom/client'
// HashRouter: as rotas funcionam no GitHub Pages (ex.: /#/historico)
import { HashRouter } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
