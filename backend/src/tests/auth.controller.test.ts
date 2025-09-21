const request = require('supertest');
const express = require('express');
const authController = require('../../src/controllers/auth.controller');

// Mock de Prisma Client más detallado
jest.mock('../../src/utils/prisma', () => {
  const mockPrisma = {
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    negocio: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    cliente: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockPrisma,
  };
});

// Mock de bcrypt para simular encriptación
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockImplementation((plain: string) => {
    return Promise.resolve(plain === 'correctPassword');
  }),
}));

// Mock de jsonwebtoken para simular tokens JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mockJwtToken'),
  verify: jest.fn().mockReturnValue({ 
    id: '1', 
    email: 'test@example.com', 
    rol: 'ADMIN',
    negocioId: '1'
  }),
}));

// Configurar variable de entorno para JWT
process.env.JWT_SECRET = 'test-secret-key';

// Configurar Express app
const app = express();
app.use(express.json());

// Configurar rutas de la API
app.post('/login', authController.login);
app.post('/registro', authController.registro);
app.post('/registro-cliente', authController.registroCliente);
app.get('/perfil', authController.obtenerPerfil);
app.put('/cambiar-password', authController.cambiarPassword);
app.get('/verificar-token', authController.verificarToken);
app.post('/logout', authController.logout);

// Obtener mocks para usar en los tests
const prismaMock = require('../../src/utils/prisma').default;

// ============================================================
// TESTS PARA LOGIN
// ============================================================
describe('Auth Controller - Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debería hacer login exitosamente con credenciales válidas', async () => {
    // Mock de usuario para simular respuesta de la base de datos
    const mockUsuario = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedPassword',
      nombre: 'Test',
      apellido: 'User',
      rol: 'ADMIN',
      negocioId: '1',
      activo: true,
      negocio: {
        id: '1',
        slug: 'test-negocio',
        nombre: 'Test Negocio',
        activo: true,
        suspendido: false
      }
    };

    prismaMock.usuario.findUnique.mockResolvedValue(mockUsuario);

    const response = await request(app)
      .post('/login')
      .send({
        email: 'test@example.com',
        password: 'correctPassword'
      });

    // Verificaciones del response
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login exitoso');
    expect(response.body.token).toBe('mockJwtToken');
    expect(response.body.usuario.email).toBe('test@example.com');
    expect(response.body.usuario).not.toHaveProperty('password');
  });

  test('debería fallar con credenciales inválidas', async () => {
    // Simular que no se encuentra el usuario
    prismaMock.usuario.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Credenciales inválidas');
  });

  test('debería fallar con contraseña incorrecta', async () => {
    const mockUsuario = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedPassword',
      nombre: 'Test',
      apellido: 'User',
      rol: 'ADMIN',
      negocioId: '1',
      activo: true,
      negocio: {
        id: '1',
        slug: 'test-negocio',
        nombre: 'Test Negocio',
        activo: true,
        suspendido: false
      }
    };

    prismaMock.usuario.findUnique.mockResolvedValue(mockUsuario);

    const response = await request(app)
      .post('/login')
      .send({
        email: 'test@example.com',
        password: 'wrongPassword'
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Credenciales inválidas');
  });
});

