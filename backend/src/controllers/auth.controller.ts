import { Request, Response } from 'express';

// Función de login básica
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validación básica
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // TODO: Implementar validación real contra base de datos
    // Por ahora, simulamos un login exitoso con credenciales específicas
    if (email === 'admin@draftbook.com' && password === 'admin123') {
      const mockToken = 'mock-jwt-token-123';
      const mockUser = {
        id: '1',
        email: 'admin@draftbook.com',
        role: 'admin'
      };

      return res.json({
        success: true,
        message: 'Login exitoso',
        token: mockToken,
        user: mockUser
      });
    }

    return res.status(401).json({ error: 'Credenciales inválidas' });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Función de logout
export const logout = async (req: Request, res: Response) => {
  try {
    // En JWT, el logout se maneja del lado del cliente eliminando el token
    // Aquí solo enviamos una respuesta de confirmación
    return res.json({ 
      message: 'Logout exitoso',
      success: true 
    });
  } catch (error) {
    console.error('Error en logout:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Función para obtener perfil del usuario
export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    return res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};