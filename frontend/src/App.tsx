import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import { generalService } from './services/api'

interface HealthResponse {
  status: string;
  message: string;
}

function LoginForm() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('admin@draftbook.com');
  const [password, setPassword] = useState('admin123');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(email, password);
    setMessage(result.message);
  };

  return (
    <div className="card">
      <h3>🔐 Login</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </button>
      </form>
      {message && <p style={{ color: message.includes('exitoso') ? 'green' : 'red' }}>{message}</p>}
      <p style={{ fontSize: '12px', color: '#666' }}>
        Usuario demo: admin@draftbook.com / admin123
      </p>
    </div>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="card">
      <h3>✅ Bienvenido</h3>
      <p>Usuario: {user?.email}</p>
      <p>Rol: {user?.role || 'user'}</p>
      <button onClick={logout} style={{ marginTop: '10px' }}>
        Cerrar Sesión
      </button>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [count, setCount] = useState(0)
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        setHealthLoading(true)
        const data = await generalService.healthCheck()
        setBackendHealth(data)
        setError(null)
      } catch (err) {
        console.error('Error connecting to backend:', err)
        setError('No se pudo conectar con el backend')
        setBackendHealth(null)
      } finally {
        setHealthLoading(false)
      }
    }

    checkBackendHealth()
  }, [])

  if (isLoading) {
    return <div>🔄 Cargando...</div>;
  }

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
        {healthLoading ? (
          <p>🔄 Conectando...</p>
        ) : error ? (
          <p style={{color: 'red'}}>❌ {error}</p>
        ) : backendHealth ? (
          <p style={{color: 'green'}}>✅ {backendHealth.message}</p>
        ) : null}
      </div>

      {/* Sistema de Autenticación */}
      {isAuthenticated ? <Dashboard /> : <LoginForm />}

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
        <p><strong>Estado:</strong> {isAuthenticated ? '✅ Autenticado' : '❌ No autenticado'}</p>
      </div>

      <p className="read-the-docs">
        Haz clic en los logos de Vite y React para aprender más
      </p>
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
