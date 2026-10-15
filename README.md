# ALIRA
**Tu asistente inteligente de tareas · Organiza. Avanza. Logra.**

Fase 5 de 7: estadísticas, productividad y objetivos sobre React, Express y SQLite. La IA corresponde a Fase 6 y todavía no se implementa. Se conserva el dashboard, la navegación, los componentes y la identidad visual de las fases anteriores. Esta entrega sigue el alcance del texto adjunto: las rutas son /api/tasks.

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

La ruta http://127.0.0.1:3001/ no está definida y devuelve 404 «La ruta solicitada no existe»; eso no indica que el servidor haya fallado. El aviso .env not found es informativo cuando se usan los valores predeterminados.

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
schema.sql crea la versión inicial de tasks. La migración 002-reminders.sql añade recordatorio (null, 0, 1 o 3) y la tabla reminder_events, conservando id, titulo, descripcion, categoria, prioridad, estado, fechaLimite, createdAt y updatedAt. Hay claves únicas, NOT NULL, CHECK para tamaños/enumeraciones/fechas, tabla STRICT e índices. La inicialización aplica secuencialmente v1 y v2 dentro de una transacción, según PRAGMA user_version. La migración 003-statistics-goals.sql amplía el historial y las metas. La versión actual es 3. No reinicia tablas ni inserta demos. Una migración fallida revierte sus cambios y no adelanta la versión; una versión superior a 3 se rechaza.
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
| GET | /api/reminders | 200, avisos vigentes, incluidos los leídos |
| PATCH | /api/reminders/:id/read | 200, marca leído de forma idempotente; cuerpo {} |
| POST | /api/reminders/:id/claim | 200, claimed true una sola vez para un intento de notificación; cuerpo {} |
| GET | /api/statistics?from=YYYY-MM-DD&to=YYYY-MM-DD | 200, reporte y revisión |
| GET | /api/statistics/export.csv?from=...&to=...&revision=... | CSV del reporte vigente |
| GET | /api/statistics/export.pdf?from=...&to=...&revision=... | PDF A4 del reporte vigente |
| GET | /api/goals | 200, metas y progreso calculado |
| POST | /api/goals | 201, nueva meta |
| PUT | /api/goals/:id | 200, modifica la meta |
| PATCH | /api/goals/:id/active | 200, cuerpo {"activa":false} o true |

POST/PUT requieren titulo, prioridad y estado. descripcion/categoria/fechaLimite son opcionales; una categoría vacía se convierte en Sin categoría. Título: 3–120 caracteres, descripción: hasta 5000, categoría: hasta 80. Los campos desconocidos se rechazan. PUT no acepta id, createdAt ni updatedAt. recordatorio es opcional: null lo desactiva; 0, 1 o 3 indican días de anticipación y requieren fechaLimite. Una actualización de un cliente anterior que no envíe recordatorio conserva la preferencia si sigue habiendo fecha; al quitar la fecha se desactiva.
GET /api/tasks admite q (título y descripción), estado, prioridad, categoria, sort=fechaLimite|prioridad|createdAt, order=asc|desc y from/to (rango inclusivo de fecha límite YYYY-MM-DD; excluye tareas sin fecha cuando hay un límite). Los filtros se combinan; sin fecha va siempre al final. Parámetros incorrectos: 400. React conserva el filtrado instantáneo local sobre la lista recibida para actualizar todo el dashboard sin peticiones por tecla.
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
Resultados históricos de Fase 3 (consulta los de Fase 4 más abajo):
- Backend: 9 pruebas correctas, incluidos endpoints, restricciones SQLite, JSON inválido, CORS, filtros, idempotencia, importación y persistencia tras reiniciar un proceso.
- Cliente: 14 pruebas correctas de lógica, servicio HTTP e importación, incluido tamaño de lotes Unicode.
- Chromium: 5 flujos correctos: CRUD con recarga y confirmación, importación/reintento conservando localStorage, fallos de conexión, teclado/móvil 360 px y arranque sin conexión.
- Capturas de escritorio y móvil revisadas en client/test-results (ignoradas por Git); sin desbordamiento horizontal a 360 px.
- Lint y compilación del cliente correctos. El arranque normal, /api/health y db:inspect también se ejecutaron; en esa entrega la base personal quedó vacía, sin registros de prueba. Las pruebas de Fase 4 no abren ni vacían la base personal.
Los errores esperados de conexión se prueban interceptando las peticiones, sin detener un servidor personal.

