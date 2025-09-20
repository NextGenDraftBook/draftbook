import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extender la interfaz Request para incluir información del usuario y negocio
declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: string;
        email: string;
        rol: string;
        negocioId?: string;
      };
      negocio?: {
        id: string;
        slug: string;
        nombre: string;
        email: string;
        activo: boolean;
        suspendido: boolean;
      };
    }
  }
}

// Middleware de autenticación principal
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    // Verificar JWT
    const JWT_SECRET = process.env.JWT_SECRET || 'tu_secreto_jwt_muy_seguro';
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Buscar el usuario en la base de datos
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      include: {
        negocio: true
      }
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (!usuario.activo) {
      return res.status(401).json({ error: 'Usuario inactivo' });
    }

    // Agregar información del usuario a la request
    req.usuario = {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      negocioId: usuario.negocioId || undefined
    };

    // Agregar información del negocio si existe
    if (usuario.negocio) {
      req.negocio = {
        id: usuario.negocio.id,
        slug: usuario.negocio.slug,
        nombre: usuario.negocio.nombre,
        email: usuario.negocio.email,
        activo: usuario.negocio.activo,
        suspendido: usuario.negocio.suspendido
      };

      // Verificar que el negocio esté activo y no suspendido
      if (!usuario.negocio.activo || usuario.negocio.suspendido) {
        return res.status(403).json({ 
          error: 'El negocio está inactivo o suspendido',
          suspendido: usuario.negocio.suspendido,
          activo: usuario.negocio.activo
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar roles específicos
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    next();
  };
};

// Middlewares específicos para roles
export const requireAdmin = requireRole(['ADMIN', 'SUPERADMIN']);
export const requireSuperAdmin = requireRole(['SUPERADMIN']);
export const requireUser = requireRole(['CLIENTE', 'ADMIN', 'SUPERADMIN']);
