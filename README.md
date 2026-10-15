# ALIRA — Gestor Personal de Tareas

**Organiza. Avanza. Logra.**

Aplicación para tareas académicas y personales con React, Express y SQLite. **Fase 6 de 7: PWA multiplataforma, sin inteligencia artificial.** Conserva dashboard, CRUD, búsqueda, filtros, calendario, planificación, recordatorios, estadísticas, objetivos y exportaciones CSV/PDF.

No requiere claves API, servicios de IA ni pagos de inferencia. No se ha publicado, contratado alojamiento ni implementado autenticación.

## Requisitos

- Windows 11, Visual Studio Code y Node.js **24.x**; se ha usado Node 24.21.0.
- npm y un navegador moderno.
- SQLite viene integrado mediante node:sqlite; no necesitas SQL Server, MySQL ni herramientas nativas adicionales.
- Las dependencias se descargan durante la instalación inicial. Después no se necesitan fuentes, CDN ni servicios externos para ejecutar la interfaz y el backend locales.
- Playwright/Chromium se utiliza exclusivamente para pruebas y regeneración opcional de iconos.

## Ejecutar en Windows

Abre la carpeta del proyecto en VS Code y usa dos terminales.

Backend:

```powershell
cd server
npm.cmd install
npm.cmd start
```

Cliente, desde la raíz en otra terminal:

```powershell
cd client
npm.cmd install
npm.cmd run dev -- --port 5173 --strictPort
```

Abre **http://localhost:5173**. API de salud: http://127.0.0.1:3001/api/health.
Ctrl+C detiene cada servidor. El mensaje de .env inexistente es informativo si se usan valores predeterminados. La ruta raíz del backend no es una página web y devuelve 404; abre el cliente, no el puerto 3001.

El modo dev permite trabajar con recarga rápida. **El Service Worker se registra únicamente en la compilación de producción**, para evitar cachés de código de desarrollo.

## Probar la PWA de producción

Mantén el backend iniciado. En client:

```powershell
npm.cmd run build
npm.cmd run preview -- --host localhost --port 5173 --strictPort
```

Detén antes el servidor dev que ocupe 5173. Abre http://localhost:5173 una vez con conexión y deja que termine de preparar los recursos. El origen coincide así con FRONTEND_ORIGIN predeterminado. Si utilizas otro puerto u origen, configúralos de forma coherente y reinicia el backend.

En DevTools > Application puedes inspeccionar Manifest, Service Workers y Cache Storage. La caché alira-static-* contiene solo archivos públicos de la interfaz. No debería haber respuestas de /api.

Para probar offline:

1. Abre la compilación de producción con el backend disponible.
2. Espera al registro del Service Worker y visita Configuración para ver el estado.
3. Activa Offline en DevTools o desconecta la red en una prueba controlada.
4. Recarga: la interfaz precargada debe abrirse y señalar que no puede consultar el backend.
5. Crear, editar, completar o eliminar tareas requiere conexión; no se simula guardado ni se crea una cola.
6. Restablece la conexión. ALIRA vuelve a consultar el servidor automáticamente, como máximo en unos diez segundos más el tiempo de respuesta.

En Chromium, el modo offline automatizado puede bloquear también localhost. En uso real, **perder internet no impide trabajar si el navegador y ambos servidores siguen comunicándose localmente**. Perder acceso al backend sí impide leer datos actuales y escribirlos.

## Instalación en computadora, celular y tablet

- **PC con Chrome/Edge:** usa Instalar ALIRA cuando el navegador lo habilite, o su opción Instalar aplicación.
- **Android y tablets compatibles:** usa Instalar aplicación o Añadir a pantalla de inicio desde el menú del navegador.
- **iPhone/iPad:** abre en Safari y utiliza Compartir > Añadir a pantalla de inicio, según las opciones del dispositivo.
- Si el navegador no ofrece beforeinstallprompt, ALIRA no muestra un botón inactivo: proporciona instrucciones alternativas en Configuración.
- Cuando está en modo standalone o se recibe el evento appinstalled, deja de ofrecer la instalación en esa sesión.

La instalación añade acceso y ventana propia; **no equivale a una app nativa publicada en una tienda**. La disponibilidad depende del navegador y sistema. Se verificaron criterios de instalación en Chromium automatizado y el comportamiento del botón mediante eventos controlados; no se comprobó instalación física en Android/iOS.

