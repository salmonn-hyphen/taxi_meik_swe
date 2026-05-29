import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes'
import { AuthProvider, ToastProvider } from '@/providers'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import '@/index.css'

const splash = document.getElementById('splash')

const root = createRoot(document.getElementById('root')!)
root.render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)

requestAnimationFrame(() => {
  splash?.classList.add('hidden')
  setTimeout(() => splash?.remove(), 300)
})
