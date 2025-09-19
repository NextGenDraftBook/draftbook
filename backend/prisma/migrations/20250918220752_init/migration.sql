-- CreateEnum
CREATE TYPE "public"."Rol" AS ENUM ('SUPERADMIN', 'ADMIN', 'CLIENTE');

-- CreateEnum
CREATE TYPE "public"."EstadoCita" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'RECHAZADA', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "public"."EstadoPago" AS ENUM ('PENDIENTE', 'PAGADO', 'RECHAZADO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "public"."TipoNotificacion" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS', 'CITA_AGENDADA', 'CITA_CANCELADA', 'CITA_REAGENDADA', 'CITA_CONFIRMADA', 'RECORDATORIO_CITA');

-- CreateTable
CREATE TABLE "public"."negocios" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "ciudad" TEXT,
    "estado" TEXT,
    "codigoPostal" TEXT,
    "descripcion" TEXT,
    "especialidad" TEXT,
    "horarioAtencion" TEXT,
    "sitioWeb" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "suspendido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "negocios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT,
    "rol" "public"."Rol" NOT NULL DEFAULT 'ADMIN',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "negocioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "genero" TEXT,
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "negocioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."citas" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "hora" TEXT NOT NULL,
    "duracion" INTEGER NOT NULL DEFAULT 60,
    "estado" "public"."EstadoCita" NOT NULL DEFAULT 'PENDIENTE',
    "motivo" TEXT,
    "notas" TEXT,
    "negocioId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pagos_sistema" (
    "id" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estado" "public"."EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "referencia" TEXT,
    "metodo" TEXT,
    "negocioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pagos_cliente" (
    "id" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'MXN',
    "concepto" TEXT NOT NULL,
    "estado" "public"."EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "fechaPago" TIMESTAMP(3),
    "referencia" TEXT,
    "metodo" TEXT,
    "clienteId" TEXT NOT NULL,
    "citaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documentos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreOriginal" TEXT,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tamanio" INTEGER NOT NULL,
    "clienteId" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plantillas_membrete" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "logoUrl" TEXT,
    "nombreDoctor" TEXT NOT NULL,
    "especialidad" TEXT,
    "cedulaProfesional" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "ciudad" TEXT,
    "estado" TEXT,
    "codigoPostal" TEXT,
    "esActiva" BOOLEAN NOT NULL DEFAULT false,
    "negocioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_membrete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recetas" (
    "id" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "clienteId" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "citaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notificaciones" (
    "id" TEXT NOT NULL,
    "tipo" "public"."TipoNotificacion" NOT NULL,
    "destinatario" TEXT NOT NULL,
    "asunto" TEXT,
    "contenido" TEXT NOT NULL,
    "enviado" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "negocioId" TEXT NOT NULL,
    "clienteId" TEXT,
    "citaId" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "esNotificacionCliente" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "negocios_slug_key" ON "public"."negocios"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "public"."usuarios"("email");

-- AddForeignKey
ALTER TABLE "public"."usuarios" ADD CONSTRAINT "usuarios_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "public"."negocios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clientes" ADD CONSTRAINT "clientes_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "public"."negocios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."citas" ADD CONSTRAINT "citas_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "public"."negocios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."citas" ADD CONSTRAINT "citas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."citas" ADD CONSTRAINT "citas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pagos_sistema" ADD CONSTRAINT "pagos_sistema_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "public"."negocios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pagos_cliente" ADD CONSTRAINT "pagos_cliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pagos_cliente" ADD CONSTRAINT "pagos_cliente_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "public"."citas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documentos" ADD CONSTRAINT "documentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documentos" ADD CONSTRAINT "documentos_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "public"."negocios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."documentos" ADD CONSTRAINT "documentos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plantillas_membrete" ADD CONSTRAINT "plantillas_membrete_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "public"."negocios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recetas" ADD CONSTRAINT "recetas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recetas" ADD CONSTRAINT "recetas_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "public"."negocios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recetas" ADD CONSTRAINT "recetas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recetas" ADD CONSTRAINT "recetas_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "public"."citas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notificaciones" ADD CONSTRAINT "notificaciones_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "public"."negocios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notificaciones" ADD CONSTRAINT "notificaciones_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notificaciones" ADD CONSTRAINT "notificaciones_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "public"."citas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
