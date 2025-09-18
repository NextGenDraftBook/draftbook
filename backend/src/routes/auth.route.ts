import { Router } from 'express';
import { login, logout, getProfile } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Rutas públicas (no requieren autenticación)
router.post('/login', login);

// Rutas protegidas (requieren autenticación)
router.post('/logout', authMiddleware, logout);
router.get('/profile', authMiddleware, getProfile);

export default router;