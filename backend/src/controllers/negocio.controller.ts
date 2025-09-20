import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Esquemas de validación
const actualizarNegocioSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional()
});

export const obtenerDashboard = async (req: Request, res: Response) => {
  try {
    if (!req.negocio) {
      return res.status(400).json({ error: 'Negocio no identificado' });
    }

    const negocioId = req.negocio.id;

    // Obtener estadísticas del dashboard
    const [
      totalClientes,
      citasHoy,
      citasPendientes,
      citasConfirmadas,
      citasCompletadas,
      totalRecetas,
      totalDocumentos,
      ultimasCitas,
      proximasCitas,
      pagoVigente
    ] = await Promise.all([
      // Total de clientes
      prisma.cliente.count({
        where: { negocioId, activo: true }
      }),
      // Citas de hoy
      prisma.cita.count({
        where: {
          negocioId,
          fecha: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      }),
      // Citas pendientes
      prisma.cita.count({
        where: {
          negocioId,
          estado: 'PENDIENTE'
        }
      }),
      // Citas confirmadas
      prisma.cita.count({
        where: {
          negocioId,
          estado: 'CONFIRMADA'
        }
      }),
      // Citas completadas (últimos 30 días)
      prisma.cita.count({
        where: {
          negocioId,
          estado: 'COMPLETADA',
          fecha: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      // Total de recetas
      prisma.receta.count({
        where: { negocioId }
      }),
      // Total de documentos
      prisma.documento.count({
        where: { negocioId }
      }),
      // Últimas 5 citas
      prisma.cita.findMany({
        where: { negocioId },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              apellido: true
            }
          }
        },
        orderBy: { fecha: 'desc' },
        take: 5
      }),
      // Próximas 5 citas
      prisma.cita.findMany({
        where: {
          negocioId,
          fecha: {
            gte: new Date()
          },
          estado: {
            in: ['PENDIENTE', 'CONFIRMADA']
          }
        },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              apellido: true
            }
          }
        },
        orderBy: { fecha: 'asc' },
        take: 5
      }),
      // Pago vigente
      prisma.pagoSistema.findFirst({
        where: {
          negocioId,
          estado: 'PAGADO',
          fechaFin: {
            gte: new Date()
          }
        },
        orderBy: { fechaFin: 'desc' }
      })
    ]);

    // Calcular estadísticas adicionales
    const citasPorEstado = await prisma.cita.groupBy({
      by: ['estado'],
      where: { negocioId },
      _count: { id: true }
    });

    const citasPorMes = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', fecha) as mes,
        COUNT(*) as total_citas,
        COUNT(CASE WHEN estado = 'COMPLETADA' THEN 1 END) as citas_completadas
      FROM citas
      WHERE "negocioId" = ${negocioId}
        AND fecha >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', fecha)
      ORDER BY mes DESC
    `;

    res.json({
      estadisticas: {
        totalClientes,
        citasHoy,
        citasPendientes,
        citasConfirmadas,
        citasCompletadas,
        totalRecetas,
        totalDocumentos
      },
      citasPorEstado,
      citasPorMes,
      ultimasCitas,
      proximasCitas,
      pagoVigente: pagoVigente ? {
        ...pagoVigente,
        diasRestantes: Math.ceil((new Date(pagoVigente.fechaFin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      } : null
    });
  } catch (error) {
    console.error('Error obteniendo dashboard:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const obtenerPerfilNegocio = async (req: Request, res: Response) => {
  try {
    if (!req.negocio) {
      return res.status(400).json({ error: 'Negocio no identificado' });
    }

    const negocio = await prisma.negocio.findUnique({
      where: { id: req.negocio.id },
      include: {
        usuarios: {
          where: { activo: true },
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            rol: true
          }
        },
        pagosSistema: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!negocio) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    res.json({ negocio });
  } catch (error) {
    console.error('Error obteniendo perfil del negocio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const actualizarPerfilNegocio = async (req: Request, res: Response) => {
  try {
    const datos = actualizarNegocioSchema.parse(req.body);

    if (!req.negocio) {
      return res.status(400).json({ error: 'Negocio no identificado' });
    }

    // Verificar si el email ya está en uso por otro negocio
    if (datos.email && datos.email !== req.negocio.email) {
      const emailEnUso = await prisma.negocio.findFirst({
        where: {
          email: datos.email,
          id: {
            not: req.negocio.id
          }
        }
      });

      if (emailEnUso) {
        return res.status(400).json({ error: 'Ya existe otro negocio con ese email' });
      }
    }

    // Actualizar el negocio
    const negocio = await prisma.negocio.update({
      where: { id: req.negocio.id },
      data: datos
    });

    res.json({
      message: 'Perfil actualizado exitosamente',
      negocio
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error('Error actualizando perfil del negocio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const obtenerEstadisticasAvanzadas = async (req: Request, res: Response) => {
  try {
    if (!req.negocio) {
      return res.status(400).json({ error: 'Negocio no identificado' });
    }

    const { fechaInicio, fechaFin } = req.query;
    const negocioId = req.negocio.id;

    const where: any = { negocioId };
    if (fechaInicio || fechaFin) {
      where.fecha = {};
      if (fechaInicio) {
        where.fecha.gte = new Date(fechaInicio as string);
      }
      if (fechaFin) {
        where.fecha.lte = new Date(fechaFin as string);
      }
    }

    // Estadísticas de citas por día de la semana
    const citasPorDiaSemana = await prisma.$queryRaw`
      SELECT 
        EXTRACT(DOW FROM fecha) as dia_semana,
        COUNT(*) as total_citas,
        COUNT(CASE WHEN estado = 'COMPLETADA' THEN 1 END) as citas_completadas
      FROM citas
      WHERE "negocioId" = ${negocioId}
        ${fechaInicio ? `AND fecha >= ${new Date(fechaInicio as string)}` : ''}
        ${fechaFin ? `AND fecha <= ${new Date(fechaFin as string)}` : ''}
      GROUP BY EXTRACT(DOW FROM fecha)
      ORDER BY dia_semana
    `;

    // Estadísticas de clientes nuevos por mes
    const clientesNuevosPorMes = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as mes,
        COUNT(*) as clientes_nuevos
      FROM clientes
      WHERE "negocioId" = ${negocioId}
        ${fechaInicio ? `AND "createdAt" >= ${new Date(fechaInicio as string)}` : ''}
        ${fechaFin ? `AND "createdAt" <= ${new Date(fechaFin as string)}` : ''}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY mes DESC
    `;

    // Top 5 clientes más frecuentes
    const topClientes = await prisma.cita.groupBy({
      by: ['clienteId'],
      where,
      _count: { id: true },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    });

    // Obtener información de los clientes top
    const clientesTop = await Promise.all(
      topClientes.map(async (cita: { clienteId: string; _count: { id: number } }) => {
        const cliente = await prisma.cliente.findUnique({
          where: { id: cita.clienteId },
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true
          }
        });
        return {
          cliente,
          totalCitas: cita._count.id
        };
      })
    );

    // Estadísticas de duración promedio de citas
    const duracionPromedio = await prisma.cita.aggregate({
      where: {
        ...where,
        estado: 'COMPLETADA'
      },
      _avg: { duracion: true }
    });

    res.json({
      citasPorDiaSemana,
      clientesNuevosPorMes,
      topClientes: clientesTop,
      duracionPromedio: duracionPromedio._avg.duracion || 0
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas avanzadas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const obtenerReporteMensual = async (req: Request, res: Response) => {
  try {
    if (!req.negocio) {
      return res.status(400).json({ error: 'Negocio no identificado' });
    }

    const { mes, año } = req.query;
    const negocioId = req.negocio.id;

    const fechaInicio = new Date(parseInt(año as string), parseInt(mes as string) - 1, 1);
    const fechaFin = new Date(parseInt(año as string), parseInt(mes as string), 0);

    // Estadísticas del mes
    const [
      totalCitas,
      citasCompletadas,
      citasCanceladas,
      clientesNuevos,
      totalRecetas,
      totalDocumentos
    ] = await Promise.all([
      prisma.cita.count({
        where: {
          negocioId,
          fecha: {
            gte: fechaInicio,
            lte: fechaFin
          }
        }
      }),
      prisma.cita.count({
        where: {
          negocioId,
          estado: 'COMPLETADA',
          fecha: {
            gte: fechaInicio,
            lte: fechaFin
          }
        }
      }),
      prisma.cita.count({
        where: {
          negocioId,
          estado: 'CANCELADA',
          fecha: {
            gte: fechaInicio,
            lte: fechaFin
          }
        }
      }),
      prisma.cliente.count({
        where: {
          negocioId,
          createdAt: {
            gte: fechaInicio,
            lte: fechaFin
          }
        }
      }),
      prisma.receta.count({
        where: {
          negocioId,
          createdAt: {
            gte: fechaInicio,
            lte: fechaFin
          }
        }
      }),
      prisma.documento.count({
        where: {
          negocioId,
          createdAt: {
            gte: fechaInicio,
            lte: fechaFin
          }
        }
      })
    ]);

    // Citas por día del mes
    const citasPorDia = await prisma.$queryRaw`
      SELECT 
        EXTRACT(DAY FROM fecha) as dia,
        COUNT(*) as total_citas,
        COUNT(CASE WHEN estado = 'COMPLETADA' THEN 1 END) as citas_completadas,
        COUNT(CASE WHEN estado = 'CANCELADA' THEN 1 END) as citas_canceladas
      FROM citas
      WHERE "negocioId" = ${negocioId}
        AND fecha >= ${fechaInicio}
        AND fecha <= ${fechaFin}
      GROUP BY EXTRACT(DAY FROM fecha)
      ORDER BY dia
    `;

    res.json({
      periodo: {
        mes: parseInt(mes as string),
        año: parseInt(año as string),
        fechaInicio,
        fechaFin
      },
      resumen: {
        totalCitas,
        citasCompletadas,
        citasCanceladas,
        clientesNuevos,
        totalRecetas,
        totalDocumentos
      },
      citasPorDia
    });
  } catch (error) {
    console.error('Error obteniendo reporte mensual:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Función para que los clientes obtengan información del consultorio
export const obtenerInfoConsultorio = async (req: Request, res: Response) => {
  try {
    if (!req.usuario || req.usuario.rol !== 'CLIENTE') {
      return res.status(403).json({ error: 'Acceso denegado. Solo clientes pueden acceder a esta función.' });
    }

    // Buscar el cliente en la tabla Cliente usando el email del usuario
    const cliente = await prisma.cliente.findFirst({
      where: {
        email: req.usuario.email
      },
      include: {
        negocio: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            direccion: true,
            ciudad: true,
            estado: true,
            codigoPostal: true,
            descripcion: true,
            especialidad: true,
            horarioAtencion: true,
            sitioWeb: true
          }
        }
      }
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    return res.json(cliente.negocio);
  } catch (error) {
    console.error('Error obteniendo información del consultorio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};