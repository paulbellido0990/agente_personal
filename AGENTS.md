# AGENTS.md — ALIRA

> Instrucciones de proyecto para Codex y otros agentes de programación. Leer antes de crear o modificar archivos.

## 1. Identidad y objetivo

**Nombre:** ALIRA  
**Subtítulo:** Tu asistente inteligente de tareas  
**Eslogan:** Organiza. Avanza. Logra.  
**Idioma del producto:** Español (Perú)  
**Zona horaria predeterminada:** `America/Lima`  
**Moneda:** No necesaria en el MVP.

ALIRA es una aplicación web responsive para gestionar tareas personales y académicas. Su propósito es ayudar a registrar pendientes, establecer prioridades, planificar entregas, visualizar el progreso y, en una fase posterior, interactuar con un asistente conversacional de IA.

**Importante:** No confundir una interfaz de chat de demostración con una IA real. Nunca simular como funcional una integración que aún no existe.

## 2. Modo de trabajo obligatorio para Codex

1. Inspecciona los archivos existentes antes de modificar el proyecto; preserva lo que ya funciona.
2. Implementa **solo la fase solicitada**. Si el usuario no especifica fase, comienza por la Fase 1.
3. Antes de editar, explica brevemente los archivos que crearás o modificarás.
4. Mantén cambios pequeños, legibles y coherentes. Evita dependencias innecesarias.
5. Al terminar, ejecuta las verificaciones aplicables (`npm run build`, pruebas existentes y lint si está configurado).
6. Informa qué implementaste, qué probaste, qué falta y cómo ejecutarlo. No afirmes que una prueba pasó sin ejecutarla.
7. No borres código, datos ni configuraciones del usuario sin solicitarlo.
8. Mantén textos de interfaz, errores y documentación orientada al usuario en español.
9. Si faltan credenciales o servicios externos, utiliza una implementación local funcional e identifica con claridad las funciones pendientes de integración.
10. No crees commits ni hagas push sin petición explícita.

## 3. Stack tecnológico

- **Frontend:** React + Vite + JavaScript (JSX).
- **Estilos:** CSS modular o CSS convencional con variables de diseño; diseño propio y consistente.
- **Iconos:** `lucide-react`.
- **Backend (Fase 3):** Node.js + Express.
- **Base de datos (Fase 3):** SQLite con esquema y migración inicial documentados.
- **API:** REST bajo `/api`.
- **IA (Fase 5):** integración desde el backend con proveedor configurable mediante variables de entorno. No colocar claves en el frontend.
- **Editor esperado:** Visual Studio Code.
- **Repositorio:** Git/GitHub.

En la Fase 1, **no** es necesario implementar Express, SQLite ni la API de IA. Si la aplicación está vacía, inicializa Vite con React. Si ya existe, adapta su estructura sin reinicializarla.

## 4. Diseño visual

Diseñar ALIRA como un producto SaaS moderno, pulcro y amable; **no** como una página escolar genérica.

### Paleta recomendada

| Uso | Color |
|---|---|
| Primario morado | `#8056D9` |
| Morado intenso (hover/énfasis) | `#6D41CA` |
| Lavanda de fondo | `#F3EFFB` |
| Fondo general | `#FAF9FD` |
| Tarjetas | `#FFFFFF` |
| Texto principal | `#25213D` |
| Texto secundario | `#756F87` |
| Verde pastel/completadas | `#E2F5ED` |
| Amarillo pastel/media | `#FFF1D9` |
| Rojo pastel/alta | `#FBE5E9` |
| Azul pastel/información | `#E7EFFF` |

**Guía:** Bordes redondeados de 12–20 px; sombras suaves; jerarquía tipográfica clara; espacios generosos; indicadores de prioridad con color **y texto**; buen contraste y estados de foco visibles. Tipografía: Inter o alternativa sans-serif disponible. Evitar degradados excesivos, animaciones distractoras y saturación de elementos.

### Estructura de escritorio

- **Barra lateral izquierda:** logo ALIRA, Inicio, Mis tareas, Calendario, Estadísticas, Categorías, Asistente IA y Configuración.
- **Encabezado superior:** búsqueda (cuando funcione), notificaciones (cuando funcionen) y avatar/perfil.
- **Dashboard central:** saludo, tarjetas de resumen, tareas recientes/próximas, progreso semanal y acceso a nueva tarea.
- **Panel derecho opcional:** vista compacta de asistente y próximos vencimientos.
- **Móvil:** navegación adaptable; sin desbordamientos horizontales; sidebar colapsable.

Los botones deben realizar acciones reales o marcarse claramente como funciones futuras. No usar enlaces, filtros, gráficas ni notificaciones ficticias con apariencia de estar operativos.

## 5. Modelo funcional de tarea

Cada tarea tendrá, como mínimo:

```json
{
  "id": "uuid",
  "titulo": "Preparar informe de IA",
  "descripcion": "Completar ejercicios y subir el documento",
  "categoria": "Inteligencia Artificial",
  "prioridad": "alta",
  "estado": "pendiente",
  "fechaLimite": "2026-10-16",
  "createdAt": "2026-10-14T18:00:00.000Z",
  "updatedAt": "2026-10-14T18:00:00.000Z"
}
```

Valores válidos:
- `prioridad`: `baja`, `media`, `alta`.
- `estado`: `pendiente`, `en_progreso`, `completada`.
- `fechaLimite`: fecha local `YYYY-MM-DD` o `null`.