### HTTPS y otros dispositivos

Service Workers requieren un contexto seguro: HTTPS, con la excepción de localhost durante desarrollo. Consulta la [documentación de Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

localhost en un celular se refiere al propio celular, no a la laptop. La configuración local actual no expone el backend a la red. Para una futura prueba entre dispositivos necesitarás una dirección alcanzable, certificado HTTPS confiable, proxy hacia la API, origen CORS correcto y autorización para los cambios de red. No se modificó firewall, HOST ni la red.

Si la base y el backend están en una laptop apagada, los otros dispositivos no podrán consultar ni guardar tareas. La PWA instalada no reemplaza ese servidor. El alojamiento central, HTTPS público, autenticación y acceso remoto son el alcance pendiente de Fase 7.

## Configuración

Los ejemplos se encuentran en server/.env.example y client/.env.example. Copia a .env solo si todavía no existe; conserva cualquier configuración previa.

| Archivo | Variable | Predeterminado |
|---|---|---|
| server/.env | HOST | 127.0.0.1 |
| server/.env | PORT | 3001 |
| server/.env | FRONTEND_ORIGIN | http://localhost:5173 |
| server/.env | DB_PATH | ./data/alira.db |
| client/.env | VITE_API_URL | /api |

VITE_API_URL se incorpora al compilar; reinicia Vite o vuelve a generar build si cambia. Una URL absoluta, como http://127.0.0.1:3001/api, también es compatible, pero no uses localhost para representar un servidor remoto desde un celular.

Por defecto, Vite dev y preview reenvían /api al backend local http://127.0.0.1:3001. El destino del proxy se puede cambiar para pruebas mediante ALIRA_DEV_API_TARGET en el entorno de Vite. No es una variable pública del cliente.

Para publicación futura se recomienda servir interfaz y /api bajo el mismo origen HTTPS mediante un proxy inverso autorizado. El servidor estático que uses tendrá que configurar ese proxy; el proxy de Vite no forma parte de los archivos dist.

DB_PATH relativo se resuelve desde server/, independientemente de la terminal. Los archivos .env y las bases SQLite están ignorados por Git. No se necesitan AI_API_KEY, AI_MODEL ni variables similares.

## Funcionalidades

- Dashboard con totales, pendientes, completadas, próximas a vencer y progreso.
- Tareas: alta, edición, cambio de estado, confirmación de borrado y validación de título, fechas, prioridad y categoría.
- Búsqueda por título/descripción; filtros combinables y ordenamiento por fecha límite, prioridad y creación.
- Calendario mensual, semanal y diario; creación desde una fecha y consulta de detalles.
- Planificación: hoy, mañana, próximos siete días, vencidas, sin fecha y completadas.
- Recordatorios por tarea el día de entrega, uno o tres días antes. Preferencias, avisos leídos y reclamaciones se conservan en SQLite.
- Notificaciones del navegador solo con permiso y durante la sesión. Requieren la aplicación abierta; no hay push ni avisos con la app cerrada.
- Estadísticas con periodos, gráficos y tablas accesibles.
- Objetivos personales: crear, editar, desactivar/reactivar y consultar avance real.
- Reportes CSV y PDF A4, con revisión del servidor para impedir exportar una versión desactualizada.
- Demo opcional identificada y separada en memoria; no inserta tareas en SQLite.
- Importación explícita de localStorage legado, por lotes, sin borrar originales ni sobrescribir conflictos.
- Configuración básica: instalación PWA, estado offline e instrucciones de conexión.

### Datos y métricas

El día de referencia es America/Lima; fechaLimite usa YYYY-MM-DD local y los instantes de creación, actualización y finalización usan ISO UTC. Una tarea vencida tiene fecha anterior a hoy y no está completada; no se guarda como estado independiente.

Estados: pendiente, en_progreso y completada. Prioridades: alta, media y baja. Título de 3 a 120 caracteres, descripción hasta 5000, categoría hasta 80; recordatorio null, 0, 1 o 3 con fecha válida.

La cohorte estadística se selecciona por fecha de creación; la actividad del periodo usa eventos reales de creación/finalización. No se infiere completedAt a partir de updatedAt. Reabrir no borra los eventos anteriores; las finalizaciones se deduplican por tarea en el periodo. Las metas cuentan tareas distintas finalizadas dentro de sus propias fechas.

Las finalizaciones históricas desconocidas no se inventan. Los informes señalan cobertura parcial y el inicio del registro. Los eventos conservan información mínima de actividad aunque se elimine una tarea. El cumplimiento dentro/fuera de plazo usa la fecha límite registrada al finalizar. No se estiman horas trabajadas ni productividad personal.

CSV escapa los campos y neutraliza posibles fórmulas de hojas de cálculo. PDF usa fuentes estándar locales; algunos caracteres fuera de su repertorio pueden no representarse.

## Conexión y offline seguro

ALIRA consulta realmente /api/tasks al iniciar, cada diez segundos y al regresar a la ventana o reconectar. No depende solo de navigator.onLine. La disponibilidad indicada corresponde al último resultado real, no garantiza que una solicitud posterior no pueda fallar.

Cuando falta backend:
- Se indica la desconexión y se bloquean las acciones de escritura identificadas como no disponibles.
- La última lista en memoria puede permanecer visible, claramente advertida como desactualizada.
- No se muestran ni exportan estadísticas antiguas como actuales.
- Tras una recarga offline no se recuperan tareas desde la caché: solo la interfaz estática.
- La reconexión sustituye los datos con los de SQLite; no crea tareas, duplica almacenamiento ni reenvía escrituras.

Un fallo de red durante una operación no equivale a un guardado confirmado. Los formularios conservan sus campos. Actualiza el listado antes de reintentar; las creaciones usan identificadores estables para evitar duplicaciones accidentales. No existe edición offline ni sincronización multiusuario.

## Arquitectura PWA y archivos

| Archivo o grupo | Función |
|---|---|
| client/public/manifest.webmanifest | Nombre, alcance, standalone y colores |
| client/public/alira.svg y icons/*.png | Logo original e iconos 192, 512, maskable 512 y Apple 180 |
| client/pwa.mjs | Plugin local Vite y código del SW; versión basada en bundle, política y recursos públicos |
| client/vite.config.js | Integración del plugin y proxy /api |
| client/src/hooks/usePwa.js | Registro, instalación y actualización controlada |
| client/src/components/PwaPanel.jsx | Instalación y configuración básica |
| client/src/styles/pwa.css | Responsive y controles táctiles |
| client/src/hooks/useTasks.js | Consultas reales, recuperación y bloqueo de escrituras sin conexión |
| client/src/services/taskApi.js | Única capa HTTP y URL configurable |
| client/src/components/{TaskTable,CalendarPage,PlanningPage,StatisticsPage,GoalsPage,ReminderPanel}.jsx | Funciones de gestión conservadas |
| server/src/{routes,controllers,services,repositories}/ | REST, validación, cálculos y acceso SQL |
| server/src/db/ | Esquema y migraciones incrementales |
| shared/tasks.js y calendar.js | Modelo, validación, días locales y calendario |
| client/scripts/generate-icons.mjs | Regeneración local del logo a PNG |
| client/tests/pwa.test.mjs y e2e-pwa/ | Caché, instalación, offline, reconexión y actualización |
| server/tests/without-ai.test.js | Rutas IA retiradas y preservación de conversaciones |

El Service Worker precarga solo HTML, JS/CSS, manifest, logo e iconos de la compilación, incluidos los módulos diferidos de estadísticas y metas. No intercepta escrituras, /api ni otros orígenes. No guarda respuestas privadas ni reportes.

Los recursos estáticos propios usan la caché versionada; las navegaciones intentan la red y, si falla, abren index.html precargado. Una versión nueva se instala en espera. El usuario puede guardar/cerrar formularios y pulsar Actualizar ALIRA; esto activa la versión y recarga las pestañas controladas. También se activa al cerrar las pestañas antiguas. Se eliminan solo cachés alira-static-* obsoletas, sin tocar otras cachés ni SQLite. Se comprueban actualizaciones al abrir y aproximadamente cada hora con la app abierta.

## API REST

Respuestas JSON: {data: ...}; errores: {error: {message: ...}}. SQL parametrizado y validación en backend.

| Método | Ruta | Operación |
|---|---|---|
| GET | /api/health | Estado de API/SQLite |
| GET, POST | /api/tasks | Listar con filtros / crear |
| GET, PUT, DELETE | /api/tasks/:id | Consultar / editar / eliminar |
| PATCH | /api/tasks/:id/status | Cambiar estado |
| POST | /api/tasks/import | Importar lote legado |
| GET | /api/reminders | Recuperar avisos |
| PATCH | /api/reminders/:id/read | Marcar leído |
| POST | /api/reminders/:id/claim | Reclamar notificación una sola vez |
| GET | /api/statistics | Agregados por periodo |
| GET | /api/statistics/export.csv y export.pdf | Descargar reporte con revisión |
| GET, POST | /api/goals | Listar / crear metas |
| PUT | /api/goals/:id | Editar meta |
| PATCH | /api/goals/:id/active | Activar/desactivar meta |

Las antiguas rutas /api/assistant ya no existen.

## SQLite y conservación de datos

No se reinicializó ni se eliminó la base personal. SQLite sigue siendo la fuente de verdad; no se añadieron tablas para duplicar datos offline.

Migraciones conservadas:
1. schema.sql: tareas y restricciones.
2. 002-reminders.sql: preferencias y registros de recordatorios.
3. 003-statistics-goals.sql: completedAt, task_events, analytics_metadata y goals.
4. 004-assistant.sql: tablas históricas conversations, conversation_messages y assistant_proposals, **inactivas y conservadas**.

Se mantiene user_version=4 para abrir bases existentes e inicializar entornos compatibles. La migración histórica 004 permanece; no se usan ni borran sus datos. No existe un nuevo endpoint de lectura/borrado de conversaciones. Una eventual eliminación necesitaría autorización explícita y una migración independiente. Los servicios, SDK, variables y pruebas exclusivos de IA se retiraron; los módulos de tareas, reportes y estadísticas siguen activos.

La inicialización es incremental, transaccional e idempotente. No inserta demos y rechaza versiones superiores a la soportada. Antes de trasladar datos entre equipos, detén el backend y realiza una copia segura de la base; no borres archivos WAL de una base activa.

## Pruebas

Backend:

```powershell
cd server
npm.cmd test
```

Cliente:

```powershell
cd client
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run test:pwa
```

Si Chromium no está instalado: npx playwright install chromium (requiere descargarlo una vez). Para regenerar los PNG del logo: npm.cmd run icons:generate; los iconos ya están incluidos y no hace falta regenerarlos para ejecutar ALIRA.

test:e2e utiliza servidores 3011/5174 y SQLite temporal. test:pwa compila producción, usa 3012/5175 y una base temporal separada. No vacían ni usan la base personal. La prueba de actualización utiliza un servidor estático temporal adicional.

La cobertura incluye CRUD, filtros, importación, persistencia/reinicio, calendarios, recordatorios, metas, métricas, reportes, manifest, dimensiones PNG, registro del SW, criterios de instalación de Chromium, caché sin API, offline, API caída con navegador online, reconexión y tamaños 360/390/768/1024/1440 px. La instalación del botón se prueba con eventos simulados; no equivale a instalación real en equipos físicos.

## Limitaciones y siguiente fase

- Aplicación local de un usuario, sin autenticación ni autorización multiusuario.
- No publicada en internet; no se contrató alojamiento ni se cambiaron red/firewall.
- El navegador puede eliminar su caché por falta de espacio; hay que volver a abrir con conexión para prepararla.
- El backend debe estar disponible para todos los datos actuales y escrituras.
- No hay push, edición offline, colas de sincronización ni sincronización multiusuario.
- No se comprobó instalación física en Android, iOS o tablets reales.
- Fase 7 pendiente de revisión: alojamiento, HTTPS público, autenticación, acceso remoto y controles de seguridad.

No se crearon commits ni se hizo push.


### Resultados ejecutados de esta entrega

| Comprobación | Resultado |
|---|---|
| Backend, npm.cmd test | 23/23 correctas |
| Cliente, npm.cmd test | 22/22 correctas |
| Regresión Playwright, npm.cmd run test:e2e | 14/14 correctas |
| Producción PWA, npm.cmd run test:pwa | 10/10 correctas |
| npm.cmd run lint | Correcto |
| npm.cmd run build | Correcto; también compilado por test:pwa |
| git diff --check | Sin errores |

Se revisaron capturas automatizadas y ausencia de desbordamiento en 360, 390, 768, 1024 y 1440 px. La actualización del Service Worker se verificó con dos versiones reales servidas por un servidor de prueba local. No se probó instalación física en Android/iOS ni publicación en internet. Las auditorías de instalación ejecutadas informaron cero vulnerabilidades en cliente y servidor.
