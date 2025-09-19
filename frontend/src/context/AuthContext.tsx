import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { ReactNode } from 'react';

// Tipos
interface User {
  id: string;
  email: string;
  nombre: string;
  apellido?: string;
  rol: string;
  negocioId?: string;
  negocio?: {
    id: string;
    slug: string;
    nombre: string;
    activo: boolean;
    suspendido: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    nombre: string;
    apellido?: string;
    negocioId?: string;
    nombreNegocio?: string;
  }) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Proveedor del contexto
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar autenticación al cargar la app
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          
          // Verificar si el token aún es válido
          try {
            const response = await fetch('http://localhost:3001/api/auth/verificar', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (response.ok) {
              const { usuario } = await response.json();
              setUser(usuario);
              // Actualizar el usuario guardado con los datos más recientes
              localStorage.setItem('user', JSON.stringify(usuario));
            } else {
              // Token inválido, limpiar localStorage
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          } catch (error) {
            // Si no puede verificar el token, usar los datos guardados
            console.warn('No se pudo verificar el token, usando datos locales:', error);
            setUser(userData);
          }
        } catch (error) {
          console.error('Error parsing saved user:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Guardar token y usuario en localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.usuario));
        
        setUser(data.usuario);
        toast.success('Inicio de sesión exitoso');
      } else {
        toast.error(data.error || 'Error al iniciar sesión');
        throw new Error(data.error || 'Error al iniciar sesión');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    nombre: string;
    apellido?: string;
    negocioId?: string;
    nombreNegocio?: string;
  }) => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/auth/registro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        // Guardar token y usuario en localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.usuario));
        
        setUser(data.usuario);
        toast.success('Registro exitoso');
      } else {
        toast.error(data.error || 'Error al registrarse');
        throw new Error(data.error || 'Error al registrarse');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al registrarse');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Limpiar datos locales
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    
    // Llamar al endpoint de logout (opcional)
    fetch('http://localhost:3001/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    }).catch(console.error);
    
    toast.success('Sesión cerrada');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};