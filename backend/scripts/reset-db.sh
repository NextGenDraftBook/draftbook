#!/bin/bash

echo "🔄 Reseteando base de datos..."

# Resetear migraciones
npx prisma migrate reset --force

# Generar cliente
npx prisma generate

# Ejecutar seed
npx prisma db seed

echo "✅ Base de datos reseteada exitosamente!"