**Reglas:** título obligatorio entre 3 y 120 caracteres; descripción opcional; no permitir fechas inválidas; confirmar eliminación; nunca almacenar HTML sin sanitización. Una tarea **vencida** se calcula cuando su fecha límite es anterior al día actual en `America/Lima` y no está completada; no se guarda como estado independiente. Los datos de prueba no deben atribuirse al usuario como tareas reales.

## 6. Plan de desarrollo por fases

### Fase 1 — Interfaz y tareas locales (MVP inicial)

Crear una web usable con:

- Identidad visual de ALIRA, diseño responsive, navegación y dashboard.
- Alta, edición, eliminación y marcado de tareas.
- Lista con búsqueda, filtros por estado/prioridad/categoría y orden por fecha límite.
- Tarjetas con totales: total, pendientes, completadas y vencidas.
- Persistencia en `localStorage`, encapsulada en un módulo de almacenamiento para poder reemplazarla posteriormente.
- Estados vacíos, validación, confirmación de borrado y notificaciones UI discretas.
- Vista de asistente identificada como **"Próximamente"**, sin fingir respuestas de IA.

**Aceptación:** se puede crear, actualizar, completar y borrar una tarea; al recargar la página las tareas continúan; los contadores se actualizan correctamente; no hay errores en consola; `npm run build` funciona.

### Fase 2 — Calendario y productividad

- Vista de calendario mensual/semanal basada en tareas guardadas.
- Próximas entregas ordenadas por fecha.
- Resumen de cumplimiento y distribución por categorías (datos reales).
- Diseño accesible para escritorio y móvil.

**Aceptación:** las vistas reflejan las mismas tareas que el dashboard y los filtros no alteran ni pierden datos.

### Fase 3 — API y base de datos

- Crear servidor Express y base SQLite con esquema inicial.
- Endpoints REST: `GET /api/tareas`, `POST /api/tareas`, `GET /api/tareas/:id`, `PATCH /api/tareas/:id`, `DELETE /api/tareas/:id`.
- Validación de datos en backend; respuestas HTTP coherentes y manejo centralizado de errores.
- Conectar frontend mediante una capa de servicios (sin llamadas dispersas en los componentes).
- Documentar cómo levantar cliente y servidor. Prever migración de datos locales sin perder tareas.

**Aceptación:** CRUD real persistente tras reiniciar el servidor; peticiones inválidas tienen mensajes comprensibles; no hay consultas SQL inseguras.

### Fase 4 — Recordatorios y organización

- Preferencias de alertas y recordatorios dentro de la app.
- Recordatorios según fechas cuando el entorno lo permita, con indicación clara si las alertas requieren mantener la app abierta.
- Mejoras de prioridad y planificación (reglas explícitas, sin presentarlas como IA).

### Fase 5 — Asistente de IA

- Chat real conectado mediante backend, con proveedor configurable.
- Consultas: "¿qué tengo pendiente hoy?", "ordena mis tareas por prioridad".
- Propuestas de creación/actualización de tareas a partir de lenguaje natural.
- **Confirmación explícita** antes de crear, modificar o eliminar tareas solicitadas mediante IA.
- Limitar contexto a los datos necesarios, manejar fallos del proveedor y proteger las claves.
- No inventar tareas, fechas ni recordatorios; mostrar incertidumbre cuando falte información.

### Fase 6 — Calidad y publicación

- Pruebas de lógica y flujos principales.
- Accesibilidad básica, rendimiento y responsive.
- README de instalación y uso, capturas, `.env.example`, licencia a decidir con el usuario.
- Preparación para despliegue público sin exponer secretos.

## 7. Estructura propuesta

Organiza de manera incremental, sin crear carpetas vacías innecesarias:

```text
alira/
├── AGENTS.md
├── README.md
├── .gitignore
├── client/
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── services/
│       ├── styles/
│       ├── App.jsx
│       └── main.jsx
└── server/                  # Desde Fase 3
    ├── package.json
    ├── src/
    │   ├── routes/
    │   ├── controllers/
    │   ├── db/
    │   └── app.js
    └── .env.example
```

Si ya existe una estructura Vite en la raíz, úsala temporalmente y adapta la documentación; evita mover todo por estética si eso rompe el proyecto.

## 8. Seguridad, accesibilidad y calidad

- Nunca añadir claves API o secretos a Git. Usar `.env` ignorado y `.env.example` con valores ficticios.
- Validar entradas en frontend y backend. Usar SQL parametrizado en SQLite.
- La IA no ejecutará acciones destructivas sin confirmación.
- Formularios con etiquetas, navegación por teclado y mensajes de error claros.
- Interfaz adaptable a 360 px, tablet y escritorio.
- Componentes reutilizables; no crear un único archivo enorme con toda la aplicación.
- No agregar dependencias, bibliotecas UI complejas o autenticación hasta necesitarlas.
- README actualizado con instalación y comandos realmente disponibles.

## 9. Primera instrucción para Codex

Cuando se solicite iniciar el proyecto:

> Construye la **Fase 1 de ALIRA** siguiendo este AGENTS.md. Si el repositorio está vacío, crea una aplicación React con Vite en `client/`. Diseña un dashboard responsive de acabado profesional en morado pastel. Implementa CRUD de tareas con persistencia en localStorage, filtros, búsqueda, validaciones, contadores reales y estados vacíos. No uses datos de ejemplo como si fueran reales; permite una demo opcional identificada como tal. Muestra el asistente de IA como función futura. Ejecuta la compilación y explica cómo arrancar la aplicación desde VS Code. No avances a otras fases.

---

**Principio del proyecto:** ALIRA debe funcionar bien como gestor de tareas antes de presentarse como un asistente con IA.
