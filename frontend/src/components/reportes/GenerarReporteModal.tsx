import React, { useState, useEffect } from 'react';
import { reportesService, type DoctorReporte, type ConfigReporte } from '../../services/reportes';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GenerarReporteModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [doctores, setDoctores] = useState<DoctorReporte[]>([]);
  const [config, setConfig] = useState<ConfigReporte>({
    incluirCitasCompletadas: true,
    incluirExpedientes: false,
  });
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarDoctores();
    }
  }, [isOpen]);

  const cargarDoctores = async () => {
    try {
      const { doctores } = await reportesService.obtenerDoctores();
      setDoctores(doctores);
    } catch (error) {
      console.error('Error cargando doctores:', error);
      toast.error('Error cargando doctores');
    }
  };

  const handleGenerarReporte = async () => {
    if (!config.doctorId) {
      toast.error('Selecciona un doctor');
      return;
    }

    setGenerando(true);
    
    try {
      const blob = await reportesService.generarReportePacientes(config);
      const fileName = `reporte-pacientes-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
      
      reportesService.descargarReporte(blob, fileName);
      toast.success('Reporte generado exitosamente');
      onClose();
    } catch (error) {
      console.error('Error generando reporte:', error);
      toast.error('Error generando reporte');
    } finally {
      setGenerando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Generar Reporte de Pacientes</h2>
        
        <div className="space-y-4">
          {/* Selector de Doctor */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Doctor *
            </label>
            <select
              value={config.doctorId || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, doctorId: e.target.value }))}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">Seleccionar doctor...</option>
              {doctores.map(doctor => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.nombre} {doctor.apellido} ({doctor._count.citas} citas)
                </option>
              ))}
            </select>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={config.fechaInicio || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, fechaInicio: e.target.value }))}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={config.fechaFin || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, fechaFin: e.target.value }))}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>

          {/* Opciones */}
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.incluirCitasCompletadas}
                onChange={(e) => setConfig(prev => ({ ...prev, incluirCitasCompletadas: e.target.checked }))}
                className="mr-2"
              />
              Incluir solo citas completadas
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.incluirExpedientes}
                onChange={(e) => setConfig(prev => ({ ...prev, incluirExpedientes: e.target.checked }))}
                className="mr-2"
              />
              Incluir datos de expedientes
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
            disabled={generando}
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerarReporte}
            disabled={generando || !config.doctorId}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300"
          >
            {generando ? 'Generando...' : 'Generar Reporte'}
          </button>
        </div>
      </div>
    </div>
  );
};