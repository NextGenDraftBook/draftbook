// Pegar en backend/src/routes/reportes.routes.ts
import { Router } from 'express';
import { 
  generarReportePacientes,
  obtenerDoctoresParaReporte
} from '../controllers/reportes.controller';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación de administrador
router.use(requireAdmin);

// Generar reporte PDF de pacientes
router.post('/pacientes/pdf', generarReportePacientes);

// Obtener lista de doctores para reportes
router.get('/doctores', obtenerDoctoresParaReporte);

export default router;