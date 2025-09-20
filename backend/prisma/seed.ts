import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Crear superadmin
  const superadminPassword = await bcrypt.hash('admin123', 12);
  
  const superadmin = await prisma.usuario.upsert({
    where: { email: 'admin@draftbook.com' },
    update: {},
    create: {
      email: 'admin@draftbook.com',
      password: superadminPassword,
      nombre: 'Super',
      apellido: 'Administrador',
      rol: 'SUPERADMIN',
      activo: true
    }
  });

  console.log('✅ Superadmin creado:', superadmin.email);

  // Crear negocio demo si no existe
  const demo = await prisma.negocio.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      nombre: 'Negocio Demo',
      activo: true,
      suspendido: false,
      email: 'demo@demo.com'
    }
  });

  console.log('✅ Negocio demo creado:', demo.slug);

  // Crear usuario admin para el negocio
  const adminPassword = await bcrypt.hash('admin123', 12);
  
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@consultorio.com' },
    update: {},
    create: {
      email: 'admin@consultorio.com',
      password: adminPassword,
      nombre: 'Dr. Juan',
      apellido: 'Pérez',
      rol: 'ADMIN',
      negocioId: demo.id,
      activo: true
    }
  });

  console.log('✅ Admin del negocio creado:', admin.email);

  // Crear clientes de ejemplo
  const clientes = await Promise.all([
    prisma.cliente.upsert({
      where: { 
        id: 'cliente-maria-garcia'
      },
      update: {},
      create: {
        id: 'cliente-maria-garcia',
        nombre: 'María',
        apellido: 'García',
        email: 'maria.garcia@email.com',
        telefono: '+52 55 9876 5432',
        fechaNacimiento: new Date('1990-05-15'),
        direccion: 'Calle Juárez 456, CDMX',
        negocioId: demo.id,
        activo: true
      }
    }),
    prisma.cliente.upsert({
      where: { 
        id: 'cliente-carlos-lopez'
      },
      update: {},
      create: {
        id: 'cliente-carlos-lopez',
        nombre: 'Carlos',
        apellido: 'López',
        email: 'carlos.lopez@email.com',
        telefono: '+52 55 8765 4321',
        fechaNacimiento: new Date('1985-08-22'),
        direccion: 'Av. Insurgentes 789, CDMX',
        negocioId: demo.id,
        activo: true
      }
    }),
    prisma.cliente.upsert({
      where: { 
        id: 'cliente-ana-martinez'
      },
      update: {},
      create: {
        id: 'cliente-ana-martinez',
        nombre: 'Ana',
        apellido: 'Martínez',
        email: 'ana.martinez@email.com',
        telefono: '+52 55 7654 3210',
        fechaNacimiento: new Date('1992-12-10'),
        direccion: 'Calle Roma 321, CDMX',
        negocioId: demo.id,
        activo: true
      }
    })
  ]);

  console.log('✅ Clientes creados:', clientes.length);

  // Crear citas de ejemplo
  const citas = await Promise.all([
    prisma.cita.create({
      data: {
        fecha: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana
        hora: '09:00',
        duracion: 60,
        motivo: 'Consulta general',
        estado: 'CONFIRMADA',
        negocioId: demo.id,
        clienteId: clientes[0].id,
        usuarioId: admin.id
      }
    }),
    prisma.cita.create({
      data: {
        fecha: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // En 2 días
        hora: '11:00',
        duracion: 60,
        motivo: 'Seguimiento',
        estado: 'PENDIENTE',
        negocioId: demo.id,
        clienteId: clientes[1].id,
        usuarioId: admin.id
      }
    }),
    prisma.cita.create({
      data: {
        fecha: new Date(Date.now() - 24 * 60 * 60 * 1000), // Ayer
        hora: '14:00',
        duracion: 60,
        motivo: 'Consulta inicial',
        estado: 'COMPLETADA',
        negocioId: demo.id,
        clienteId: clientes[2].id,
        usuarioId: admin.id
      }
    })
  ]);

  console.log('✅ Citas creadas:', citas.length);

  // Crear pago del sistema de ejemplo
  const pagoSistema = await prisma.pagoSistema.create({
    data: {
      monto: 999.00,
      moneda: 'MXN',
      fechaInicio: new Date(),
      fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      estado: 'PAGADO',
      referencia: 'DEMO-001',
      metodo: 'transferencia',
      negocioId: demo.id
    }
  });

  console.log('✅ Pago del sistema creado');

  // Crear receta de ejemplo
  const receta = await prisma.receta.create({
    data: {
      contenido: `PRESCRIPCIÓN MÉDICA

Medicamento: Paracetamol 500mg
Dosis: 1 tableta cada 6 horas
Duración: 5 días
Indicaciones: Tomar con alimentos

Medicamento: Ibuprofeno 400mg
Dosis: 1 tableta cada 8 horas
Duración: 3 días
Indicaciones: Tomar después de las comidas

Recomendaciones:
- Mantener reposo relativo
- Beber abundante agua
- Evitar alimentos irritantes

Dr. Juan Pérez
Consultorio Demo`,
      clienteId: clientes[0].id,
      negocioId: demo.id,
      usuarioId: admin.id,
      citaId: citas[0].id
    }
  });

  console.log('✅ Receta creada');

  // Crear documento de ejemplo
  const documento = await prisma.documento.create({
    data: {
      nombre: 'Análisis de sangre.pdf',
      tipo: 'pdf',
      url: '/uploads/analisis-sangre.pdf',
      tamanio: 1024000, // 1MB
      clienteId: clientes[0].id,
      negocioId: demo.id,
      usuarioId: admin.id
    }
  });

  console.log('✅ Documento creado');

  // Crear pago de cliente de ejemplo
  const pagoCliente = await prisma.pagoCliente.create({
    data: {
      monto: 500.00,
      moneda: 'MXN',
      concepto: 'Consulta general',
      estado: 'PAGADO',
      fechaPago: new Date(),
      referencia: 'CLI-001',
      metodo: 'efectivo',
      clienteId: clientes[0].id,
      citaId: citas[0].id
    }
  });

  console.log('✅ Pago de cliente creado');

  console.log('🎉 Seed completado exitosamente!');
  console.log('');
  console.log('📋 Credenciales de acceso:');
  console.log('   SuperAdmin: admin@draftbook.com / admin123');
  console.log('   Admin Demo: admin@consultorio.com / admin123');
  console.log('');
  console.log('👥 Clientes de ejemplo:');
  console.log('   María García: maria.garcia@email.com');
  console.log('   Carlos López: carlos.lopez@email.com');
  console.log('   Ana Martínez: ana.martinez@email.com');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
