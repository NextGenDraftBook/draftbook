import { Request, Response } from 'express';
import { z } from 'zod';
import { reportesService } from '../services/reportes.service';
import { format } from 'date-fns';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Esquema de validación para generar reporte
const generarReporteSchema = z.object({
  doctorId: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  incluirCitasCompletadas: z.boolean().default(true),
  incluirExpedientes: z.boolean().default(false),
});

interface AuthenticatedRequest extends Request {
  negocio?: { 
    id: string; 
    slug: string; 
    nombre: string; 
    email: string; 
    activo: boolean; 
    suspendido: boolean; 
  };
  usuario?: { 
    id: string; 
    email: string; 
    rol: string; 
    negocioId?: string; 
  };
}

export const generarReportePacientes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const datos = generarReporteSchema.parse(req.body);

    if (!req.negocio) {
      return res.status(400).json({ error: 'Negocio no identificado' });
    }

    // Si no se especifica doctor, usar el usuario actual (si es admin)
    const doctorId = datos.doctorId || req.usuario?.id;

    if (!doctorId) {
      return res.status(400).json({ error: 'Doctor no especificado' });
    }

    // Verificar que el doctor pertenece al negocio
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { negocioId: true },
    });
    if (!doctor || doctor.negocioId !== req.negocio.id) {
      return res.status(403).json({ error: 'No tienes permisos para generar este reporte para el doctor especificado' });
    }

    const config = {
      doctorId,
      negocioId: req.negocio.id,
      fechaInicio: datos.fechaInicio ? new Date(datos.fechaInicio) : undefined,
      fechaFin: datos.fechaFin ? new Date(datos.fechaFin) : undefined,
      incluirCitasCompletadas: datos.incluirCitasCompletadas ?? true,
      incluirExpedientes: datos.incluirExpedientes ?? false,
    };

    // Generar PDF
    const pdfBuffer = await reportesService.generarReportePacientesDoctor(config);

    // Configurar headers para descarga
    const fileName = `reporte-pacientes-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': pdfBuffer.length.toString(),
    });

    res.send(pdfBuffer);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Datos de entrada inválidos',
        details: error.issues 
      });
    }
    
    console.error('Error generando reporte:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const obtenerDoctoresParaReporte = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.negocio) {
      return res.status(400).json({ error: 'Negocio no identificado' });
    }

    // Obtener doctores del negocio que tienen pacientes con citas
    const doctores = await prisma.usuario.findMany({
      where: {
        negocioId: req.negocio.id,
        rol: 'ADMIN',
        activo: true,
        citas: {
          some: {}
        }
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        _count: {
          select: {
            citas: true
          }
        }
      },
      orderBy: [
        { nombre: 'asc' },
        { apellido: 'asc' }
      ]
    });

    res.json({ doctores });
  } catch (error) {
    console.error('Error obteniendo doctores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};