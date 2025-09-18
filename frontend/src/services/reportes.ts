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
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:3001/api/reportes/pacientes/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error('Error generando reporte');
    }

    return await response.blob();
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