// ============================================================
// TESTS PARA REGISTRO DE USUARIOS Y NEGOCIOS
// ============================================================
describe('Auth Controller - Registro', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debería registrar un nuevo usuario admin sin negocio', async () => {
    // Simular que el email no existe
    prismaMock.usuario.findUnique.mockResolvedValue(null);
    
    // Mock de transacción para crear usuario SUPERADMIN
    const mockUsuarioCreado = {
      id: '2',
      email: 'admin@test.com',
      password: 'hashedPassword',
      nombre: 'Admin',
      apellido: 'User',
      rol: 'SUPERADMIN',
      negocioId: null,
      activo: true,
      negocio: null
    };

    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
      const mockTx = {
        usuario: {
          create: jest.fn().mockResolvedValue(mockUsuarioCreado)
        }
      };
      return callback(mockTx);
    });

    // Mock para la consulta final del usuario creado (include negocio)
    prismaMock.usuario.findUnique.mockResolvedValue(mockUsuarioCreado);

    const response = await request(app)
      .post('/registro')
      .send({
        email: 'admin@test.com',
        password: 'password123',
        nombre: 'Admin',
        apellido: 'User'
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Usuario registrado exitosamente');
    expect(response.body.token).toBeDefined();
  });

  test('debería registrar un nuevo negocio con usuario admin', async () => {
    // Simular que no existen usuario ni negocio
    prismaMock.usuario.findUnique.mockResolvedValue(null);
    prismaMock.negocio.findUnique.mockResolvedValue(null);
    
    // Mock complejo para la transacción de negocio + usuario
    const mockNegocioCreado = {
      id: '1',
      nombre: 'Mi Consultorio',
      slug: 'mi-consultorio',
      email: 'admin@consultorio.com',
      activo: true,
      suspendido: false
    };

    const mockUsuarioCreado = {
      id: '1',
      email: 'admin@consultorio.com',
      password: 'hashedPassword',
      nombre: 'Doctor',
      apellido: 'Pérez',
      rol: 'ADMIN',
      negocioId: '1',
      activo: true,
      negocio: mockNegocioCreado
    };

    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
      const mockTx = {
        negocio: {
          create: jest.fn().mockResolvedValue(mockNegocioCreado)
        },
        usuario: {
          create: jest.fn().mockResolvedValue(mockUsuarioCreado)
        }
      };
      return callback(mockTx);
    });

    // Mock para la consulta final del usuario creado con negocio
    prismaMock.usuario.findUnique.mockResolvedValue(mockUsuarioCreado);

    const response = await request(app)
      .post('/registro')
      .send({
        email: 'admin@consultorio.com',
        password: 'password123',
        nombre: 'Doctor',
        apellido: 'Pérez',
        nombreNegocio: 'Mi Consultorio',
        telefono: '1234567890'
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toContain('Consultorio y usuario admin registrados');
  });

  test('debería fallar al registrar con email existente', async () => {
    // Simular que el email ya existe
    const mockUsuarioExistente = {
      id: '1',
      email: 'existente@example.com',
      password: 'hashedPassword',
      nombre: 'Existente',
      apellido: 'User',
      rol: 'ADMIN',
      negocioId: '1',
      activo: true
    };

    prismaMock.usuario.findUnique.mockResolvedValue(mockUsuarioExistente);

    const response = await request(app)
      .post('/registro')
      .send({
        email: 'existente@example.com',
        password: 'password123',
        nombre: 'Nuevo',
        apellido: 'Usuario'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('El email ya está registrado');
  });

  test('debería validar campos requeridos en registro', async () => {
    const response = await request(app)
      .post('/registro')
      .send({
        email: 'invalido', // Email inválido
        password: '123',   // Password muy corto
        nombre: 'A'        // Nombre muy corto
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});

// ============================================================
// TESTS PARA REGISTRO DE CLIENTES
// ============================================================
describe('Auth Controller - Registro Cliente', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debería registrar un nuevo cliente exitosamente', async () => {
    // Simular que el email no existe
    prismaMock.usuario.findUnique.mockResolvedValue(null);
    
    // Mock de negocio existente y activo
    const mockNegocio = {
      id: '1',
      nombre: 'Consultorio Test',
      slug: 'consultorio-test',
      email: 'consultorio@test.com',
      activo: true,
      suspendido: false
    };

    prismaMock.negocio.findUnique.mockResolvedValue(mockNegocio);
    
    // Mock de transacción para crear usuario y cliente
    const mockUsuarioCreado = {
      id: '3',
      email: 'cliente@test.com',
      password: 'hashedPassword',
      nombre: 'Cliente',
      apellido: 'Test',
      rol: 'CLIENTE',
      negocioId: '1',
      activo: true
    };

    const mockClienteCreado = {
      id: '1',
      nombre: 'Cliente',
      apellido: 'Test',
      email: 'cliente@test.com',
      telefono: '1234567890',
      negocioId: '1',
      activo: true
    };

    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
      const mockTx = {
        usuario: {
          create: jest.fn().mockResolvedValue(mockUsuarioCreado)
        },
        cliente: {
          create: jest.fn().mockResolvedValue(mockClienteCreado)
        }
      };
      return callback(mockTx);
    });

    // Mock para la consulta final del usuario creado con negocio
    prismaMock.usuario.findUnique.mockResolvedValue({
      ...mockUsuarioCreado,
      negocio: mockNegocio
    });

    const response = await request(app)
      .post('/registro-cliente')
      .send({
        email: 'cliente@test.com',
        password: 'password123',
        nombre: 'Cliente',
        apellido: 'Test',
        telefono: '1234567890',
        negocioId: '1'
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Cliente registrado exitosamente');
  });

  test('debería fallar si el negocio no existe o está inactivo', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(null);
    
    // Simular negocio no encontrado
    prismaMock.negocio.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/registro-cliente')
      .send({
        email: 'cliente@test.com',
        password: 'password123',
        nombre: 'Cliente',
        apellido: 'Test',
        telefono: '1234567890',
        negocioId: '999' // ID de negocio que no existe
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('consultorio seleccionado no está disponible');
  });
});

// ============================================================
// TESTS PARA FUNCIONES ADICIONALES
// ============================================================
describe('Auth Controller - Funciones adicionales', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('logout debería responder exitosamente', async () => {
    const response = await request(app)
      .post('/logout')
      .send();

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Logout exitoso');
    expect(response.body.success).toBe(true);
  });

  test('obtenerPerfil debería retornar el perfil del usuario autenticado', async () => {
    // Mock manual para simular usuario autenticado
    const mockAuthMiddleware = (req: any, res: any, next: any) => {
      req.usuario = { id: '1', email: 'test@example.com', rol: 'ADMIN' };
      next();
    };

    // Aplicar mock middleware solo para esta ruta
    app.get('/perfil-test', mockAuthMiddleware, authController.obtenerPerfil);

    const mockUsuario = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedPassword',
      nombre: 'Test',
      apellido: 'User',
      rol: 'ADMIN',
      negocioId: '1',
      activo: true,
      negocio: {
        id: '1',
        slug: 'test-negocio',
        nombre: 'Test Negocio',
        activo: true,
        suspendido: false
      }
    };

    prismaMock.usuario.findUnique.mockResolvedValue(mockUsuario);

    const response = await request(app).get('/perfil-test');
    
    expect(response.status).toBe(200);
    expect(response.body.usuario.email).toBe('test@example.com');
    expect(response.body.usuario).not.toHaveProperty('password');
  });

  test('cambiarPassword debería actualizar la contraseña correctamente', async () => {
    // Mock middleware de autenticación
    const mockAuthMiddleware = (req: any, res: any, next: any) => {
      req.usuario = { id: '1', email: 'test@example.com', rol: 'ADMIN' };
      next();
    };

    app.put('/cambiar-password-test', mockAuthMiddleware, authController.cambiarPassword);

    const mockUsuario = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedOldPassword',
      nombre: 'Test',
      apellido: 'User',
      rol: 'ADMIN',
      negocioId: '1',
      activo: true
    };

    prismaMock.usuario.findUnique.mockResolvedValue(mockUsuario);
    prismaMock.usuario.update.mockResolvedValue({ ...mockUsuario, password: 'hashedNewPassword' });

    const response = await request(app)
      .put('/cambiar-password-test')
      .send({
        passwordActual: 'correctPassword', // Coincide con el mock de bcrypt
        passwordNueva: 'newPassword123'
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Contraseña actualizada exitosamente');
  });
});

// ============================================================
// TESTS PARA MANEJO DE ERRORES
// ============================================================
describe('Auth Controller - Manejo de errores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debería manejar errores internos del servidor', async () => {
    // Simular error inesperado en la base de datos
    prismaMock.usuario.findUnique.mockRejectedValue(new Error('Error de base de datos'));

    const response = await request(app)
      .post('/login')
      .send({
        email: 'test@example.com',
        password: 'correctPassword'
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Error interno del servidor');
  });

  test('debería manejar errores de validación de Zod', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        email: 'email-invalido', // Email inválido
        password: '123'          // Password muy corto
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});