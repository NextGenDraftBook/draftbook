import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Componente para rutas protegidas
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Componente principal de la aplicación
const AppContent: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Ruta raíz - redirigir según rol */}
      <Route 
        path="/" 
        element={
          user ? (
            user.rol === 'SUPERADMIN' ? (
              <Navigate to="/dashboard" replace />
            ) : user.rol === 'ADMIN' ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />

      {/* Dashboard temporal */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gray-100 p-8">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h1 className="text-3xl font-bold text-gray-800 mb-4">
                    ¡Bienvenido a DraftBook!
                  </h1>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h2 className="text-xl font-semibold text-blue-800 mb-2">
                        Usuario Actual
                      </h2>
                      <p className="text-blue-600">Nombre: {user?.nombre} {user?.apellido}</p>
                      <p className="text-blue-600">Email: {user?.email}</p>
                      <p className="text-blue-600">Rol: {user?.rol}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h2 className="text-xl font-semibold text-green-800 mb-2">
                        Sistema Funcionando
                      </h2>
                      <p className="text-green-600">✅ Autenticación JWT</p>
                      <p className="text-green-600">✅ Base de datos Prisma</p>
                      <p className="text-green-600">✅ Validaciones Zod</p>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={logout}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      {/* Rutas de error */}
      <Route path="/unauthorized" element={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-4xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
            <p className="text-gray-600 mb-4">No tienes permisos para acceder a esta página.</p>
            <button 
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      } />
      
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
            <p className="text-gray-600 mb-4">Página no encontrada.</p>
            <button 
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      } />
    </Routes>
  );
};

// Componente principal
const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen">
        <AppContent />
      </div>
    </AuthProvider>
  );
};

export default App;
