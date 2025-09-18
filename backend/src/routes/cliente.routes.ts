import { Router } from 'express';
import { 
  crearCliente,
  obtenerClientes,
  obtenerCliente,
  actualizarCliente,
  eliminarCliente,
  obtenerEstadisticasCliente
} from '../controllers/cliente.controller';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación de administrador
router.use(requireAdmin);

router.post('/', crearCliente);
router.get('/', obtenerClientes);
router.get('/:id', obtenerCliente);
router.get('/:id/estadisticas', obtenerEstadisticasCliente);
router.put('/:id', actualizarCliente);
router.delete('/:id', eliminarCliente);

export default router;