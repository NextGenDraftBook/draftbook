import { Router } from 'express';
import { 
  obtenerDashboard,
  obtenerPerfilNegocio,
  actualizarPerfilNegocio,
  obtenerEstadisticasAvanzadas,
  obtenerReporteMensual,
  obtenerInfoConsultorio
} from '../controllers/negocio.controller';
import { requireAdmin, requireUser } from '../middleware/auth.middleware';

const router = Router();

// Ruta para clientes - solo requiere autenticación básica
router.get('/info-consultorio', requireUser, obtenerInfoConsultorio);

// Todas las demás rutas requieren autenticación de administrador
router.use(requireAdmin);

router.get('/dashboard', obtenerDashboard);
router.get('/perfil', obtenerPerfilNegocio);
router.put('/perfil', actualizarPerfilNegocio);
router.get('/estadisticas', obtenerEstadisticasAvanzadas);
router.get('/reporte-mensual', obtenerReporteMensual);

export default router;