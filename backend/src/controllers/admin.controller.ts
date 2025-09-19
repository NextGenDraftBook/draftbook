import { Request, Response } from 'express';
import { PrismaClient, TipoNotificacion, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../utils/prisma';

// Función para convertir fecha YYYY-MM-DD a Date sin problemas de zona horaria
const parseDateOnly = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month - 1 porque Date usa meses 0-indexados
};

// Función auxiliar para obtener el negocioId
const obtenerNegocioId = (req: Request): string | undefined => {
  let negocioId = req.usuario?.negocioId;
  
  // Si es SUPERADMIN y no tiene negocioId, usar el negocio del tenant actual
  if (!negocioId && req.usuario?.rol === 'SUPERADMIN') {
    negocioId = req.negocio?.id;
  }
  
  return negocioId;
};

// Esquemas de validación
const citaSchema = z.object({
  fecha: z.string(), // ISO string o formato YYYY-MM-DD
  hora: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  duracion: z.number().min(15).max(480).optional().default(60),
  motivo: z.string().min(1, 'El motivo es requerido'),
  clienteId: z.string().min(1, 'El ID del cliente es requerido'),
  estado: z.enum(['PENDIENTE', 'CONFIRMADA', 'RECHAZADA', 'COMPLETADA', 'CANCELADA']).optional(),
  notas: z.string().optional(),
});

const clienteSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  telefono: z.string().optional(),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD').optional(),
  genero: z.string().optional(),
  direccion: z.string().optional(),
});

const recetaSchema = z.object({
  contenido: z.string().min(10, 'El contenido debe tener al menos 10 caracteres'),
  clienteId: z.string(),
  citaId: z.string().optional(),
});

