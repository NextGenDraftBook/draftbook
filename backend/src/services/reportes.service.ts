import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const prisma = new PrismaClient();

interface ReporteConfig {
  doctorId: string;
  negocioId: string;
  fechaInicio?: Date;
  fechaFin?: Date;
  incluirCitasCompletadas?: boolean;
  incluirExpedientes?: boolean;
}

export class ReportesService {
  async generarReportePacientesDoctor(config: ReporteConfig): Promise<Buffer> {
    // Obtener datos del doctor
    const doctor = await prisma.usuario.findUnique({
      where: { id: config.doctorId },
      include: {
        negocio: true
      }
    });

    if (!doctor) {
      throw new Error('Doctor no encontrado');
    }

    // Obtener pacientes asociados al doctor a través de citas
    const pacientes = await prisma.cliente.findMany({
      where: {
        negocioId: config.negocioId,
        citas: {
          some: {
            usuarioId: config.doctorId,
            ...(config.fechaInicio && config.fechaFin && {
              fecha: {
                gte: config.fechaInicio,
                lte: config.fechaFin
              }
            })
          }
        }
      },
      include: {
        citas: {
          where: {
            usuarioId: config.doctorId,
            ...(config.incluirCitasCompletadas && {
              estado: 'COMPLETADA'
            }),
            ...(config.fechaInicio && config.fechaFin && {
              fecha: {
                gte: config.fechaInicio,
                lte: config.fechaFin
              }
            })
          },
          orderBy: { fecha: 'desc' },
          take: 10
        },
        _count: {
          select: {
            citas: {
              where: {
                usuarioId: config.doctorId
              }
            }
          }
        }
      },
      orderBy: [
        { nombre: 'asc' },
        { apellido: 'asc' }
      ]
    });

    // Generar PDF
    return this.crearPDFReporte(doctor, pacientes, config);
  }

  private async crearPDFReporte(
    doctor: any, 
    pacientes: any[], 
    config: ReporteConfig
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      try {
        // Header del reporte
        this.agregarHeader(doc, doctor);
        
        // Información del reporte
        this.agregarInfoReporte(doc, config);
        
        // Lista de pacientes
        this.agregarListaPacientes(doc, pacientes);
        
        // Estadísticas
        this.agregarEstadisticas(doc, pacientes);
        
        // Footer
        this.agregarFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private agregarHeader(doc: any, doctor: any) {
    // Logo y título
    doc.fontSize(20)
       .text('REPORTE DE PACIENTES', 50, 50, { align: 'center' });
    
    doc.fontSize(16)
       .text(doctor.negocio?.nombre || 'Consultorio', 50, 80, { align: 'center' });
    
    // Información del doctor
    doc.fontSize(12)
       .text(`Doctor: Dr. ${doctor.nombre} ${doctor.apellido || ''}`, 50, 120)
       .text(`Email: ${doctor.email}`, 50, 140)
       .text(`Fecha de generación: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 50, 160);
    
    // Línea separadora
    doc.moveTo(50, 190)
       .lineTo(550, 190)
       .stroke();
  }

  private agregarInfoReporte(doc: any, config: ReporteConfig) {
    let yPos = 210;
    
    doc.fontSize(14)
       .text('INFORMACIÓN DEL REPORTE', 50, yPos);
    
    yPos += 25;
    
    if (config.fechaInicio && config.fechaFin) {
      doc.fontSize(10)
         .text(`Período: ${format(config.fechaInicio, 'dd/MM/yyyy')} - ${format(config.fechaFin, 'dd/MM/yyyy')}`, 50, yPos);
      yPos += 15;
    }
    
    doc.text(`Incluir citas completadas: ${config.incluirCitasCompletadas ? 'Sí' : 'No'}`, 50, yPos);
    yPos += 15;
    
    doc.text(`Incluir expedientes: ${config.incluirExpedientes ? 'Sí' : 'No'}`, 50, yPos);
  }

  private agregarListaPacientes(doc: any, pacientes: any[]) {
    let yPos = 300;
    
    doc.fontSize(14)
       .text('LISTA DE PACIENTES', 50, yPos);
    
    yPos += 30;
    
    // Headers de tabla
    doc.fontSize(10)
       .text('Nombre', 50, yPos)
       .text('Email', 200, yPos)
       .text('Teléfono', 320, yPos)
       .text('Total Citas', 450, yPos);
    
    yPos += 20;
    
    // Línea de header
    doc.moveTo(50, yPos)
       .lineTo(550, yPos)
       .stroke();
    
    yPos += 15;
    
    // Datos de pacientes
    pacientes.forEach((paciente, index) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
      
      const nombreCompleto = `${paciente.nombre} ${paciente.apellido || ''}`.trim();
      
      doc.fontSize(9)
         .text(nombreCompleto, 50, yPos)
         .text(paciente.email || 'N/A', 200, yPos)
         .text(paciente.telefono || 'N/A', 320, yPos)
         .text(paciente._count.citas.toString(), 450, yPos);
      
      yPos += 15;
      
      // Línea separadora cada 5 registros
      if ((index + 1) % 5 === 0) {
        doc.moveTo(50, yPos)
           .lineTo(550, yPos)
           .strokeOpacity(0.3)
           .stroke()
           .strokeOpacity(1);
        yPos += 10;
      }
    });
  }

  private agregarEstadisticas(doc: any, pacientes: any[]) {
    // Nueva página para estadísticas
    doc.addPage();
    let yPos = 50;
    
    doc.fontSize(14)
       .text('ESTADÍSTICAS', 50, yPos);
    
    yPos += 30;
    
    const totalPacientes = pacientes.length;
    const totalCitas = pacientes.reduce((sum, p) => sum + p._count.citas, 0);
    const promedioCitas = totalPacientes > 0 ? (totalCitas / totalPacientes).toFixed(1) : 0;
    
    // Pacientes con más citas
    const topPacientes = pacientes
      .sort((a, b) => b._count.citas - a._count.citas)
      .slice(0, 5);
    
    doc.fontSize(12)
       .text(`Total de pacientes: ${totalPacientes}`, 50, yPos);
    yPos += 20;
    
    doc.text(`Total de citas: ${totalCitas}`, 50, yPos);
    yPos += 20;
    
    doc.text(`Promedio de citas por paciente: ${promedioCitas}`, 50, yPos);
    yPos += 40;
    
    // Top 5 pacientes
    doc.fontSize(12)
       .text('TOP 5 PACIENTES CON MÁS CITAS:', 50, yPos);
    yPos += 25;
    
    topPacientes.forEach((paciente, index) => {
      const nombreCompleto = `${paciente.nombre} ${paciente.apellido || ''}`.trim();
      doc.fontSize(10)
         .text(`${index + 1}. ${nombreCompleto}: ${paciente._count.citas} citas`, 70, yPos);
      yPos += 15;
    });
  }

  private agregarFooter(doc: any) {
    const pages = doc.bufferedPageRange();
    
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      doc.fontSize(8)
         .text(
           `Página ${i + 1} de ${pages.count} - Generado por DraftCitas - ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
           50,
           750,
           { align: 'center' }
         );
    }
  }
}

export const reportesService = new ReportesService();