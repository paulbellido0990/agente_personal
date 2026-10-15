# ALIRA
**Tu asistente inteligente de tareas · Organiza. Avanza. Logra.**

Fase 3 de 7: backend Express, API REST, SQLite e integración con React. Se conserva el dashboard, la navegación, los componentes y la identidad visual de las fases anteriores. Esta entrega sigue el alcance del texto adjunto: las rutas son /api/tasks.

## Requisitos y tecnologías
Windows 11 y VS Code, Node.js **24.x** (verificado con 24.21.0) y npm. No requiere SQL Server, MySQL, un servidor SQLite ni herramientas de compilación nativa.
React 19, Vite 7, JavaScript, CSS propio, lucide-react, Express 5 y node:sqlite (DatabaseSync). El módulo SQLite viene en Node; la disponibilidad se comprobó ejecutándolo en el equipo. Consulta la [documentación oficial de SQLite en Node](https://nodejs.org/api/sqlite.html).
Playwright es solo una dependencia de desarrollo para pruebas en Chromium.

## Iniciar desde VS Code
Abre la carpeta principal. Usa **dos terminales**.

Terminal 1, backend:
```powershell
cd server
npm.cmd install
npm.cmd start
```
API: http://127.0.0.1:3001/api/health

Terminal 2, frontend (desde la raíz):
```powershell
cd client
npm.cmd install
npm.cmd run dev -- --port 5173 --strictPort
```
Abre **http://localhost:5173**, que es el origen autorizado por defecto. Usa Ctrl+C para detener cada servidor. En macOS/Linux usa npm en lugar de npm.cmd.
Para recarga del backend durante desarrollo usa npm.cmd run dev en server.
Si el puerto 5173 está ocupado, detén la otra aplicación o cambia FRONTEND_ORIGIN y el puerto de Vite de forma coherente; localhost y 127.0.0.1 son orígenes diferentes.
No es necesario crear archivos .env para usar los valores por defecto.

## Variables de entorno
Se entregan server/.env.example y client/.env.example con valores locales. Si necesitas cambiarlos, copia cada ejemplo a .env **solo si aún no existe** y edítalo; no sobrescribas configuraciones existentes.

| Archivo | Variable | Por defecto |
|---|---|---|
| server/.env | HOST | 127.0.0.1 |
| server/.env | PORT | 3001 |
| server/.env | FRONTEND_ORIGIN | http://localhost:5173 |
| server/.env | DB_PATH | ./data/alira.db |
| client/.env | VITE_API_URL | http://127.0.0.1:3001/api |

DB_PATH relativo se resuelve desde server/, independientemente de la terminal. Una ruta absoluta también es válida. El proceso Node carga server/.env con --env-file-if-exists; Vite carga client/.env. Reinicia los servidores al cambiar estos valores.
Para npm.cmd run preview, configura FRONTEND_ORIGIN con el origen del preview (por ejemplo http://localhost:4173) y reinicia el backend.

## Arquitectura y archivos
```text
asistente de tarea/
├── AGENTS.md                         # Conservado
├── README.md                         # Instalación, API, migración y pruebas
├── .gitignore                        # Incluye SQLite, entornos y resultados de pruebas
├── shared/
│   └── tasks.js                      # Modelo, validación y lógica común
├── client/
│   ├── .env.example
│   ├── package.json / package-lock.json
│   ├── playwright.config.js
│   ├── e2e/tasks.spec.js
│   ├── tests/
│   │   ├── tasks.test.mjs             # Pruebas previas conservadas
│   │   └── api.test.mjs               # Servicio HTTP y lotes de importación
│   └── src/
│       ├── App.jsx                   # Dashboard conservado; carga, conexión e importación
│       ├── hooks/useTasks.js          # Estado compartido y operaciones asíncronas
│       ├── hooks/useToday.js
│       ├── services/
│       │   ├── tasks.js              # Reexporta modelo compartido
│       │   ├── taskApi.js            # fetch centralizado
│       │   └── taskStorage.js        # Legado local, conservado para recuperación
│       ├── components/
│       │   ├── ImportTasksDialog.jsx # Nuevo: confirmación de importación
│       │   ├── TaskForm.jsx          # Adaptado a HTTP y estados pendientes
│       │   ├── DeleteTaskDialog.jsx
│       │   ├── Modal.jsx             # Escape, foco y bloqueo durante solicitud
│       │   ├── TaskTable.jsx         # Controles y estados de carga/error
│       │   └── ...                   # Header/Sidebar adaptados; demás vistas conservadas
│       ├── data/demo.js              # Demo separada en memoria
│       └── styles/                   # Estilos existentes + ajustes en tasks.css
└── server/
    ├── .env.example
    ├── package.json / package-lock.json
    ├── data/alira.db                 # Se crea al iniciar; ignorado por Git
    ├── scripts/inspect-db.js
    ├── tests/
    │   ├── api.test.js               # HTTP, SQLite y reinicio real de proceso
    │   └── start-e2e.js              # Backend con base temporal para navegador
    └── src/
        ├── index.js                  # Inicio y cierre del proceso
        ├── app.js                    # Express, CORS, JSON y errores
        ├── config.js
        ├── errors.js
        ├── routes/tasks.js
        ├── controllers/taskController.js
        ├── services/taskService.js
        ├── repositories/taskRepository.js
        └── db/
            ├── database.js
            └── schema.sql            # Migración inicial v1 idempotente
```
Cambios respecto a Fase 2: nuevos shared/, server/, API del cliente, diálogo de importación y pruebas HTTP/navegador; modificados eslint.config.js, App, useTasks, tasks, Header, Sidebar, TaskForm, DeleteTaskDialog, Modal, TaskTable, tasks.css, dependencias, .gitignore y este README. No se reinicializó Vite ni se modificó AGENTS.md.
Flujo: componentes → useTasks → taskApi → rutas/controlador → servicio → repositorio → SQLite. No hay fetch disperso en componentes. La lógica común permanece importable por Node y Vite.

## SQLite y esquema
Archivo predeterminado: **server/data/alira.db**. El directorio y el archivo se crean automáticamente al iniciar.
schema.sql crea tasks con id, titulo, descripcion, categoria, prioridad, estado, fechaLimite, createdAt y updatedAt. Hay claves únicas, NOT NULL, CHECK para tamaños/enumeraciones/fechas, tabla STRICT e índices. La inicialización usa CREATE IF NOT EXISTS y PRAGMA user_version=1; no reinicia tablas ni inserta demos. Se rechazan bases con una versión superior.
IDs estables; fechas de creación/actualización en ISO UTC; fechaLimite YYYY-MM-DD o null. El servicio usa la validación compartida y una validación estricta adicional del cuerpo HTTP.
Las consultas usan parámetros. Las búsquedas/ordenación usan la lógica compartida sobre la lista leída; no se construye SQL con valores del usuario. Adecuado para este MVP local; aún no hay paginación.
WAL y busy_timeout ayudan con el acceso local. Para respaldar, detén el backend y copia el archivo SQLite; no copies solo el .db mientras haya escrituras activas. No se borra ninguna base al arrancar.

Consultar la base, en otra terminal:
```powershell
cd server
npm.cmd run db:inspect
```
El script abre SQLite en modo de solo lectura y muestra una tabla. También puedes abrir el .db con una extensión SQLite de VS Code o DB Browser for SQLite, opcionalmente; no hace falta instalarlos para ejecutar ALIRA. Evita modificar datos manualmente mientras la app está abierta.

## API REST
Respuestas correctas: { "data": ... }. Errores: { "error": { "message": "...", "details": ... } }. DELETE correcto responde 204 sin cuerpo.

| Método | Ruta | Respuesta |
|---|---|---|
| GET | /api/health | 200, servidor y conexión SQLite disponibles |
| GET | /api/tasks | 200, lista |
| GET | /api/tasks/:id | 200 o 404 |
| POST | /api/tasks | 201; 200 en reintento con mismo ID y contenido |
| PUT | /api/tasks/:id | 200, reemplaza atributos editables; conserva ID y createdAt |
| PATCH | /api/tasks/:id/status | 200, cambia solo estado |
| DELETE | /api/tasks/:id | 204 o 404 |
| POST | /api/tasks/import | 200, conteos imported/skipped |

POST/PUT requieren titulo, prioridad y estado. descripcion/categoria/fechaLimite son opcionales; una categoría vacía se convierte en Sin categoría. Título: 3–120 caracteres, descripción: hasta 5000, categoría: hasta 80. Los campos desconocidos se rechazan. PUT no acepta id, createdAt ni updatedAt.
GET /api/tasks admite q (título y descripción), estado, prioridad, categoria, sort=fechaLimite|prioridad|createdAt y order=asc|desc. Los filtros se combinan; sin fecha va siempre al final. Parámetros incorrectos: 400. React conserva el filtrado instantáneo local sobre la lista recibida para actualizar todo el dashboard sin peticiones por tecla.
400: validación/JSON inválido; 403: origen no permitido; 404: ruta/tarea inexistente; 409: conflicto de ID/importación; 413: cuerpo mayor a 1 MB; 415: formato distinto de application/json; 500: error interno con mensaje genérico.

Ejemplos PowerShell (las operaciones de escritura crean/modifican datos reales de ejemplo si las ejecutas):
```powershell
$api = 'http://127.0.0.1:3001/api'
Invoke-RestMethod "$api/health"
Invoke-RestMethod "$api/tasks?estado=pendiente&prioridad=alta&sort=fechaLimite&order=asc"

$body = @{
  titulo = 'Ejemplo: preparar informe'
  descripcion = 'Ejemplo creado manualmente'
  categoria = 'Estudio'
  prioridad = 'alta'
  estado = 'pendiente'
  fechaLimite = '2026-10-16'
} | ConvertTo-Json
$created = Invoke-RestMethod "$api/tasks" -Method Post -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
$id = $created.data.id
Invoke-RestMethod "$api/tasks/$id"
Invoke-RestMethod "$api/tasks/$id" -Method Put -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
Invoke-RestMethod "$api/tasks/$id/status" -Method Patch -ContentType 'application/json' -Body '{"estado":"completada"}'
# Solo si deseas eliminar el ejemplo creado:
Invoke-RestMethod "$api/tasks/$id" -Method Delete
```

## Migrar las tareas de Fase 2
1. Inicia backend y frontend. Abre el **mismo origen y perfil de navegador** usado en Fase 2 (por defecto http://localhost:5173); localStorage depende del origen.
2. La app lee alira.tasks.v1, sin modificarlo. Si hay registros recuperables, muestra Importar tareas locales con su cantidad.
3. Pulsa el botón y confirma la importación. No se importa nada automáticamente.
4. Se preservan IDs y fechas. Los registros con prefijo demo- y la demo en memoria se excluyen.
5. Se informa cuántas tareas fueron importadas y cuántas ya existían. La copia local se conserva **siempre**, incluso después del éxito.
6. Si hay un fallo de conexión, puedes reintentar. Mismo ID y mismos atributos no duplica. Si el ID tiene contenido distinto en SQLite se devuelve 409 y no se sobrescribe.
La importación es atómica por lote (máximo 100 y tamaño ajustado por bytes); si hay varios lotes y uno falla, los anteriores permanecen y el mensaje indica conteos confirmados. Un nuevo intento omite los ya importados.
Los registros incompletos se normalizan para la importación y los inválidos se omiten con aviso. El JSON original y los respaldos de Fase 2 no se borran. Si no hay JSON recuperable, primero recupera una copia válida; no se inventan tareas.
El botón permanece disponible para reintentar porque no se marca ni elimina la copia local. Importarla de nuevo después de editar esas tareas en SQLite puede producir conflictos; es intencional para proteger la versión del servidor.
No se puede identificar una tarea ficticia a la que alguien haya cambiado manualmente el ID; esta app nunca guarda su demo en la clave de tareas personales.

## Carga, errores y coherencia
Las tareas reales se leen de SQLite vía HTTP; localStorage ya no es su persistencia principal. No existe un fallback silencioso que mezcle datos de ambos orígenes.
Las acciones solo actualizan la vista después de recibir una respuesta correcta. Durante una solicitud se bloquea la repetición y se mantienen abiertos los modales. Si falla, se conservan los campos y la última lista recibida y se muestra un error. Hay un límite de espera de 15 segundos. En una interrupción de red el servidor puede haber confirmado una escritura sin que llegue la respuesta: actualiza el listado antes de reintentar. Crear usa un ID estable por formulario para soportar reintentos.
Al iniciar sin conexión no se muestran ceros como estadísticas confirmadas ni un falso estado vacío. Actualizar listado permite recuperar la conexión.
La demo es opcional y usa estado separado en memoria, incluso con el backend desconectado una vez terminada la carga inicial. No escribe en SQLite.
Contadores y progreso reflejan el conjunto recibido, no los filtros. Pendientes incluye en progreso; próximas a vencer incluye hoy y tres días siguientes; completadas se excluyen. Se resaltan vencidas con America/Lima. Mis tareas incluye completadas. Se conserva la búsqueda, filtros y ordenamiento existentes.
No hay actualización en tiempo real entre pestañas: usa Actualizar listado. La lectura local para importar es una instantánea al abrir la app; recarga si cambias localStorage desde otra pestaña.

## Pruebas
En server:
```powershell
npm.cmd test
```
En client:
```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npx.cmd playwright install chromium --only-shell
npm.cmd run test:e2e
```
Las pruebas HTTP usan bases temporales independientes y puertos efímeros. Las pruebas de Chromium levantan sus propios servidores en 3011/5174, se niegan a reutilizar servidores existentes y usan una SQLite temporal; nunca vacían server/data/alira.db. Las bases de navegador quedan en el directorio temporal del sistema, aisladas de los datos personales.
Resultados ejecutados en esta entrega:
- Backend: 9 pruebas correctas, incluidos endpoints, restricciones SQLite, JSON inválido, CORS, filtros, idempotencia, importación y persistencia tras reiniciar un proceso.
- Cliente: 14 pruebas correctas de lógica, servicio HTTP e importación, incluido tamaño de lotes Unicode.
- Chromium: 5 flujos correctos: CRUD con recarga y confirmación, importación/reintento conservando localStorage, fallos de conexión, teclado/móvil 360 px y arranque sin conexión.
- Capturas de escritorio y móvil revisadas en client/test-results (ignoradas por Git); sin desbordamiento horizontal a 360 px.
- Lint y compilación del cliente correctos. El arranque normal, /api/health y db:inspect también se ejecutaron; la base personal quedó vacía, sin registros de prueba.
Los errores esperados de conexión se prueban interceptando las peticiones, sin detener un servidor personal.

## Seguridad y límites
Aplicación **local de un solo usuario**, enlazada por defecto a 127.0.0.1. CORS está restringido al origen configurado, hay límite JSON y errores centralizados sin exponer SQL ni trazas en la API. CORS no sustituye autenticación: **no publiques esta API ni la expongas a la red sin protección de acceso**.
No hay autenticación, IA, calendario de tareas ni recordatorios nuevos en esta fase. Esas secciones siguen señaladas como próximas; el calendario compacto sigue siendo una referencia visual.
Los datos locales de otros perfiles/orígenes no son accesibles automáticamente. No hay resolución visual de conflictos de importación ni sincronización multiusuario.
DM Sans se solicita a Google Fonts con alternativa local. La licencia queda por decidir. No se crearon commits ni se hizo push. AGENTS.md permanece intacto.