export const obtenerEstadisticas = async (req: Request, res: Response) => {
  try {
    const negocioId = obtenerNegocioId(req);
    
    // Si es SUPERADMIN sin negocio, mostrar estadísticas globales y lista de negocios
    if (!negocioId && req.usuario?.rol === 'SUPERADMIN') {
      const [
        totalNegocios,
        negociosActivos,
        totalUsuarios,
        totalCitasGlobal
      ] = await Promise.all([
        prisma.negocio.count(),
        prisma.negocio.count({ where: { activo: true } }),
        prisma.usuario.count(),
        prisma.cita.count()
      ]);

      // Obtener lista de negocios para que el superadmin pueda seleccionar
      const negocios = await prisma.negocio.findMany({
        select: {
          id: true,
          nombre: true,
          slug: true,
          activo: true,
          suspendido: true,
          createdAt: true,
          _count: {
            select: {
              usuarios: true,
              clientes: true,
              citas: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({
        isSuperadmin: true,
        estadisticasGlobales: {
          totalNegocios,
          negociosActivos,
          totalUsuarios,
          totalCitasGlobal
        },
        negocios
      });
    }
    
    if (!negocioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un negocio' });
    }

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    const [
      totalClientes,
      totalCitas,
      citasHoy,
      citasPendientes,
      ingresosMes,
      documentosPendientes
    ] = await Promise.all([
      prisma.cliente.count({ where: { negocioId } }),
      prisma.cita.count({ where: { negocioId } }),
      prisma.cita.count({
        where: {
          negocioId,
          fecha: {
            gte: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()),
            lt: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1)
          }
        }
      }),
      prisma.cita.count({
        where: {
          negocioId,
          estado: 'PENDIENTE'
        }
      }),
      prisma.pagoCliente.aggregate({
        where: {
          cliente: { negocioId },
          fechaPago: {
            gte: inicioMes,
            lte: finMes
          },
          estado: 'PAGADO'
        },
        _sum: { monto: true }
      }),
      prisma.documento.count({
        where: {
          negocioId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
          }
        }
      })
    ]);

    return res.json({
      totalClientes,
      totalCitas,
      citasHoy,
      citasPendientes,
      ingresosMes: ingresosMes._sum.monto || 0,
      documentosPendientes
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const obtenerCitas = async (req: Request, res: Response) => {
  try {
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un negocio' });
    }

    const { page = 1, limit = 10, estado = '', fecha = '', clienteId = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { negocioId };
    
    if (estado && estado !== 'all') {
      where.estado = estado;
    }

    if (fecha) {
      where.fecha = new Date(fecha as string);
    }

    if (clienteId) {
      where.clienteId = clienteId;
    }

    const [citas, total] = await Promise.all([
      prisma.cita.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { fecha: 'desc' },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true,
              telefono: true
            }
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellido: true
            }
          }
        }
      }),
      prisma.cita.count({ where })
    ]);

    return res.json({
      data: citas,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Error obteniendo citas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const crearCita = async (req: Request, res: Response) => {
  try {
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un negocio' });
    }

    const data = citaSchema.parse(req.body);

    // Verificar que el cliente pertenezca al negocio
    const cliente = await prisma.cliente.findFirst({
      where: {
        id: data.clienteId,
        negocioId
      }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Validar fecha
    const fechaCita = new Date(data.fecha);
    if (isNaN(fechaCita.getTime())) {
      return res.status(400).json({ error: 'Fecha inválida' });
    }

    // Verificar que la fecha no sea en el pasado
    const ahora = new Date();
    const fechaHoraCita = new Date(fechaCita);
    const [horas, minutos] = data.hora.split(':');
    fechaHoraCita.setHours(parseInt(horas), parseInt(minutos), 0, 0);

    if (fechaHoraCita <= ahora) {
      return res.status(400).json({ error: 'No se puede programar una cita en el pasado' });
    }

    const cita = await prisma.cita.create({
      data: {
        fecha: fechaCita,
        hora: data.hora,
        duracion: data.duracion || 60,
        motivo: data.motivo,
        estado: data.estado || 'PENDIENTE',
        notas: data.notas,
        negocioId,
        clienteId: data.clienteId,
        usuarioId: req.usuario?.id
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            telefono: true
          }
        }
      }
    });

    return res.status(201).json(cita);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Datos inválidos', 
        details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`) 
      });
    }
    console.error('Error creando cita:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const actualizarCita = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un negocio' });
    }

    const data = citaSchema.partial().parse(req.body);

    // Verificar que la cita pertenezca al negocio
    const citaExistente = await prisma.cita.findFirst({
      where: {
        id,
        negocioId
      }
    });

    if (!citaExistente) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    const cita = await prisma.cita.update({
      where: { id },
      data,
      include: {
        cliente: true,
        negocio: true
      }
    });

    // Crear notificación para el cliente cuando se reagenda
    if (data.fecha || data.hora) {
      try {
        const mensaje = data.fecha 
          ? `Tu cita ha sido reagendada para el ${new Date(data.fecha).toLocaleDateString('es-ES')} a las ${data.hora || cita.hora}`
          : `Tu cita ha sido reagendada a las ${data.hora}`;

        const notificacion = await prisma.notificacion.create({
          data: {
            clienteId: cita.clienteId,
            tipo: 'CITA_REAGENDADA',
            destinatario: cita.cliente.email || cita.cliente.telefono || '',
            asunto: 'Cita Reagendada',
            contenido: mensaje,
            leida: false,
            esNotificacionCliente: true,
            enviado: false,
            negocioId: cita.negocioId
          }
        });
      } catch (notificationError) {
        console.error('Error creando notificación:', notificationError);
        // No fallar la actualización de la cita por un error de notificación
      }
    }

    return res.json(cita);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Error actualizando cita:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const eliminarCita = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un negocio' });
    }

    // Verificar que la cita pertenezca al negocio
    const cita = await prisma.cita.findFirst({
      where: {
        id,
        negocioId
      }
    });

    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    await prisma.cita.delete({
      where: { id }
    });

    return res.json({ message: 'Cita eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando cita:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const obtenerClientes = async (req: Request, res: Response) => {
  try {
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un negocio' });
    }

    const { page = 1, limit = 10, search = '', activo } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { negocioId };
    
    if (search) {
      where.OR = [
        { nombre: { contains: search as string, mode: Prisma.QueryMode.insensitive } },
        { apellido: { contains: search as string, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: search as string, mode: Prisma.QueryMode.insensitive } }
      ];
    }

    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              citas: true,
              documentos: true,
              recetas: true
            }
          }
        }
      }),
      prisma.cliente.count({ where })
    ]);

    return res.json({
      data: clientes,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const crearCliente = async (req: Request, res: Response) => {
  try {
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un negocio' });
    }

    const data = clienteSchema.parse(req.body);

    // Convertir fechaNacimiento de string a Date si está presente
    const clienteData: any = {
      ...data,
      negocioId,
      activo: true
    };

    if (data.fechaNacimiento) {
      try {
        clienteData.fechaNacimiento = parseDateOnly(data.fechaNacimiento);
      } catch (error) {
        return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
      }
    }

    const cliente = await prisma.cliente.create({
      data: clienteData
    });

    return res.status(201).json(cliente);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Error creando cliente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const actualizarCliente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un negocio' });
    }

    const data = clienteSchema.partial().parse(req.body);

    // Convertir fechaNacimiento de string a Date si está presente
    const updateData: any = { ...data };
    if (data.fechaNacimiento) {
      try {
        updateData.fechaNacimiento = parseDateOnly(data.fechaNacimiento);
      } catch (error) {
        return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
      }
    }

    // Verificar que el cliente pertenezca al negocio
    const clienteExistente = await prisma.cliente.findFirst({
      where: {
        id,
        negocioId
      }
    });

    if (!clienteExistente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: updateData
    });

    return res.json(cliente);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Error actualizando cliente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const eliminarCliente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un negocio' });
    }

    // Verificar que el cliente pertenezca al negocio
    const cliente = await prisma.cliente.findFirst({
      where: {
        id,
        negocioId
      }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    await prisma.cliente.delete({
      where: { id }
    });

    return res.json({ message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const obtenerDocumentos = async (req: Request, res: Response) => {
  try {
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un negocio' });
    }

    const { page = 1, limit = 10, clienteId = '', tipo = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { negocioId };
    
    if (clienteId) {
      where.clienteId = clienteId;
    }

    if (tipo) {
      where.tipo = tipo;
    }

    const [documentos, total] = await Promise.all([
      prisma.documento.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              apellido: true
            }
          }
        }
      }),
      prisma.documento.count({ where })
    ]);

    return res.json({
      data: documentos,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Error obteniendo documentos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const obtenerRecetas = async (req: Request, res: Response) => {
  try {
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un negocio' });
    }

    const { page = 1, limit = 10, clienteId = '', citaId = '' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { negocioId };
    
    if (clienteId) {
      where.clienteId = clienteId;
    }

    if (citaId) {
      where.citaId = citaId;
    }

    const [recetas, total] = await Promise.all([
      prisma.receta.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              apellido: true
            }
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellido: true
            }
          }
        }
      }),
      prisma.receta.count({ where })
    ]);

    return res.json({
      data: recetas,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Error obteniendo recetas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const crearReceta = async (req: Request, res: Response) => {
  try {
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un negocio' });
    }

    const data = recetaSchema.parse(req.body);

    // Verificar que el cliente pertenezca al negocio
    const cliente = await prisma.cliente.findFirst({
      where: {
        id: data.clienteId,
        negocioId
      }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const receta = await prisma.receta.create({
      data: {
        contenido: data.contenido,
        clienteId: data.clienteId,
        citaId: data.citaId && data.citaId.trim() !== '' ? data.citaId : null,
        negocioId,
        usuarioId: req.usuario?.id || ''
      },
      include: {
        cliente: true,
        usuario: true
      }
    });

    return res.status(201).json(receta);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Error creando receta:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const actualizarReceta = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un negocio' });
    }

    const data = recetaSchema.partial().parse(req.body);

    // Verificar que la receta pertenezca al negocio
    const recetaExistente = await prisma.receta.findFirst({
      where: {
        id,
        negocioId
      }
    });

    if (!recetaExistente) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    // Preparar los datos para actualizar, filtrando campos problemáticos
    const updateData: any = {};
    
    if (data.contenido !== undefined) {
      updateData.contenido = data.contenido;
    }
    
    // Solo actualizar citaId si se proporciona y es válido
    if (data.citaId !== undefined) {
      // Si citaId es una cadena vacía, establecer como null
      if (data.citaId === '' || data.citaId === null) {
        updateData.citaId = null;
      } else {
        // Verificar que la cita existe y pertenece al negocio
        const citaExiste = await prisma.cita.findFirst({
          where: {
            id: data.citaId,
            negocioId,
            clienteId: recetaExistente.clienteId
          }
        });
        
        if (citaExiste) {
          updateData.citaId = data.citaId;
        } else {
          return res.status(400).json({ error: 'Cita no encontrada o no pertenece al cliente' });
        }
      }
    }

    const receta = await prisma.receta.update({
      where: { id },
      data: updateData,
      include: {
        cliente: true,
        usuario: true
      }
    });

    return res.json(receta);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Error actualizando receta:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const eliminarReceta = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un negocio' });
    }

    // Verificar que la receta pertenezca al negocio
    const receta = await prisma.receta.findFirst({
      where: {
        id,
        negocioId
      }
    });

    if (!receta) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    await prisma.receta.delete({
      where: { id }
    });

    return res.json({ message: 'Receta eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando receta:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const obtenerExpediente = async (req: Request, res: Response) => {
  try {
    const { clienteId } = req.params;
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un negocio' });
    }

    // Verificar que el cliente pertenezca al negocio
    const cliente = await prisma.cliente.findFirst({
      where: {
        id: clienteId,
        negocioId
      }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const [citas, documentos, recetas, pagos] = await Promise.all([
      prisma.cita.findMany({
        where: { clienteId, negocioId },
        orderBy: { fecha: 'desc' },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellido: true
            }
          }
        }
      }),
      prisma.documento.findMany({
        where: { clienteId, negocioId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.receta.findMany({
        where: { clienteId, negocioId },
        orderBy: { createdAt: 'desc' },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellido: true
            }
          }
        }
      }),
      prisma.pagoCliente.findMany({
        where: { clienteId },
        orderBy: { createdAt: 'desc' },
        include: {
          cita: true
        }
      })
    ]);

    return res.json({
      cliente,
      citas,
      documentos,
      recetas,
      pagos
    });
  } catch (error) {
    console.error('Error obteniendo expediente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const buscarClientes = async (req: Request, res: Response) => {
  try {
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(400).json({ error: 'Usuario no asociado a un negocio' });
    }

    const { search = '' } = req.query;
    
    // Reducir el mínimo a 2 caracteres para buscar más rápido
    if (!search || (search as string).length < 2) {
      return res.json([]);
    }

    const searchTerm = (search as string).trim();
    
    // Normalizar el texto de búsqueda: eliminar acentos y caracteres especiales
    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/[^a-z0-9\s]/g, ''); // Eliminar caracteres especiales
    };

    const normalizedSearch = normalizeText(searchTerm);
    
    // Dividir en palabras para búsqueda por partes
    const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length > 0);

    // Construir condiciones de búsqueda más flexibles
    const searchConditions = [];

    // Búsqueda exacta (prioridad alta)
    searchConditions.push({
      OR: [
        { nombre: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
        { apellido: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
        { telefono: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } }
      ]
    });

    // Búsqueda por palabras individuales
    if (searchWords.length > 1) {
      searchWords.forEach(word => {
        if (word.length >= 2) {
          searchConditions.push({
            OR: [
              { nombre: { contains: word, mode: Prisma.QueryMode.insensitive } },
              { apellido: { contains: word, mode: Prisma.QueryMode.insensitive } }
            ]
          });
        }
      });
    }

    // Búsqueda con wildcards para nombres cortos
    if (searchTerm.length >= 2 && searchTerm.length <= 4) {
      searchConditions.push({
        OR: [
          { nombre: { startsWith: searchTerm, mode: Prisma.QueryMode.insensitive } },
          { apellido: { startsWith: searchTerm, mode: Prisma.QueryMode.insensitive } }
        ]
      });
    }

    const clientes = await prisma.cliente.findMany({
      where: {
        negocioId,
        activo: true,
        OR: searchConditions
      },
      take: 15, // Aumentar resultados para mostrar más opciones
      orderBy: [
        { nombre: 'asc' },
        { apellido: 'asc' }
      ],
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        telefono: true
      }
    });

    // Ordenar resultados por relevancia
    const scoredClientes = clientes.map(cliente => {
      let score = 0;
      const fullName = `${cliente.nombre} ${cliente.apellido || ''}`.toLowerCase();
      const normalizedFullName = normalizeText(fullName);
      
      // Coincidencia exacta del nombre completo (mayor puntaje)
      if (normalizedFullName.includes(normalizedSearch)) {
        score += 100;
      }
      
      // Coincidencia al inicio del nombre
      if (cliente.nombre.toLowerCase().startsWith(searchTerm.toLowerCase())) {
        score += 50;
      }
      
      // Coincidencia al inicio del apellido
      if (cliente.apellido?.toLowerCase().startsWith(searchTerm.toLowerCase())) {
        score += 40;
      }
      
      // Coincidencia parcial en nombre
      if (cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase())) {
        score += 30;
      }
      
      // Coincidencia parcial en apellido
      if (cliente.apellido?.toLowerCase().includes(searchTerm.toLowerCase())) {
        score += 25;
      }

      // Coincidencia por palabras individuales
      searchWords.forEach(word => {
        if (cliente.nombre.toLowerCase().includes(word)) score += 10;
        if (cliente.apellido?.toLowerCase().includes(word)) score += 10;
      });

      return { ...cliente, score };
    });

    // Ordenar por relevancia y devolver sin el score
    const sortedClientes = scoredClientes
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...cliente }) => cliente);

    return res.json(sortedClientes);
  } catch (error) {
    console.error('Error buscando clientes:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Gestión de Pagos de Cliente
export const getPagosCliente = async (req: Request, res: Response) => {
  try {
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(403).json({ error: 'No tiene permisos para acceder a este negocio' });
    }
    const {
      page = 1,
      limit = 10,
      estado,
      metodo,
      clienteId,
      citaId
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {
      cliente: { negocioId }
    };

    if (estado) where.estado = estado;
    if (metodo) where.metodo = metodo;
    if (clienteId) where.clienteId = clienteId;
    if (citaId) where.citaId = citaId;

    const [pagos, total] = await Promise.all([
      prisma.pagoCliente.findMany({
        where,
        skip,
        take,
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              apellido: true
            }
          },
          cita: {
            select: {
              id: true,
              fecha: true,
              hora: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.pagoCliente.count({ where })
    ]);

    const totalPages = Math.ceil(total / take);

    return res.json({
      data: pagos,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error obteniendo pagos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const createPagoCliente = async (req: Request, res: Response) => {
  try {
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(403).json({ error: 'No tiene permisos para acceder a este negocio' });
    }
    const {
      clienteId,
      citaId,
      monto,
      concepto,
      metodo = 'EFECTIVO',
      estado = 'PENDIENTE',
      referencia,
      fechaPago
    } = req.body;

    // Validar que el cliente pertenece al negocio
    const cliente = await prisma.cliente.findFirst({
      where: {
        id: clienteId,
        negocioId
      }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Si se especifica una cita, validar que existe y pertenece al cliente
    if (citaId) {
      const cita = await prisma.cita.findFirst({
        where: {
          id: citaId,
          clienteId,
          negocioId
        }
      });

      if (!cita) {
        return res.status(404).json({ error: 'Cita no encontrada' });
      }
    }

    const pagoData: any = {
      clienteId,
      monto: Number(monto),
      concepto,
      metodo,
      estado,
      moneda: 'MXN'
    };

    if (citaId) pagoData.citaId = citaId;
    if (referencia) pagoData.referencia = referencia;
    if (fechaPago && estado === 'PAGADO') pagoData.fechaPago = new Date(fechaPago);

    const pago = await prisma.pagoCliente.create({
      data: pagoData,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        },
        cita: {
          select: {
            id: true,
            fecha: true,
            hora: true
          }
        }
      }
    });

    return res.status(201).json(pago);
  } catch (error) {
    console.error('Error creando pago:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const updatePagoCliente = async (req: Request, res: Response) => {
  try {
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(403).json({ error: 'No tiene permisos para acceder a este negocio' });
    }
    const { id } = req.params;
    const updates = req.body;

    // Verificar que el pago pertenece al negocio
    const pagoExistente = await prisma.pagoCliente.findFirst({
      where: {
        id,
        cliente: { negocioId }
      }
    });

    if (!pagoExistente) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const pago = await prisma.pagoCliente.update({
      where: { id },
      data: {
        ...updates,
        monto: updates.monto ? Number(updates.monto) : undefined,
        fechaPago: updates.fechaPago ? new Date(updates.fechaPago) : undefined
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        },
        cita: {
          select: {
            id: true,
            fecha: true,
            hora: true
          }
        }
      }
    });

    return res.json(pago);
  } catch (error) {
    console.error('Error actualizando pago:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const deletePagoCliente = async (req: Request, res: Response) => {
  try {
    const negocioId = obtenerNegocioId(req);
    if (!negocioId) {
      return res.status(403).json({ error: 'No tiene permisos para acceder a este negocio' });
    }
    const { id } = req.params;

    // Verificar que el pago pertenece al negocio
    const pagoExistente = await prisma.pagoCliente.findFirst({
      where: {
        id,
        cliente: { negocioId }
      }
    });

    if (!pagoExistente) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    await prisma.pagoCliente.delete({
      where: { id }
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Error eliminando pago:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Función para que superadmin obtengan estadísticas de un negocio específico
export const obtenerEstadisticasNegocio = async (req: Request, res: Response) => {
  try {
    const { negocioId } = req.params;
    
    // Solo superadmin pueden usar esta función
    if (req.usuario?.rol !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Acceso denegado. Solo superadmin pueden ver estadísticas de otros negocios' });
    }

    if (!negocioId) {
      return res.status(400).json({ error: 'ID de negocio requerido' });
    }

    // Verificar que el negocio existe
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: {
        id: true,
        nombre: true,
        slug: true,
        activo: true,
        suspendido: true
      }
    });

    if (!negocio) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    const [
      totalClientes,
      totalCitas,
      citasHoy,
      citasPendientes,
      ingresosMes,
      documentosPendientes
    ] = await Promise.all([
      prisma.cliente.count({ where: { negocioId } }),
      prisma.cita.count({ where: { negocioId } }),
      prisma.cita.count({
        where: {
          negocioId,
          fecha: {
            gte: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()),
            lt: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1)
          }
        }
      }),
      prisma.cita.count({
        where: {
          negocioId,
          estado: 'PENDIENTE'
        }
      }),
      prisma.pagoCliente.aggregate({
        where: {
          cliente: { negocioId },
          fechaPago: {
            gte: inicioMes,
            lte: finMes
          },
          estado: 'PAGADO'
        },
        _sum: { monto: true }
      }),
      prisma.documento.count({
        where: {
          negocioId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
          }
        }
      })
    ]);

    return res.json({
      negocio,
      totalClientes,
      totalCitas,
      citasHoy,
      citasPendientes,
      ingresosMes: ingresosMes._sum.monto || 0,
      documentosPendientes
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas del negocio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

