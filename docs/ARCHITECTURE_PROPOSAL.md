Propuesta de Arquitectura de Backend - TrackFlow

1. Introducción
Esta propuesta define la estructura del backend para TrackFlow. Dado que gestionamos inventario logístico crítico con necesidad de exactitud en tiempo real y consistencia entre almacenes, la arquitectura debe priorizar la mantenibilidad, la escalabilidad de dominios y una clara separación de responsabilidades.

2. Patrón Arquitectónico: Arquitectura en Capas (Layered Architecture)
Propongo una Arquitectura en Capas (también conocida como arquitectura de n-niveles).

Justificación: Al ser una aplicación de gestión de datos, necesitamos separar la lógica de negocio de la persistencia de datos (SQLModel/TinyDB) y de la interfaz de comunicación (API REST). Esto nos permitirá escalar cada capa de forma independiente y facilita las pruebas unitarias.

3. Estructura de Carpetas Propuesta
Seguiremos las convenciones estándar de FastAPI para asegurar que el equipo pueda navegar el proyecto intuitivamente:

Plaintext
services/
├── main.py            # Punto de entrada y configuración de la aplicación
├── database.py        # Configuración de conexión y sesión
├── models.py          # Definición de modelos de datos (SQLModel)
├── schemas.py         # Modelos Pydantic para validación de requests/responses
└── routers/           # Agrupación de endpoints por dominio
    └── inventory.py   # Lógica específica del dominio de inventario
4. Organización de Endpoints y Dominios
Los endpoints se organizarán bajo el prefijo /inventory utilizando APIRouter.

Criterio: La separación por dominios nos permite escalar si en el futuro añadimos módulos como users, shipping o analytics.

Rutas: Se agruparán en routers/inventory.py para mantener la lógica relacionada con SKUs y movimientos de stock unificada, facilitando la auditoría de los flujos de datos.

5. Consideraciones para Frontend y Backend Separados
Dado que el frontend y el backend operan como sistemas independientes:

Comunicación por API: El backend expondrá una API REST. El frontend consumirá estos servicios a través de peticiones HTTP.

Variables de Entorno: Utilizaremos un archivo .env para gestionar configuraciones sensibles (como claves de API o configuraciones de DB), asegurando que el código fuente no contenga credenciales hardcoded.

CORS: Configuraremos el middleware de CORS en main.py para permitir explícitamente las peticiones desde el origen del frontend, garantizando seguridad y accesibilidad.

6. Riesgos y Puntos de Atención
Consistencia de Datos: El cálculo dinámico del stock (Entradas - Salidas) requiere una validación estricta en el nivel de aplicación. Si el equipo omite esta capa, el sistema mostrará datos erróneos, lo cual representa un riesgo contractual para TrackFlow.

Desacople del Frontend: Al evolucionar ambos sistemas de forma separada, existe el riesgo de que los cambios en los modelos de backend rompan la integración con el frontend. Se recomienda mantener una documentación clara de los esquemas (JSON Schema/OpenAPI que genera FastAPI automáticamente) para evitar discrepancias.