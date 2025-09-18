import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Función para convertir fecha YYYY-MM-DD a Date sin problemas de zona horaria
const parseDateOnly = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month - 1 porque Date usa meses 0-indexados
};

// Esquemas de validación
const crearClienteSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  telefono: z.string().optional(),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD').optional(),
  genero: z.string().optional(),
  direccion: z.string().optional()
});

const actualizarClienteSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  apellido: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  telefono: z.string().optional(),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD').optional(),
  genero: z.string().optional(),
  direccion: z.string().optional(),
  activo: z.boolean().optional()
});

export const crearCliente = async (req: Request, res: Response) => {
  try {
    const datos = crearClienteSchema.parse(req.body);

    if (!req.negocio) {
      return res.status(400).json({ error: 'Negocio no identificado' });
    }

    // Verificar si ya existe un cliente con el mismo email en el negocio
    if (datos.email) {
      const clienteExistente = await prisma.cliente.findFirst({
        where: {
          email: datos.email,
          negocioId: req.negocio.id
        }
      });

      if (clienteExistente) {
        return res.status(400).json({ error: 'Ya existe un cliente con ese email' });
      }
    }

    // Crear el cliente
    const cliente = await prisma.cliente.create({
      data: {
        ...datos,
        fechaNacimiento: datos.fechaNacimiento ? parseDateOnly(datos.fechaNacimiento) : null,
        negocioId: req.negocio.id
      }
    });

    res.status(201).json({
      message: 'Cliente creado exitosamente',
      cliente
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error creando cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const obtenerClientes = async (req: Request, res: Response) => {
  try {
    if (!req.negocio) {
      return res.status(400).json({ error: 'Negocio no identificado' });
    }

    const { 
      search, 
      activo, 
      page = '1', 
      limit = '10' 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const where: any = {
      negocioId: req.negocio.id
    };

    if (search) {
      where.OR = [
        { nombre: { contains: search as string, mode: 'insensitive' } },
        { apellido: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { telefono: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    // Obtener clientes con paginación
    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        orderBy: [
          { nombre: 'asc' },
          { apellido: 'asc' }
        ],
        skip,
        take: limitNum,
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

    res.json({
      clientes,
      paginacion: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const obtenerCliente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.negocio) {
      return res.status(400).json({ error: 'Negocio no identificado' });
    }

    const cliente = await prisma.cliente.findFirst({
      where: {
        id,
        negocioId: req.negocio.id
      },
      include: {
        citas: {
          orderBy: {
            fecha: 'desc'
          },
          take: 10,
          include: {
            usuario: {
              select: {
                nombre: true,
                apellido: true
              }
            }
          }
        },
        documentos: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        recetas: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10,
          include: {
            usuario: {
              select: {
                nombre: true,
                apellido: true
              }
            }
          }
        },
        pagosCliente: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        _count: {
          select: {
            citas: true,
            documentos: true,
            recetas: true,
            pagosCliente: true
          }
        }
      }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ cliente });
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};



export const obtenerEstadisticasCliente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.negocio) {
      return res.status(400).json({ error: 'Negocio no identificado' });
    }

    // Verificar que el cliente existe y pertenece al negocio
    const cliente = await prisma.cliente.findFirst({
      where: {
        id,
        negocioId: req.negocio.id
      }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Obtener estadísticas
    const [estadisticasCitas, estadisticasPagos, ultimaCita, proximaCita] = await Promise.all([
      // Estadísticas de citas por estado
      prisma.cita.groupBy({
        by: ['estado'],
        where: { clienteId: id },
        _count: { id: true }
      }),
      // Estadísticas de pagos por estado
      prisma.pagoCliente.groupBy({
        by: ['estado'],
        where: { clienteId: id },
        _count: { id: true },
        _sum: { monto: true }
      }),
      // Última cita
      prisma.cita.findFirst({
        where: { clienteId: id },
        orderBy: { fecha: 'desc' },
        include: {
          usuario: {
            select: {
              nombre: true,
              apellido: true
            }
          }
        }
      }),
      // Próxima cita
      prisma.cita.findFirst({
        where: {
          clienteId: id,
          fecha: {
            gte: new Date()
          },
          estado: {
            in: ['PENDIENTE', 'CONFIRMADA']
          }
        },
        orderBy: { fecha: 'asc' },
        include: {
          usuario: {
            select: {
              nombre: true,
              apellido: true
            }
          }
        }
      })
    ]);

    res.json({
      estadisticas: {
        citas: estadisticasCitas,
        pagos: estadisticasPagos,
        ultimaCita,
        proximaCita
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas del cliente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};