## Seguridad y límites
Aplicación **local de un solo usuario**, enlazada por defecto a 127.0.0.1. CORS está restringido al origen configurado, hay límite JSON y errores centralizados sin exponer SQL ni trazas en la API. CORS no sustituye autenticación: **no publiques esta API ni la expongas a la red sin protección de acceso**.
No hay autenticación ni integración de IA. Estadísticas y Objetivos ya están disponibles. Administración de categorías, asistente IA y configuración general siguen señalados como próximos. Las preferencias de recordatorio están disponibles por tarea.
Los datos locales de otros perfiles/orígenes no son accesibles automáticamente. No hay resolución visual de conflictos de importación ni sincronización multiusuario.
DM Sans se solicita a Google Fonts con alternativa local. La licencia queda por decidir. No se crearon commits ni se hizo push. AGENTS.md permanece intacto.

## Fase 4: calendario y planificación
Después de actualizar el código, **reinicia el backend** con Ctrl+C y npm.cmd start para aplicar la migración. No borres alira.db ni ejecutes el esquema manualmente. Puedes respaldar la base con el servidor detenido antes de actualizar.
Abre http://localhost:5173 y selecciona Calendario en la barra lateral:
- Mes, Semana y Día comparten la misma selección y las mismas tareas que Mis tareas y el dashboard.
- Las semanas comienzan el lunes. Usa las flechas para cambiar de periodo y Hoy para volver al día actual de Lima.
- Las celdas indican cantidades y prioridades con color y texto. En móvil se resumen como A (alta), M (media) y B (baja).
- Al seleccionar un día aparece su lista de actividades. Abre una tarea para ver todos sus detalles o editarla usando el formulario existente.
- Crear para esta fecha precarga la fecha seleccionada; no duplica registros ni asigna horas.
- El calendario compacto del dashboard abre la misma fecha en la vista completa. Próximos vencimientos muestra hasta cinco entregas pendientes por fecha, incluidas las vencidas.
- Planificación separa hoy, mañana, próximos siete días (hoy y los seis siguientes), vencidas, pendientes sin fecha y completadas. Admite orden por fecha y prioridad.
La búsqueda del encabezado filtra el calendario y la planificación por título/descripción. Las tarjetas y próximos vencimientos reflejan todo el conjunto, no la búsqueda.
Las actividades con fecha son de **día completo**: el modelo aún no guarda horas. Se manejan fechas calendario como cadenas; las conversiones para navegar usan UTC a mediodía, sin cambiar la fecha límite por la zona horaria del navegador. El día actual y las comprobaciones de recordatorios usan America/Lima; createdAt/updatedAt siguen siendo instantes UTC.
La navegación contempla cambios de mes/año, fin de mes y años bisiestos. La creación y edición conservan el identificador y el resto de los atributos. No hay arrastre de tareas ni horarios automáticos.

## Fase 4: recordatorios y avisos
En Nueva tarea o Editar tarea, define una fecha límite y elige un recordatorio: Desactivado (por defecto), el mismo día, un día antes o tres días antes. Quitar la fecha apaga el recordatorio. Las tareas anteriores a esta fase empiezan con recordatorios desactivados.
El panel Recordatorios recupera los avisos al iniciar, cada 30 segundos, al volver a la ventana y después de cambios de tareas. Puedes actualizarlo manualmente y marcar los avisos como leídos; Mostrar leídos permite consultarlos después de recargar.
El botón de campana abre ese panel y muestra el número de avisos pendientes. Las tareas completadas, eliminadas, sin recordatorio o cuya fecha cambió no mantienen avisos obsoletos visibles.
Un aviso se genera cuando la fecha local de activación ya llegó, también al reabrir después de varios días: no se pierde por haber tenido la aplicación cerrada. No hay una hora específica de envío ni se inventa una. Se registra una sola combinación tarea/fecha límite/días de anticipación; editar solo el título no genera otro aviso.
Desactivar y reactivar la misma combinación no repite un aviso ya leído o intentado. Cambiar fecha o anticipación crea una combinación distinta, cuando corresponda. Eliminar una tarea elimina sus eventos asociados mediante clave foránea, únicamente tras la confirmación de borrado existente.

