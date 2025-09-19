import { Router } from 'express';
import { 
  obtenerDashboard,
  obtenerPerfilNegocio,
  actualizarPerfilNegocio,
  obtenerEstadisticasAvanzadas,
  obtenerReporteMensual
} from '../controllers/negocio.controller';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación de administrador
router.use(requireAdmin);

router.get('/dashboard', obtenerDashboard);
router.get('/perfil', obtenerPerfilNegocio);
router.put('/perfil', actualizarPerfilNegocio);
router.get('/estadisticas', obtenerEstadisticasAvanzadas);
router.get('/reporte-mensual', obtenerReporteMensual);

export default router;