import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { PrismaClient, Rol } from '@prisma/client';
import { z } from 'zod';
import prisma from '../utils/prisma';

// Extender la interfaz Request para incluir el usuario y negocio
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

// Esquemas de validación
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

const registroSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().optional(),
  negocioId: z.string().optional(),
  nombreNegocio: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  estado: z.string().optional(),
  codigoPostal: z.string().optional(),
  descripcion: z.string().optional(),
  especialidad: z.string().optional(),
  horarioAtencion: z.string().optional(),
  sitioWeb: z.string().url().optional().or(z.literal(''))
});

// Esquema para registro de clientes
const registroClienteSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().optional(),
  telefono: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  negocioId: z.string().min(1, 'Debe seleccionar un consultorio')
});

// Función para generar slug único
const generateUniqueSlug = async (nombreNegocio: string): Promise<string> => {
  const baseSlug = nombreNegocio
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  let slug = baseSlug;
  let counter = 1;
  
  // Verificar si el slug ya existe y agregar número si es necesario
  while (true) {
    const existingNegocio = await prisma.negocio.findUnique({
      where: { slug }
    });
    
    if (!existingNegocio) {
      break;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: {
        negocio: {
          select: {
            id: true,
            slug: true,
            nombre: true,
            activo: true,
            suspendido: true
          }
        }
      }
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar si el usuario está bloqueado
    if (!usuario.activo) {
      return res.status(403).json({ 
        error: 'Usuario bloqueado por falta de pago. Comuníquese con el administrador.',
        codigo: 'USUARIO_BLOQUEADO',
        bloqueado: true
      });
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.email, 
        rol: usuario.rol,
        negocioId: usuario.negocioId 
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    // Enviar respuesta sin la contraseña
    const { password: _, ...usuarioSinPassword } = usuario;

    return res.json({
      message: 'Login exitoso',
      token,
      usuario: usuarioSinPassword
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const registro = async (req: Request, res: Response) => {
  try {
    const { 
      email, 
      password, 
      nombre, 
      apellido, 
      negocioId, 
      nombreNegocio, 
      telefono,
      direccion,
      ciudad,
      estado,
      codigoPostal,
      descripcion,
      especialidad,
      horarioAtencion,
      sitioWeb
    } = req.body;

    // Verificar si el email ya existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email }
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Encriptar contraseña
    const passwordEncriptada = await bcrypt.hash(password, 12);

    let usuario;

    if (nombreNegocio) {
      // Registro de negocio/consultorio - crear negocio y usuario admin
      
      // Generar slug único automáticamente
      const slugNegocio = await generateUniqueSlug(nombreNegocio);

      // Crear negocio y usuario en una transacción
      const resultado = await prisma.$transaction(async (tx) => {
        // Crear el negocio con todos los campos
        const nuevoNegocio = await tx.negocio.create({
          data: {
            nombre: nombreNegocio,
            slug: slugNegocio,
            email: email, // Usar el email del admin como email del negocio
            telefono: telefono || undefined,
            direccion: direccion || undefined,
            ciudad: ciudad || undefined,
            estado: estado || undefined,
            codigoPostal: codigoPostal || undefined,
            descripcion: descripcion || undefined,
            especialidad: especialidad || undefined,
            horarioAtencion: horarioAtencion || undefined,
            sitioWeb: sitioWeb || undefined,
            activo: true,
            suspendido: false
          }
        });

        // Crear el usuario admin del negocio
        const nuevoUsuario = await tx.usuario.create({
          data: {
            email,
            password: passwordEncriptada,
            nombre,
            apellido,
            negocioId: nuevoNegocio.id,
            rol: 'ADMIN',
            activo: true
          },
          include: {
            negocio: {
              select: {
                id: true,
                slug: true,
                nombre: true
              }
            }
          }
        });

        return nuevoUsuario;
      });

      usuario = resultado;
    } else {
      // Registro de usuario regular (SUPERADMIN sin negocio)
      usuario = await prisma.usuario.create({
        data: {
          email,
          password: passwordEncriptada,
          nombre,
          apellido,
          negocioId: negocioId || null,
          rol: negocioId ? 'ADMIN' : 'SUPERADMIN',
          activo: true
        },
        include: {
          negocio: {
            select: {
              id: true,
              slug: true,
              nombre: true
            }
          }
        }
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.email, 
        rol: usuario.rol,
        negocioId: usuario.negocioId 
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    // Enviar respuesta sin la contraseña
    const { password: _, ...usuarioSinPassword } = usuario;

    const message = nombreNegocio 
      ? 'Consultorio y usuario admin registrados exitosamente'
      : 'Usuario registrado exitosamente';

    return res.status(201).json({
      message,
      token,
      usuario: usuarioSinPassword
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Error en registro:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const registroCliente = async (req: Request, res: Response) => {
  try {
    const { email, password, nombre, apellido, telefono, negocioId } = registroClienteSchema.parse(req.body);

    // Verificar si el usuario ya existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email }
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // Verificar que el negocio existe y está activo
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId }
    });

    if (!negocio || !negocio.activo || negocio.suspendido) {
      return res.status(400).json({ error: 'El consultorio seleccionado no está disponible' });
    }

    // Encriptar contraseña
    const passwordHash = await bcrypt.hash(password, 12);

    // Crear usuario cliente y cliente en una transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear el usuario con rol CLIENTE
      const nuevoUsuario = await tx.usuario.create({
        data: {
          email,
          password: passwordHash,
          nombre,
          apellido,
          rol: 'CLIENTE' as Rol,
          negocioId,
          activo: true
        }
      });

      // Crear el cliente con información detallada
      const nuevoCliente = await tx.cliente.create({
        data: {
          nombre,
          apellido,
          email,
          telefono,
          negocioId,
          activo: true
        }
      });

      return {
        usuario: nuevoUsuario,
        cliente: nuevoCliente
      };
    });

    // Obtener el usuario con datos del negocio para la respuesta
    const usuarioCompleto = await prisma.usuario.findUnique({
      where: { id: resultado.usuario.id },
      include: {
        negocio: {
          select: {
            id: true,
            slug: true,
            nombre: true
          }
        }
      }
    });

    // Remover password de la respuesta
    const { password: _, ...usuarioSinPassword } = usuarioCompleto!;

    return res.status(201).json({
      message: 'Cliente registrado exitosamente',
      usuario: usuarioSinPassword
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Datos de entrada inválidos',
        details: error.issues 
      });
    }
    
    console.error('Error en registro de cliente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const obtenerPerfil = async (req: Request, res: Response) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      include: {
        negocio: {
          select: {
            id: true,
            slug: true,
            nombre: true,
            activo: true,
            suspendido: true
          }
        }
      }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { password: _, ...usuarioSinPassword } = usuario;

    return res.json({ usuario: usuarioSinPassword });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const cambiarPassword = async (req: Request, res: Response) => {
  try {
    const { passwordActual, passwordNueva } = req.body;

    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }

    if (passwordNueva.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    // Obtener usuario con contraseña
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const passwordValida = await bcrypt.compare(passwordActual, usuario.password);
    if (!passwordValida) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }

    // Encriptar nueva contraseña
    const passwordEncriptada = await bcrypt.hash(passwordNueva, 12);

    // Actualizar contraseña
    await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { password: passwordEncriptada }
    });

    return res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
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

export const verificarToken = async (req: Request, res: Response) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Buscar usuario actualizado en la base de datos
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      include: {
        negocio: {
          select: {
            id: true,
            slug: true,
            nombre: true,
            activo: true,
            suspendido: true
          }
        }
      }
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    // Verificar si el negocio está activo (si es admin)
    if (usuario.rol === 'ADMIN' && usuario.negocio && (!usuario.negocio.activo || usuario.negocio.suspendido)) {
      return res.status(403).json({ error: 'Negocio suspendido o inactivo' });
    }

    // Enviar usuario sin contraseña
    const { password: _, ...usuarioSinPassword } = usuario;

    return res.json({
      message: 'Token válido',
      usuario: usuarioSinPassword
    });
  } catch (error) {
    console.error('Error verificando token:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const logout = async (req: Request, res: Response) => {
  // En JWT, el logout se maneja del lado del cliente eliminando el token
  // Aquí solo enviamos una respuesta de confirmación
  return res.json({ message: 'Logout exitoso' });
};