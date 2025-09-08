# 📚 DraftBook V1

Una aplicación web moderna desarrollada con React + TypeScript (frontend) y Node.js + Express (backend).

## 🚀 Inicio Rápido

### Prerequisitos
- Node.js 18+ 
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd draftbookV1

# Instalar todas las dependencias
npm run install:all

# O instalar manualmente
npm install
cd frontend && npm install
cd ../backend && npm install
```

### Desarrollo

```bash
# Ejecutar ambos servidores simultáneamente
npm run dev

# O ejecutar por separado:
npm run dev:frontend  # Frontend en http://localhost:5173
npm run dev:backend   # Backend en http://localhost:3001
```

### Scripts Disponibles

#### Proyecto General
- `npm run dev` - Ejecuta frontend y backend simultáneamente
- `npm run install:all` - Instala dependencias de todo el proyecto
- `npm run clean` - Limpia node_modules y archivos de compilación

#### Frontend (React + Vite)
- `npm run dev:frontend` - Servidor de desarrollo (http://localhost:5173)
- `npm run build:frontend` - Construir para producción
- `npm run lint:frontend` - Ejecutar linter

#### Backend (Node.js + Express)
- `npm run dev:backend` - Servidor de desarrollo (http://localhost:3001)
- `npm run start:backend` - Ejecutar en producción
- `npm run build` - Compilar TypeScript

## 🏗️ Estructura del Proyecto

```
draftbookV1/
├── frontend/          # Aplicación React
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/           # API Node.js
│   ├── src/
│   ├── .env
│   └── package.json
├── package.json       # Configuración raíz
└── README.md
```

## 🔧 Configuración de Desarrollo

### Variables de Entorno

#### Backend (.env)
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
```

### Puertos por Defecto
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- API Health Check: http://localhost:3001/api/health

## 📦 Tecnologías Utilizadas

### Frontend
- React 19
- TypeScript
- Vite
- ESLint

### Backend  
- Node.js
- Express
- TypeScript
- CORS
- dotenv

## 🚀 Despliegue

### Frontend
```bash
cd frontend
npm run build
npm run preview  # Vista previa del build
```

### Backend
```bash
cd backend
npm run build
npm run start:prod
```