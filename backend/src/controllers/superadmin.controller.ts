import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { ejecutarRevisionManual } from '../jobs/revisarPagos';

const prisma = new PrismaClient();

// Esquemas de validación
const negocioSchema = z.object({
  slug: z.string().min(3, 'El slug debe tener al menos 3 caracteres'),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
});

const usuarioSchema = z.object({
  email: z.string().email('Email inválido'),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
  rol: z.enum(['ADMIN']),
  negocioId: z.string().uuid('ID de negocio inválido'),
});

const pagoSchema = z.object({
  estado: z.enum(['PENDIENTE', 'PAGADO', 'RECHAZADO', 'VENCIDO']),
  referencia: z.string().optional(),
  metodo: z.string().optional(),
});

const pagoManualSchema = z.object({
  negocioId: z.string().uuid('ID de negocio inválido'),
  monto: z.number().positive('El monto debe ser positivo'),
  metodo: z.string().min(1, 'El método de pago es requerido'),
  referencia: z.string().optional(),
  fechaInicio: z.string().datetime('Fecha de inicio inválida'),
  fechaFin: z.string().datetime('Fecha de fin inválida'),
});

export const obtenerEstadisticas = async (req: Request, res: Response) => {
  try {
    // Obtener estadísticas generales
    const [
      totalNegocios,
      negociosActivos,
      totalCitas,
      totalIngresos,
      pagosPendientes,
      pagosVencidos
    ] = await Promise.all([
      prisma.negocio.count(),
      prisma.negocio.count({ where: { activo: true } }),
      prisma.cita.count(),
      prisma.pagoSistema.aggregate({
        where: { estado: 'PAGADO' },
        _sum: { monto: true }
      }),
      prisma.pagoSistema.count({ where: { estado: 'PENDIENTE' } }),
      prisma.pagoSistema.count({ where: { estado: 'VENCIDO' } })
    ]);

    return res.json({
      totalNegocios,
      negociosActivos,
      totalCitas,
      totalIngresos: totalIngresos._sum.monto || 0,
      pagosPendientes,
      pagosVencidos
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const obtenerNegocios = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search = '', activo } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    
    if (search) {
      where.OR = [
        { nombre: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { slug: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    const [negocios, total] = await Promise.all([
      prisma.negocio.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              usuarios: true,
              clientes: true,
              citas: true,
              pagosSistema: true
            }
          }
        }
      }),
      prisma.negocio.count({ where })
    ]);

    return res.json({
      data: negocios,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Error obteniendo negocios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const crearNegocio = async (req: Request, res: Response) => {
  try {
    const data = negocioSchema.parse(req.body);

    // Verificar si el slug ya existe
    const negocioExistente = await prisma.negocio.findUnique({
      where: { slug: data.slug }
    });

    if (negocioExistente) {
      return res.status(400).json({ error: 'El slug ya está en uso' });
    }

    const negocio = await prisma.negocio.create({
      data: {
        ...data,
        activo: true,
        suspendido: false
      }
    });

    return res.status(201).json(negocio);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error creando negocio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const actualizarNegocio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = negocioSchema.partial().parse(req.body);

    // Verificar si el negocio existe
    const negocioExistente = await prisma.negocio.findUnique({
      where: { id }
    });

    if (!negocioExistente) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    // Si se está actualizando el slug, verificar que no exista
    if (data.slug && data.slug !== negocioExistente.slug) {
      const slugExistente = await prisma.negocio.findUnique({
        where: { slug: data.slug }
      });

      if (slugExistente) {
        return res.status(400).json({ error: 'El slug ya está en uso' });
      }
    }

    const negocio = await prisma.negocio.update({
      where: { id },
      data
    });

    return res.json(negocio);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error actualizando negocio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const eliminarNegocio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar si el negocio existe
    const negocio = await prisma.negocio.findUnique({
      where: { id }
    });

    if (!negocio) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    // Eliminar el negocio y todos sus datos relacionados
    await prisma.negocio.delete({
      where: { id }
    });

    return res.json({ message: 'Negocio eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando negocio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const obtenerPagos = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, estado = '', negocioId = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    
    if (estado && estado !== 'all') {
      where.estado = estado;
    }

    if (negocioId) {
      where.negocioId = negocioId;
    }

    const [pagos, total] = await Promise.all([
      prisma.pagoSistema.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          negocio: {
            select: {
              id: true,
              nombre: true,
              slug: true,
              email: true
            }
          }
        }
      }),
      prisma.pagoSistema.count({ where })
    ]);

    return res.json({
      data: pagos,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Error obteniendo pagos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const actualizarPago = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = pagoSchema.parse(req.body);

    // Verificar si el pago existe
    const pagoExistente = await prisma.pagoSistema.findUnique({
      where: { id }
    });

    if (!pagoExistente) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const pago = await prisma.pagoSistema.update({
      where: { id },
      data
    });

    return res.json(pago);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error actualizando pago:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const obtenerUsuarios = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, rol = '', negocioId = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    
    if (rol && rol !== 'all') {
      where.rol = rol;
    }

    if (negocioId) {
      where.negocioId = negocioId;
    }

    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          nombre: true,
          apellido: true,
          rol: true,
          activo: true,
          createdAt: true,
          updatedAt: true,
          negocio: {
            select: {
              id: true,
              nombre: true,
              slug: true
            }
          }
        }
      }),
      prisma.usuario.count({ where })
    ]);

    return res.json({
      data: usuarios,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Función para suspender/activar negocio
export const toggleSuspenderNegocio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { suspendido, motivo } = req.body;

    const negocio = await prisma.negocio.update({
      where: { id },
      data: { 
        suspendido,
        ...(motivo && { motivoSuspension: motivo })
      }
    });

    return res.json(negocio);
  } catch (error) {
    console.error('Error suspendiendo/activando negocio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Función para activar/desactivar negocio
export const toggleActivarNegocio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    const negocio = await prisma.negocio.update({
      where: { id },
      data: { activo }
    });

    return res.json(negocio);
  } catch (error) {
    console.error('Error activando/desactivando negocio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Función para obtener estadísticas de un negocio específico
export const obtenerEstadisticasNegocio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [
      totalClientes,
      totalCitas,
      citasHoy,
      ingresosMes,
      usuariosActivos
    ] = await Promise.all([
      prisma.cliente.count({ where: { negocioId: id } }),
      prisma.cita.count({ where: { negocioId: id } }),
      prisma.cita.count({
        where: {
          negocioId: id,
          fecha: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      }),
      prisma.pagoSistema.aggregate({
        where: {
          negocioId: id,
          estado: 'PAGADO',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: { monto: true }
      }),
      prisma.usuario.count({
        where: {
          negocioId: id,
          activo: true
        }
      })
    ]);

    return res.json({
      totalClientes,
      totalCitas,
      citasHoy,
      ingresosMes: ingresosMes._sum?.monto || 0,
      usuariosActivos
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas del negocio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Función para ejecutar revisión manual de pagos
export const ejecutarRevisionPagos = async (req: Request, res: Response) => {
  try {
    console.log('🚀 Ejecutando revisión manual de pagos por superadmin...');
    await ejecutarRevisionManual();
    
    return res.json({ 
      message: 'Revisión de pagos ejecutada correctamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error ejecutando revisión de pagos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Función para crear usuario
export const crearUsuario = async (req: Request, res: Response) => {
  try {
    const data = usuarioSchema.parse(req.body);
    const bcrypt = require('bcryptjs');

    // Verificar si el email ya existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email: data.email }
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: 'El email ya está en uso' });
    }

    // Verificar que el negocio existe
    const negocio = await prisma.negocio.findUnique({
      where: { id: data.negocioId }
    });

    if (!negocio) {
      return res.status(400).json({ error: 'Negocio no encontrado' });
    }

    // Hash de la contraseña
    const password = data.password || 'temporal123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        email: data.email,
        nombre: data.nombre,
        apellido: data.apellido,
        password: hashedPassword,
        rol: data.rol,
        negocioId: data.negocioId,
        activo: true
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        createdAt: true,
        negocio: {
          select: {
            id: true,
            nombre: true,
            slug: true
          }
        }
      }
    });

    return res.status(201).json(usuario);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error creando usuario:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Función para actualizar usuario
export const actualizarUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = usuarioSchema.partial().parse(req.body);

    // Verificar si el usuario existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id }
    });

    if (!usuarioExistente) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Si se está actualizando el email, verificar que no exista
    if (data.email && data.email !== usuarioExistente.email) {
      const emailExistente = await prisma.usuario.findUnique({
        where: { email: data.email }
      });

      if (emailExistente) {
        return res.status(400).json({ error: 'El email ya está en uso' });
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {};
    if (data.email) updateData.email = data.email;
    if (data.nombre) updateData.nombre = data.nombre;
    if (data.apellido) updateData.apellido = data.apellido;
    if (data.rol && usuarioExistente.rol !== 'SUPERADMIN') updateData.rol = data.rol;
    if (data.negocioId) updateData.negocioId = data.negocioId;

    // Si hay contraseña, hashearla
    if (data.password) {
      const bcrypt = require('bcryptjs');
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        activo: true,
        createdAt: true,
        negocio: {
          select: {
            id: true,
            nombre: true,
            slug: true
          }
        }
      }
    });

    return res.json(usuario);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error actualizando usuario:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};



// Función para obtener actividad reciente
export const obtenerActividadReciente = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    // Obtener actividad reciente de diferentes tablas
    const [citasRecientes, pagosRecientes, usuariosRecientes] = await Promise.all([
      prisma.cita.findMany({
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fecha: true,
          hora: true,
          motivo: true,
          estado: true,
          createdAt: true,
          cliente: {
            select: { nombre: true, apellido: true }
          },
          negocio: {
            select: { nombre: true, slug: true }
          }
        }
      }),
      prisma.pagoSistema.findMany({
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          monto: true,
          estado: true,
          fechaFin: true,
          createdAt: true,
          negocio: {
            select: { nombre: true, slug: true }
          }
        }
      }),
      prisma.usuario.findMany({
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        where: {
          rol: { not: 'SUPERADMIN' }
        },
        select: {
          id: true,
          email: true,
          nombre: true,
          apellido: true,
          rol: true,
          createdAt: true,
          negocio: {
            select: { nombre: true, slug: true }
          }
        }
      })
    ]);

    return res.json({
      citas: citasRecientes,
      pagos: pagosRecientes,
      usuarios: usuariosRecientes
    });
  } catch (error) {
    console.error('Error obteniendo actividad reciente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Función para crear pagos manuales desde el superadmin
export const crearPagoManual = async (req: Request, res: Response) => {
  try {
    const data = pagoManualSchema.parse(req.body);

    // Verificar que el negocio existe
    const negocio = await prisma.negocio.findUnique({
      where: { id: data.negocioId }
    });

    if (!negocio) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    // Crear el pago
    const pago = await prisma.pagoSistema.create({
      data: {
        negocioId: data.negocioId,
        monto: data.monto,
        moneda: 'MXN',
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: new Date(data.fechaFin),
        estado: 'PAGADO', // Los pagos manuales se marcan como pagados
        metodo: data.metodo,
        referencia: data.referencia
      },
      include: {
        negocio: {
          select: {
            id: true,
            nombre: true,
            slug: true
          }
        }
      }
    });

    return res.status(201).json(pago);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error creando pago manual:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};