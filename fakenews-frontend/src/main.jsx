/**
 * @file main.jsx
 * @description Punto de entrada de React: monta la aplicacion y carga la configuracion base de estilos.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/** Punto de entrada React: monta la aplicacion en el nodo raiz del documento. */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
