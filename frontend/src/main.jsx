import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { aplicarTema, leerTema } from './utils/tema.js'

// Antes del primer render: si se aplicara dentro de un efecto, el panel pintaría
// un frame con el tema equivocado en cada carga.
aplicarTema(leerTema())

// Sin esto, cualquier error de render desmonta todo y queda una pantalla blanca
// muda: el cliente no sabe qué hacer y nosotros no nos enteramos de nada.
class ErrorGeneral extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Error que tiró la página:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="pantalla-error-general">
        <p>Algo salió mal al cargar la página.</p>
        <button type="button" onClick={() => window.location.reload()}>Recargar</button>
      </div>
    )
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorGeneral>
      <App />
    </ErrorGeneral>
  </StrictMode>,
)
