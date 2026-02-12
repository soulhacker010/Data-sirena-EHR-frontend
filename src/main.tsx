import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        className: 'toast-custom',
        style: {
          background: '#1E293B',
          color: '#F8FAFC',
          fontSize: '0.875rem',
          fontWeight: 500,
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.25)',
        },
        success: {
          iconTheme: {
            primary: '#14B8A6',
            secondary: '#F8FAFC',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: '#F8FAFC',
          },
        },
      }}
    />
  </StrictMode>,
)
