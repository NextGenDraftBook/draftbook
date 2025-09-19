import { Router } from 'express';
import { generarReportePacientes, obtenerDoctoresParaReporte } from '../controllers/reportes.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas de reportes
router.get('/doctores', obtenerDoctoresParaReporte);
router.post('/pacientes/pdf', generarReportePacientes);

export default router;