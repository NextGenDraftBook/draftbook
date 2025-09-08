# Contribuir a DraftBook V1

¡Gracias por tu interés en contribuir al proyecto! 🎉

## 🚀 Configuración para Desarrolladores

### Requisitos Previos
- Node.js 18 o superior
- npm 8 o superior
- Git

### Configuración Inicial

1. **Clonar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd draftbookV1
   ```

2. **Instalar dependencias:**
   ```bash
   npm run install:all
   ```

3. **Configurar variables de entorno:**
   
   **Backend (.env):**
   ```env
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   DATABASE_URL=your_database_url
   JWT_SECRET=your_jwt_secret
   ```

4. **Ejecutar en modo desarrollo:**
   ```bash
   npm run dev
   ```

## 📋 Flujo de Trabajo

### Ramas
- `main`: Código de producción
- `develop`: Rama principal de desarrollo
- `feature/nombre-feature`: Nuevas funcionalidades
- `fix/nombre-bug`: Corrección de bugs
- `hotfix/nombre-hotfix`: Correcciones urgentes

### Proceso de Contribución

1. **Fork del repositorio**
2. **Crear nueva rama:**
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
3. **Hacer cambios y commits:**
   ```bash
   git add .
   git commit -m "tipo: descripción del cambio"
   ```
4. **Push y Pull Request**

### Convenciones de Commits

Formato: `tipo(alcance): descripción`

**Tipos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan funcionalidad)
- `refactor`: Refactorización de código
- `test`: Añadir o modificar tests
- `chore`: Cambios en build, dependencias, etc.

**Ejemplos:**
```bash
git commit -m "feat(auth): add user login functionality"
git commit -m "fix(api): resolve CORS issue"
git commit -m "docs(readme): update installation instructions"
```

## 🧪 Testing

```bash
# Ejecutar tests del frontend
npm run test:frontend

# Ejecutar tests del backend
npm run test:backend

# Ejecutar todos los tests
npm run test
```

## 📦 Build y Deployment

```bash
# Build del frontend
npm run build:frontend

# Build del backend
npm run build:backend

# Build completo
npm run build
```

## 🎨 Estándares de Código

- **Frontend:** ESLint + Prettier
- **Backend:** ESLint + TypeScript strict mode
- **Formato:** Prettier con configuración del proyecto

```bash
# Linting
npm run lint

# Fix automático
npm run lint:fix
```

## 🐛 Reportar Bugs

Usa el template de Issues para reportar bugs:
- Descripción clara del problema
- Pasos para reproducir
- Comportamiento esperado vs actual
- Screenshots si aplica
- Información del entorno

## 💡 Sugerir Mejoras

Para nuevas funcionalidades:
- Descripción detallada
- Casos de uso
- Mockups o wireframes (si aplica)
- Consideraciones técnicas

## 📞 Contacto

- **Issues:** Para bugs y sugerencias
- **Discussions:** Para preguntas y ideas
- **Email:** [tu-email@dominio.com]

¡Esperamos tus contribuciones! 🚀
