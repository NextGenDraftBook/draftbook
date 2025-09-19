# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Versionado Semántico](https://semver.org/spec/v2.0.0.html).

## [Sin versionar]

### Añadido
- Configuración inicial del proyecto
- Estructura monorepo con frontend y backend
- Scripts de desarrollo concurrente
- Documentación completa del proyecto

## [1.0.0] - 2025-01-08

### Añadido
- ✨ Configuración inicial de React + TypeScript (Frontend)
- ✨ Configuración inicial de Node.js + Express + TypeScript (Backend)
- 🛠️ Scripts de desarrollo para ejecución concurrente
- 🌐 Configuración de CORS para comunicación frontend-backend
- 📝 Documentación completa del proyecto
- 🔧 Variables de entorno configuradas
- 🧪 Endpoint de health check (/api/health)
- 📦 Configuración de build y deployment
- 🎯 Configuración de ESLint y TypeScript strict
- 🚀 Scripts de instalación automatizada

### Estructura Técnica
- **Frontend:** React 19, TypeScript, Vite, ESLint
- **Backend:** Node.js, Express, TypeScript, CORS, dotenv
- **Herramientas:** Concurrently, Nodemon, ts-node
- **Puertos:** Frontend (5173), Backend (3001)

### Scripts Disponibles
- `npm run dev` - Desarrollo concurrente
- `npm run install:all` - Instalación completa
- `npm run build` - Build de producción
- `npm run lint` - Linting de código
