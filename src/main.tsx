import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProvider } from './context/AppContext.tsx'

/**
 * Auto-actualización sin fricción: el service worker (registerType 'autoUpdate')
 * descarga la versión nueva en segundo plano y toma el control. Aquí recargamos
 * la página UNA sola vez en ese momento para que el usuario vea siempre la
 * última versión sin reinstalar ni recargar a mano.
 *
 * `hadController` evita recargar en la primerísima instalación (cuando aún no
 * había un service worker controlando la página).
 */
if ('serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller)
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return
    reloading = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)
