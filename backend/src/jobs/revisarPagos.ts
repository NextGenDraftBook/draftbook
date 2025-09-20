import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Función para ejecutar revisión manual de pagos
 * Revisa y actualiza el estado de los pagos del sistema
 */
export const ejecutarRevisionManual = async (): Promise<void> => {
  try {
    console.log('🔍 Iniciando revisión manual de pagos...');

    // Obtener pagos pendientes que ya vencieron
    const ahora = new Date();
    const pagosVencidos = await prisma.pagoSistema.findMany({
      where: {
        estado: 'PENDIENTE',
        fechaFin: {
          lt: ahora
        }
      }
    });

    console.log(`📋 Encontrados ${pagosVencidos.length} pagos vencidos`);

    // Actualizar pagos vencidos
    if (pagosVencidos.length > 0) {
      await prisma.pagoSistema.updateMany({
        where: {
          id: {
            in: pagosVencidos.map(p => p.id)
          }
        },
        data: {
          estado: 'VENCIDO'
        }
      });

      console.log(`✅ Actualizados ${pagosVencidos.length} pagos a estado VENCIDO`);
    }

    // Obtener negocios con pagos vencidos para posible suspensión
    const negociosConPagosVencidos = await prisma.negocio.findMany({
      where: {
        pagosSistema: {
          some: {
            estado: 'VENCIDO'
          }
        },
        suspendido: false
      },
      include: {
        pagosSistema: {
          where: {
            estado: 'VENCIDO'
          },
          orderBy: {
            fechaFin: 'desc'
          }
        }
      }
    });

    // Suspender negocios con pagos vencidos por más de 7 días
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 7);

    for (const negocio of negociosConPagosVencidos) {
      const pagoMasReciente = negocio.pagosSistema[0];
      if (pagoMasReciente && pagoMasReciente.fechaFin < fechaLimite) {
        await prisma.negocio.update({
          where: { id: negocio.id },
          data: {
            suspendido: true
          }
        });

        console.log(`⚠️ Negocio ${negocio.nombre} (${negocio.slug}) suspendido por pagos vencidos`);
      }
    }

    // Generar estadísticas de la revisión
    const estadisticas = await prisma.pagoSistema.groupBy({
      by: ['estado'],
      _count: {
        id: true
      }
    });

    console.log('📊 Estadísticas de pagos:');
    estadisticas.forEach(stat => {
      console.log(`   ${stat.estado}: ${stat._count.id} pagos`);
    });

    console.log('✅ Revisión manual de pagos completada exitosamente');

  } catch (error) {
    console.error('❌ Error en revisión manual de pagos:', error);
    throw error;
  }
};

/**
 * Función para obtener resumen de pagos
 */
export const obtenerResumenPagos = async () => {
  try {
    const resumen = await prisma.pagoSistema.groupBy({
      by: ['estado'],
      _count: {
        id: true
      },
      _sum: {
        monto: true
      }
    });

    return resumen;
  } catch (error) {
    console.error('Error obteniendo resumen de pagos:', error);
    throw error;
  }
};