import { api } from './api';

export interface ConfigReporte {
  doctorId?: string;
  fechaInicio?: string;
  fechaFin?: string;
  incluirCitasCompletadas?: boolean;
  incluirExpedientes?: boolean;
}

export interface DoctorReporte {
  id: string;
  nombre: string;
  apellido?: string;
  email: string;
  _count: {
    citas: number;
  };
}

export const reportesService = {
  generarReportePacientes: async (config: ConfigReporte): Promise<Blob> => {
    try {
      const response = await api.post('/reportes/pacientes/pdf', config, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw new Error('Error generando reporte');
    }
  },

  obtenerDoctores: async (): Promise<{ doctores: DoctorReporte[] }> => {
    const response = await api.get<{ doctores: DoctorReporte[] }>('/reportes/doctores');
    return response;
  },

  descargarReporte: (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};