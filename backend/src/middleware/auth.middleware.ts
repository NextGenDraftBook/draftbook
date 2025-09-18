import { Request, Response, NextFunction } from 'express';

// Extender la interfaz Request para incluir información del usuario
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
      };
    }
  }
}

// Middleware básico de autenticación (sin JWT por ahora)
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    // Por ahora, simulamos un usuario básico
    // TODO: Implementar verificación JWT real cuando se configure la base de datos
    req.user = {
      id: '1',
      email: 'user@example.com',
      role: 'user'
    };

    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar roles específicos
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!roles.includes(req.user.role || 'user')) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    next();
  };
};

// Middlewares específicos para roles
export const requireAdmin = requireRole(['admin']);
export const requireUser = requireRole(['user', 'admin']);
