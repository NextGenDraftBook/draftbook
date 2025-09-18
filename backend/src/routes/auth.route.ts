import { Router } from 'express';
import { 
  login, 
  registro, 
  registroCliente,
  obtenerPerfil, 
  cambiarPassword, 
  logout,
  verificarToken
} from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Rutas públicas
router.post('/login', login);
router.post('/registro', registro);
router.post('/register-cliente', registroCliente);

// Rutas protegidas
router.get('/perfil', authMiddleware, obtenerPerfil);
router.get('/verificar', authMiddleware, verificarToken);
router.put('/cambiar-password', authMiddleware, cambiarPassword);
router.post('/logout', authMiddleware, logout);

export default router;