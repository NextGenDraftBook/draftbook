# Pegar en docs/database/README.md
# Documentación de Base de Datos - DraftCitas

## Modelo de Datos

### Diagrama de Relaciones
```mermaid
erDiagram
    NEGOCIO ||--o{ USUARIO : "tiene"
    NEGOCIO ||--o{ CLIENTE : "tiene"
    NEGOCIO ||--o{ CITA : "tiene"
    NEGOCIO ||--o{ PAGO_SISTEMA : "tiene"
    
    USUARIO ||--o{ CITA : "atiende"
    CLIENTE ||--o{ CITA : "programa"
    
    NEGOCIO {
        string id PK
        string slug UK
        string nombre
        string email
        string telefono
        string direccion
        boolean activo
        boolean suspendido
        datetime created_at
        datetime updated_at
    }
    
    USUARIO {
        string id PK
        string email UK
        string password
        string nombre
        string apellido
        enum rol
        boolean activo
        string negocio_id FK
        datetime created_at
        datetime updated_at
    }
    
    CLIENTE {
        string id PK
        string nombre
        string apellido
        string email
        string telefono
        datetime fecha_nacimiento
        string direccion
        boolean activo
        string negocio_id FK
        datetime created_at
        datetime updated_at
    }
    
    CITA {
        string id PK
        datetime fecha
        string hora
        int duracion
        enum estado
        string motivo
        string notas
        string negocio_id FK
        string cliente_id FK
        string usuario_id FK
        datetime created_at
        datetime updated_at
    }