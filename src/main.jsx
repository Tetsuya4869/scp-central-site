import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import '../tokens.css'
import './App.css'
import './styles/redesign.css'
import './styles/atlas-terminal.css'
import './styles/mobile-atlas.css'
import './styles/branch-matrix.css'
import './styles/mobile-stability.css'
import './styles/mobile-scroll.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
