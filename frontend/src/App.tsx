import { AuthProvider } from './context/AuthContext'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
// Si tienes un Dashboard moderno, impórtalo aquí
// import Dashboard from './pages/Dashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* <Route path="/" element={<Dashboard />} /> */}
          {/* Puedes agregar más rutas aquí */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
