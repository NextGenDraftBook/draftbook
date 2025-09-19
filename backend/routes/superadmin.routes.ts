import { Router } from 'express';
import { 
  obtenerEstadisticas,
  obtenerNegocios,
  obtenerPagos,
  obtenerUsuarios,
  actualizarNegocio,
  actualizarPago,
  crearNegocio,
  eliminarNegocio,
  ejecutarRevisionPagos,
  toggleSuspenderNegocio,
  toggleActivarNegocio,
  obtenerEstadisticasNegocio,
  crearUsuario,
  actualizarUsuario,
  toggleBloquearUsuario,
  eliminarUsuario,
  obtenerActividadReciente,
  crearPagoManual
} from '../controllers/superadmin.controller';
import { requireSuperAdmin } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación de superadmin
router.use(requireSuperAdmin);

// Estadísticas
router.get('/stats', obtenerEstadisticas);
router.get('/actividad', obtenerActividadReciente);

// Gestión de negocios
router.get('/negocios', obtenerNegocios);
router.post('/negocios', crearNegocio);
router.put('/negocios/:id', actualizarNegocio);
router.delete('/negocios/:id', eliminarNegocio);
router.patch('/negocios/:id/suspender', toggleSuspenderNegocio);
router.patch('/negocios/:id/activar', toggleActivarNegocio);
router.get('/negocios/:id/stats', obtenerEstadisticasNegocio);

// Gestión de pagos
router.get('/pagos', obtenerPagos);
router.post('/pagos', crearPagoManual);
router.put('/pagos/:id', actualizarPago);

// Gestión de usuarios
router.get('/usuarios', obtenerUsuarios);
router.post('/usuarios', crearUsuario);
router.put('/usuarios/:id', actualizarUsuario);
router.patch('/usuarios/:id/bloquear', toggleBloquearUsuario);
router.delete('/usuarios/:id', eliminarUsuario);

// Operaciones del sistema
router.post('/revisar-pagos', ejecutarRevisionPagos);

export default router;