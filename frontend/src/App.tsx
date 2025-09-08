import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

interface HealthResponse {
  status: string;
  message: string;
}

function App() {
  const [count, setCount] = useState(0)
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('http://localhost:3001/api/health')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data: HealthResponse = await response.json()
        setBackendHealth(data)
        setError(null)
      } catch (err) {
        console.error('Error connecting to backend:', err)
        setError('No se pudo conectar con el backend')
        setBackendHealth(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkBackendHealth()
  }, [])

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>📚 DraftBook V1</h1>
      
      {/* Estado del Backend */}
      <div className="card">
        <h3>🔗 Estado del Backend</h3>
        {isLoading ? (
          <p>🔄 Conectando...</p>
        ) : error ? (
          <p style={{color: 'red'}}>❌ {error}</p>
        ) : backendHealth ? (
          <p style={{color: 'green'}}>✅ {backendHealth.message}</p>
        ) : null}
      </div>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          contador: {count}
        </button>
        <p>
          Edita <code>src/App.tsx</code> y guarda para probar HMR
        </p>
      </div>
      
      <div className="card">
        <h3>🚀 Entorno de Desarrollo</h3>
        <p><strong>Frontend:</strong> React 19 + TypeScript + Vite</p>
        <p><strong>Backend:</strong> Node.js + Express + TypeScript</p>
        <p><strong>Puerto Frontend:</strong> 5173</p>
        <p><strong>Puerto Backend:</strong> 3001</p>
      </div>

      <p className="read-the-docs">
        Haz clic en los logos de Vite y React para aprender más
      </p>
    </>
  )
}

export default App