### Notificaciones del navegador
Los avisos dentro de ALIRA funcionan sin permiso de notificaciones.
Activar notificaciones del navegador solicita permiso **solo al pulsar el botón** y habilita su envío durante esa sesión. Al recargar hay que activar nuevamente las notificaciones externas; las preferencias por tarea y el estado de lectura permanecen en SQLite.
Solo se intentan si el permiso está concedido, en un contexto seguro compatible. Consulta la [guía de la API de notificaciones](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API).
**ALIRA y el backend deben permanecer abiertos para las comprobaciones automáticas. No hay service worker, Web Push ni avisos garantizados con la aplicación completamente cerrada.** Al volver, el panel recupera los pendientes.
El sistema operativo y el navegador pueden bloquear o retrasar avisos. El constructor de notificaciones no está disponible en todos los navegadores móviles; si falla, permanece el aviso dentro de ALIRA y se informa el error.
Para evitar duplicados entre pestañas y recargas, el servidor reclama atómicamente cada intento antes de abrir la notificación. notifiedAt registra **un intento**, no una entrega garantizada: si el navegador falla después de reclamarlo, no se reintenta automáticamente fuera de ALIRA. El aviso dentro de la app sigue disponible.
No hay preferencias nuevas en localStorage ni un segundo almacén de tareas. La demo no genera avisos ni notificaciones.

### Migración SQLite v2 y nuevos archivos
- server/src/db/migrations/002-reminders.sql: ALTER TABLE aditivo para recordatorio y tabla reminder_events (id, taskId, fechaLimite, daysBefore, triggerDate, createdAt, readAt, notifiedAt), índice y clave única para evitar duplicados.
- server/src/db/database.js: aplica migraciones transaccionales e idempotentes; no ejecuta el esquema v1 sobre una base ya migrada.
- server/src/services/reminderService.js y routes/reminders.js: generación de pendientes, lectura y reclamación atómica.
- shared/calendar.js: navegación por fechas, planificación y fecha de recordatorio.
- client/src/components/CalendarPage.jsx, PlanningPage.jsx, TaskAgendaList.jsx, TaskDetails.jsx, UpcomingCard.jsx y ReminderPanel.jsx: vistas nuevas.
- client/src/hooks/useReminders.js y services/browserNotifications.js: comprobación periódica y notificaciones con permiso.
- client/src/styles/calendar.css: estilos incrementales responsive.
- client/tests/calendar.test.mjs, server/tests/reminders.test.js y client/e2e/calendar.spec.js: pruebas nuevas.
Adaptados App, Sidebar, Header, CalendarCard, TaskForm, main, taskApi, modelo compartido, repositorio/servicio de tareas, app del backend y pruebas anteriores. Se conservaron componentes, API, CRUD, importación y recuperación de las fases previas. No se añadieron dependencias.

### Pruebas de Fase 4
Los comandos siguen siendo npm.cmd test en server/ y client/, npm.cmd run lint, npm.cmd run build y npm.cmd run test:e2e en client/. Ejecuta lint por separado de Playwright para no recorrer carpetas generadas en regeneración.
Se comprueba migración desde v1 con contenido original intacto, reversión ante fallos, reapertura idempotente, persistencia de tareas/avisos tras reiniciar un proceso, rangos de fecha, lectura idempotente, reclamación desde dos conexiones y rechazo de preferencias inválidas.
Las pruebas de fechas cubren meses, semanas, días, años bisiestos y el día local de Lima. Chromium verifica navegación, creación/edición desde calendario sin duplicar tareas, planificación, recordatorios activados/desactivados, recuperación de leídos, permisos, ausencia de duplicados, móvil y regresiones del CRUD/importación.
Las notificaciones externas se prueban con una implementación controlada del objeto Notification: no se afirma haber verificado la entrega real del sistema operativo.
Resultados ejecutados de Fase 4:
- Backend: **14 pruebas correctas**.
- Cliente: **19 pruebas correctas**.
- Playwright/Chromium: **10 flujos correctos**, incluidos los cinco anteriores.
- npm.cmd run lint y npm.cmd run build: **correctos**.
- git diff --check: sin errores de espacios; Git puede avisar de la conversión LF/CRLF configurada en Windows.
- Capturas de escritorio y móvil revisadas; sin desbordamiento horizontal a 360 px.
No se ejecutó la migración sobre la base personal ni se detuvo un servidor del usuario: las verificaciones utilizaron bases y procesos temporales. La migración real se aplica al reiniciar su backend con el código nuevo. No se hicieron commits ni push y no se avanzó a Fase 5.


