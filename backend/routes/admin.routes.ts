import express from 'express';
import {
  obtenerEstadisticas,
  obtenerEstadisticasNegocio,
  obtenerCitas,
  crearCita,
  actualizarCita,
  eliminarCita,
  obtenerClientes,
  buscarClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  obtenerDocumentos,
  obtenerRecetas,
  crearReceta,
  actualizarReceta,
  eliminarReceta,
  obtenerExpediente,
  getPagosCliente,
  createPagoCliente,
  updatePagoCliente,
  deletePagoCliente
} from '../controllers/admin.controller';
import { descargarRecetaPDF } from '../controllers/receta.controller';
import { authMiddleware as verificarToken } from '../middleware/auth.middleware';
import { verificarRol } from '../middleware/roles.middleware';
// Importar rutas de documentos
import documentoRoutes from './documento.routes';

const router = express.Router();

// Middleware para todas las rutas
router.use(verificarToken);
router.use(verificarRol(['ADMIN', 'SUPERADMIN']));

// Dashboard
router.get('/stats', obtenerEstadisticas);
router.get('/dashboard/estadisticas', obtenerEstadisticas);
router.get('/negocios/:negocioId/stats', obtenerEstadisticasNegocio);

// Citas
router.get('/citas', obtenerCitas);
router.post('/citas', crearCita);
router.put('/citas/:id', actualizarCita);
router.delete('/citas/:id', eliminarCita);

// Clientes
router.get('/clientes/buscar', buscarClientes);
router.get('/clientes', obtenerClientes);
router.post('/clientes', crearCliente);
router.put('/clientes/:id', actualizarCliente);
router.delete('/clientes/:id', eliminarCliente);
router.get('/clientes/:id/expediente', obtenerExpediente);

// Documentos
router.use('/documentos', documentoRoutes);

// Recetas
router.get('/recetas', obtenerRecetas);
router.post('/recetas', crearReceta);
router.put('/recetas/:id', actualizarReceta);
router.delete('/recetas/:id', eliminarReceta);
router.get('/recetas/:id/pdf', descargarRecetaPDF);

// Expedientes
router.get('/expedientes/:clienteId', obtenerExpediente);

// Pagos de Cliente
router.get('/pagos-cliente', getPagosCliente);
router.post('/pagos-cliente', createPagoCliente);
router.put('/pagos-cliente/:id', updatePagoCliente);
router.delete('/pagos-cliente/:id', deletePagoCliente);

export default router;