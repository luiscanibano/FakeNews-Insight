/**
 * @file main.jsx
 * @description Punto de entrada de React: monta la aplicación y carga la configuración base de estilos.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/i18n'
import App from './App.jsx'

/** Punto de entrada React: monta la aplicación en el nodo raiz del documento. */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