## Asignaciones para explorar la interfaz
Pulsa **Explorar demo** en el aviso superior. Hay 14 tareas ficticias, incluidas entregas para hoy, vencidas, sin fecha, completadas y actividades de fin de mes y del mes siguiente. La fecha de referencia de la demo es el 14 de octubre de 2026. Visita Mis tareas, Calendario y Planificación para compararlas. Los ejemplos no se guardan en SQLite ni generan notificaciones; Volver a mis tareas recupera la vista personal intacta. Recarga la página si tenías una sesión de demo abierta antes de actualizar el código.

## Fase 5: estadísticas y objetivos
El alcance de esta entrega sigue la numeración del adjunto del usuario: Fase 5 es estadísticas y metas; **no IA**. No se avanzó a Fase 6.
Primero actualiza las dependencias y reinicia el backend (Ctrl+C si estaba abierto), sin borrar SQLite:
```powershell
cd server
npm.cmd install
npm.cmd start
```
En otra terminal desde la raíz:
```powershell
cd client
npm.cmd install
npm.cmd run dev -- --port 5173 --strictPort
```
Abre http://localhost:5173, sal del modo demo y entra en **Estadísticas** u **Objetivos**.
Se añadieron [Recharts](https://recharts.github.io/en-US/api/ResponsiveContainer/) para gráficos y [PDFKit](https://pdfkit.org/docs/getting_started.html) para reportes A4. Los módulos de Estadísticas y Objetivos se cargan al entrar; no es necesario descargar los gráficos para usar el gestor de tareas. La demo está excluida del módulo, las metas y los reportes: los ejemplos no cuentan como datos reales ni se importan automáticamente.
Estadísticas admite últimos siete días, últimos treinta, mes actual y rango personalizado inclusivo de hasta 366 días, sin fechas futuras. Actualizar reporte recupera cambios realizados desde otra pestaña. Los filtros de este módulo son independientes del buscador de tareas del encabezado, que se deshabilita aquí.
Hay gráficos de actividad semanal, estados, prioridades, categorías y tendencia mensual con tooltips, leyendas y tablas de datos desplegables. Los periodos sin actividad se indican expresamente; si solo hay un mes no se inventan meses previos para compararlo.

### Definiciones y fórmulas
1. **Conjunto actual (cohorte):** tareas que aún existen y cuya fecha de creación conocida está entre from y to en America/Lima. Sus estados y prioridades son **actuales**, no una reconstrucción de cómo estaban al terminar un periodo histórico. La distribución por categoría también usa este conjunto.
2. **Total:** cantidad de tareas del conjunto actual. Pendientes, en progreso y completadas son estados separados; en esta sección pendientes no incluye en progreso, a diferencia del resumen global del dashboard.
3. **Porcentaje completado:** 100 × completadas actuales / total del conjunto, redondeado a un decimal; 0% si está vacío. Este indicador solo necesita el estado, no una fecha histórica de finalización.
4. **Vencidas actuales:** tareas del conjunto no completadas con fecha límite anterior a hoy en Lima. **Próximas:** tareas del conjunto no completadas con fecha entre hoy y hoy + 3 días. Son métricas actuales aunque el filtro de creación sea un periodo pasado.
5. **Actividad creada:** identificadores distintos con evento de creación fechado dentro del rango. Incluye tareas eliminadas posteriormente. Las fechas de creación ya existentes se conservan; no se usa updatedAt.
6. **Actividad finalizada:** identificadores distintos con evento real de finalización dentro del rango. Si una tarea se completa varias veces dentro de ese rango, se usa su **primer evento en el rango** y cuenta una vez. Los gráficos diarios/semanales/mensuales agrupan ese mismo conjunto, por lo que suman coherentemente. Al cambiar de rango puede cambiar cuál es el primer evento elegido.
7. **Actividad semanal:** últimos siete días disponibles dentro del rango elegido (o menos si el rango es menor). **Mensual:** suma de creaciones y primeras finalizaciones por mes dentro de los límites seleccionados, no meses completos cuando los límites cortan el mes.
8. **Dentro de plazo:** día local del evento menor o igual a la fecha límite que tenía la tarea al finalizar. Fuera de plazo: posterior. Sin fecha límite: se informa aparte. Cambiar la fecha después no reescribe el evento histórico.
9. **Categorías:** porcentaje = 100 × cantidad de la categoría / total de la cohorte, con un decimal. El listado de categorías con más finalizaciones usa la categoría guardada al finalizar, que puede diferir de la actual.
10. **Promedio diario verificable:** finalizadas únicas / días inclusivos del rango, con dos decimales. Solo se muestra con siete días o más y cuando el rango comienza a partir del día siguiente al inicio del registro; de otro modo aparece No disponible. No se supone que los días anteriores al registro tuvieron cero actividad. El día actual puede estar incompleto.
11. **Mayor actividad:** fecha con más primeras finalizaciones registradas del rango; en un empate se muestra la primera. Sin eventos no se inventa una fecha.
12. **Metas:** avance = 100 × tareas distintas finalizadas en el periodo de la meta / objetivo. La barra se limita a 100%, pero conserva el conteo real aunque supere el objetivo. No usa el filtro de Estadísticas, sino las fechas propias de la meta.

### Historial verificable y migración SQLite v3
La migración 003-statistics-goals.sql es incremental, transaccional e idempotente:
- Añade **tasks.completedAt**, inicialmente null para todas las tareas anteriores. No rellena fechas de finalización con updatedAt.
- Crea **task_events** con tipo created/completed, identificador estable de tarea, instante UTC y copias de categoría, prioridad y fecha límite. Las creaciones históricas usan createdAt ya almacenado; no se insertan eventos de finalización históricos.
- Crea **analytics_metadata** con el instante real de inicio del registro.
- Crea **goals** para nombre, descripción, periodo, cantidad objetivo, estado activo y fechas de creación/actualización.
- Añade índices por fecha de creación/finalización y por tipo, fecha e identificador de eventos.
- Conserva las tareas, preferencias y reminder_events existentes. Una migración fallida se revierte. Bases con versión superior a 3 se rechazan.
Al crear una tarea directamente como completada o pasarla de otro estado a completada, se registra el instante del servidor y un evento dentro de la misma transacción. Editar una tarea ya completada o repetir el mismo estado **no** mueve la fecha ni añade finalizaciones.
Al reabrir, completedAt vuelve a null; el evento anterior se conserva. Una finalización posterior crea un nuevo evento real. Las estadísticas y metas deduplican por tarea dentro de cada periodo.
Importar una tarea antigua que ya estaba completada no fabrica su fecha ni un evento de finalización. Se muestra la cantidad de completadas existentes sin fecha conocida como contexto de **toda la base**, no como una finalización fechada del rango.
El marcador 1970-01-01T00:00:00.000Z usado por la recuperación antigua para fechas de creación desconocidas no se interpreta como una creación real. Se conserva la tarea y se informa que queda fuera de la cohorte temporal; sí puede tener una finalización verificable nueva.
Los eventos no tienen borrado en cascada: eliminar una tarea conserva su actividad mínima registrada (sin título ni descripción), por lo que sus finalizaciones pueden seguir contribuyendo a las metas y los reportes. Por eso las cantidades de actividad pueden ser mayores que el conjunto actual.
El historial no permite reconstruir pendientes al cierre de un día pasado, duración de trabajo ni horas invertidas. ALIRA no muestra esos indicadores ni califica a la persona como productiva/improductiva.

### Objetivos personales
En Objetivos pulsa Nueva meta, indica nombre (3–120 caracteres), descripción opcional (hasta 2000), fecha inicial/final y objetivo entero de 1 a 100000. Puedes editar o desactivar/reactivar una meta sin borrarla.
Las metas próximas, en curso, finalizadas y desactivadas permanecen en el listado; esto constituye el historial disponible. No hay un historial de versiones de cada edición ni se inventan mediciones anteriores.
Una meta cuyo periodo cruza el inicio del registro advierte que su historial puede estar incompleto. Al volver a la sección, recargar o pulsar Actualizar metas se recalcula el progreso. No se modifica ninguna tarea para alcanzar una meta.

### Exportaciones CSV y PDF
Los botones exportan los datos y límites **aplicados**, no un rango personalizado todavía sin aplicar. Una revisión SHA-256 identifica el contenido del reporte; al exportar se recalcula desde SQLite y se compara. Si cambió, el servidor devuelve 409 y solicita actualizar antes de descargar. No se aceptan reportes arbitrarios enviados por el cliente ni se guarda una segunda copia de las tareas.
CSV: UTF-8 con BOM, separado por comas, con nombre ALIRA, periodo, generación UTC, indicadores, distribuciones y actividad diaria/mensual. Los valores se escapan y las posibles fórmulas de hojas de cálculo se neutralizan.
PDF: descarga A4 real, varias páginas, paleta de ALIRA, resumen, advertencias históricas, distribuciones con barras, actividad semanal/mensual y paginación. Usa fuentes estándar; símbolos fuera de su repertorio pueden no representarse correctamente. No requiere la función Imprimir del navegador.
Ejemplo de consulta y descarga en PowerShell:
```powershell
$api = 'http://127.0.0.1:3001/api'
$report = (Invoke-RestMethod "$api/statistics").data
$filters = "from=$($report.from)&to=$($report.to)&revision=$($report.revision)"
Invoke-WebRequest "$api/statistics/export.csv?$filters" -OutFile 'ALIRA.csv'
Invoke-WebRequest "$api/statistics/export.pdf?$filters" -OutFile 'ALIRA.pdf'
```
Un PDF es un reporte de datos registrados, no una certificación de cumplimiento ni de productividad.

### Archivos de Fase 5
Nuevos:
- server/src/db/migrations/003-statistics-goals.sql.
- server/src/services/statisticsCalculator.js, statisticsService.js, goalService.js y reportService.js.
- server/src/routes/statistics.js.
- client/src/components/StatisticsPage.jsx, StatisticsCharts.jsx, GoalsPage.jsx y GoalForm.jsx.
- client/src/hooks/useReport.js y styles/statistics.css.
- server/tests/statistics.test.js y client/e2e/statistics.spec.js.
Modificados: App, Sidebar, Header, main, taskApi, app del backend, inicialización SQLite, repositorio y servicio de tareas, pruebas de migración/reinicio, package.json y lockfiles de cliente/servidor y este README.
Los cálculos están centralizados en el backend; el cliente presenta agregados, gráficos y porcentajes ya calculados. Las agrupaciones diarias se precalculan para no convertir cada evento repetidamente por cada día.

### Verificaciones de Fase 5
Se ejecutan las pruebas completas anteriores y nuevas sobre bases/procesos temporales. No se abre, migra ni vacía la base personal durante las pruebas.
- Backend: fórmulas, categorías, periodos, días locales, datos desconocidos, migración v2→v3, transacciones de finalización, reaperturas, metas, conservación de actividad, CSV y PDF A4.
- Cliente: pruebas existentes de fechas, almacenamiento legado, API, calendario e importación.
- Chromium: filtros, gráficos/tablas accesibles, descargas CSV/PDF, metas y progreso, desactivación/recarga, demo excluida, errores y móvil a 360 px; además de los flujos anteriores de CRUD, calendario y recordatorios.
Comandos:
```powershell
# En server:
npm.cmd test
# En client:
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```
Resultados ejecutados de Fase 5:
- Backend: **22 pruebas correctas**, incluidos reinicio real de proceso y persistencia de metas, migraciones y exportaciones.
- Cliente: **19 pruebas correctas**.
- Playwright/Chromium: **14 flujos correctos**, incluidos los diez anteriores, descargas CSV/PDF y móvil a 360 px.
- **Lint y build correctos**. Capturas de escritorio y móvil revisadas; no hubo desbordamiento horizontal en la comprobación móvil.
- git diff --check: sin errores de espacios. AGENTS.md no se modificó.
Las dependencias instaladas informaron cero vulnerabilidades en las auditorías de npm ejecutadas en cliente y servidor. Las verificaciones no abrieron la base personal ni detuvieron servidores del usuario.
Sin commits, push, autenticación ni IA. No se avanzó a Fase 6.
