# ALIRA — Gestor Personal de Tareas

**Organiza. Avanza. Logra.**

Gestor de actividades académicas y personales con React, Express, SQLite y PWA. **Fase 8: optimización de interfaz y gestión académica, con seguridad y PWA conservadas.** No utiliza inteligencia artificial.

El código queda preparado para revisión de producción. **No se ha publicado**, contratado alojamiento ni configurado un dominio. La cuenta real del propietario se elige localmente; no se incluyen usuarios ni contraseñas predeterminados.

## Funcionalidades

- Dashboard, CRUD de tareas por formularios, estados y prioridades.
- Búsqueda, filtros combinables y ordenamiento.
- Calendario mensual/semanal/diario y planificación.
- Recordatorios por fecha, avisos leídos persistentes y notificaciones con permiso.
- Estadísticas verificables, metas y reportes CSV/PDF A4.
- PWA responsive e instalación cuando el navegador la admite.
- Inicio de sesión, cierre, caducidad, cambio de contraseña y revocación de sesiones.
- Lectura centralizada desde distintos dispositivos, reconexión y detección de conflictos.
- Respaldos consistentes bajo demanda y periódicos; restauración segura a un archivo nuevo.
- Demo identificada y separada, sin insertarse como datos reales.

No hay registro público, IA, edición offline, colas de sincronización ni bases independientes por dispositivo.

## Requisitos

Windows 11 y VS Code, Node.js **24.x**, npm y un navegador moderno. SQLite se incluye mediante node:sqlite. React 19, Vite 7, Express 5, lucide-react, Recharts y PDFKit se instalan desde los lockfiles.

Las dependencias necesitan internet para instalarse inicialmente. La aplicación no utiliza fuentes ni CDN externos en ejecución. Playwright y Chromium se usan solo para pruebas y regeneración opcional de iconos.

## Instalación y cuenta propietaria

En una terminal privada de VS Code:

```powershell
cd server
npm.cmd install
npm.cmd run admin:create
```

El comando solicita un nombre y una contraseña **oculta**, de 12 a 128 caracteres, con confirmación. No escribas tu contraseña en el código, en .env, en argumentos del shell ni en el chat. El nombre admite de 3 a 80 letras, números, puntos, guiones y guiones bajos.

Solo se permite un propietario. Si ya existe, el comando no lo reemplaza. No existe endpoint remoto para reclamar o crear esta cuenta. Si todavía no está configurada, el servidor puede mostrar la pantalla informativa, pero todos los datos personales permanecen bloqueados.

Inicia el backend:

```powershell
npm.cmd start
```

En otra terminal, desde la raíz:

```powershell
cd client
npm.cmd install
npm.cmd run dev -- --port 5173 --strictPort
```

Abre **http://localhost:5173** e inicia sesión. Usa siempre este mismo host en desarrollo: /api pasa por el proxy de Vite. No mezcles localhost con 127.0.0.1 para las cookies del navegador.

Ctrl+C detiene cada servidor. Para recarga del backend durante desarrollo: npm.cmd run dev en server. Una respuesta 401 sin iniciar sesión es el comportamiento esperado. La raíz del puerto 3001 no es el frontend en modo desarrollo.

### Probar la PWA local

Mantén el backend iniciado. Detén el servidor dev que ocupe 5173 y ejecuta en client:

```powershell
npm.cmd run build
npm.cmd run preview -- --host localhost --port 5173 --strictPort
```

Abre http://localhost:5173 con conexión inicialmente. El Service Worker solo se registra en producción, incluida esta vista previa. Preview prueba la compilación local; **no sustituye el servidor productivo Express**.

## Variables

Copia .env.example a .env únicamente si no existe. No sobrescribas una configuración previa. Reinicia al cambiar variables del servidor; las VITE_ requieren recompilar el cliente.

| Variable | Desarrollo | Producción |
|---|---|---|
| NODE_ENV | development o sin definir | production |
| HOST | 127.0.0.1 | Interfaz del contenedor/servidor autorizado |
| PORT | 3001 | Puerto del proveedor o 3001 |
| FRONTEND_ORIGIN | http://localhost:5173 | Origen HTTPS exacto sin barra final |
| DB_PATH | ./data/alira.db | Ruta absoluta en volumen persistente |
| SESSION_HOURS | 168 | Entre 1 y 720 |
| TRUST_PROXY | vacío | IP/CIDR o redes explícitas del proxy autorizado |
| BACKUP_DIR | ./backups | Ruta absoluta en almacenamiento separado |
| BACKUP_INTERVAL_HOURS | 0 en ejemplo local | 24 por defecto si no se define; 0 desactiva |
| VITE_API_URL, en client | /api | /api |

DB_PATH y BACKUP_DIR relativos se resuelven desde server. BACKUP_DIR no puede estar dentro de la carpeta principal de datos. Producción exige rutas absolutas, origen HTTPS y TRUST_PROXY explícito. No verifica por sí sola que el operador haya montado realmente un volumen: eso debe comprobarse antes de publicar.

En Vite dev/preview, ALIRA_DEV_API_TARGET permite cambiar el destino del proxy /api; por defecto es http://127.0.0.1:3001. No es una variable pública ni forma parte de dist.

No se necesita un secreto de sesión global: las sesiones usan tokens aleatorios y hashes almacenados. No se incluyen claves de servicios externos.

## Autenticación y seguridad

Las contraseñas usan **scrypt asíncrono**, N=131072, r=8, p=1, sal aleatoria de 16 bytes y hash de 64 bytes, con comparación constante. Es una alternativa moderna sin dependencia nativa adicional; referencia de parámetros: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

Las sesiones usan tokens aleatorios de 32 bytes; SQLite guarda únicamente SHA-256, propietario, creación y expiración. El navegador recibe una cookie HttpOnly, Path=/ y SameSite=Strict. En producción se añade Secure y el nombre __Host-alira.sid. En desarrollo HTTP local se usa alira.sid. La sesión dura siete días por defecto, sin renovación indefinida.

Logout elimina la sesión del servidor y desmonta los datos privados de la interfaz. Cambiar contraseña exige verificar la actual, actualiza su hash y revoca todas las sesiones. Otras pestañas reciben la señal local de salida; otros dispositivos se verifican al enfocar, al consultar la API o en las comprobaciones de sesión.

Si falla la red durante logout, se bloquea la interfaz local y se advierte que la revocación no pudo confirmarse. Al volver a iniciar sesión se reemplaza la sesión de ese navegador. No se afirma un cierre remoto que no fue confirmado.

Protecciones:
- Sesión obligatoria en todos los endpoints personales, incluidas importación, respaldos y reportes.
- Token CSRF derivado de la sesión para todas las escrituras autenticadas; se mantiene solo en memoria del cliente. No se muestra en Configuración.
- Login con JSON y cabecera propia; rechazo de Origin ajeno y Sec-Fetch-Site cross-site.
- Cinco intentos por IP cada quince minutos; los accesos válidos reinician el contador de esa IP. Límite global de treinta solicitudes de acceso por quince minutos. Los contadores se guardan en SQLite.
- Hasta dos verificaciones de login simultáneas, veinte sesiones persistentes y seiscientas solicitudes autenticadas por minuto y sesión.
- Cambio de contraseña y verificación de respaldo con límites adicionales.
- Cuerpos privados de hasta 1 MB y login de hasta 4 KB.
- SQL parametrizado, errores públicos genéricos y logs sin cuerpos, contraseñas, cookies o tokens.
- CSP, HSTS productivo, X-Frame-Options, nosniff, política de referentes y permisos restringidos.

CORS está limitado a FRONTEND_ORIGIN y permite credenciales; no sustituye autenticación. En producción se usa el mismo origen para cookies y API. No hay MFA ni recuperación pública por correo; guarda la contraseña en un gestor seguro.

## Sincronización online y conflictos

SQLite central es la única fuente de verdad. Todos los dispositivos autorizados acceden al mismo backend. No se guarda una segunda copia de tareas en localStorage o IndexedDB. localStorage legado se importa explícitamente, conservando originales y rechazando conflictos.

Las tareas se recuperan al iniciar, cada diez segundos, al volver a la ventana y al reconectar. Las metas también se actualizan periódicamente y al volver a la ventana. Existe actualización manual. Los recordatorios se revisan con la aplicación abierta.

Las tareas y metas incluyen **version**, incrementada por SQLite. PUT/PATCH/DELETE requieren la cabecera If-Match, por ejemplo el texto entre comillas `"3"` para version=3. El servidor valida versión y escritura dentro de una transacción; la respuesta de éxito sale después de COMMIT.

Un formulario conserva la versión que tenía al abrirse. Si otro dispositivo cambió el registro, la API devuelve **409**, conserva la edición del servidor y solicita actualizar/revisar. Si falta la precondición devuelve **428**. No se sobrescribe silenciosamente ni se reenvía una escritura automáticamente.

Crear una tarea utiliza un identificador estable para evitar duplicación al reintentar. Los cambios se reflejan solo tras recibir la respuesta real del servidor. Un fallo de red no acredita guardado; revisa el listado antes de repetir.

## PWA, privacidad y dispositivos

Manifest con nombre ALIRA, standalone, colores lavanda y morado, iconos locales 192/512, maskable 512 y Apple 180, derivados del logo original. El botón Instalar ALIRA solo aparece cuando el navegador ofrece beforeinstallprompt. En otros casos Configuración proporciona instrucciones:
- PC: Instalar aplicación desde Chrome/Edge cuando esté disponible.
- Android/tablets: Instalar o Añadir a pantalla de inicio según navegador.
- iPhone/iPad: Safari > Compartir > Añadir a pantalla de inicio.

Instalar no equivale a publicar una app nativa en tiendas. No se verificó instalación física en Android/iOS; las pruebas usan Chromium y eventos controlados.

El SW guarda **únicamente archivos públicos estáticos** de la compilación, incluidos módulos diferidos de gráficos. Nunca intercepta escrituras, /api ni destinos externos. Los datos privados y reportes tienen Cache-Control: no-store.

Una recarga offline puede abrir la pantalla pública, pero no acredita una sesión ni recupera tareas. Si una sesión ya estaba verificada y se pierde conexión, la información en memoria se identifica como desactualizada y las escrituras quedan bloqueadas. Al salir se desmonta el dashboard; no quedan datos personales en Cache Storage.

Las actualizaciones del SW se instalan en espera. Guarda/cierra formularios antes de actualizar: la activación recarga las pestañas controladas. Se eliminan únicamente cachés propias antiguas; nunca datos SQLite ni cachés de otras aplicaciones.

Para acceso desde un celular/tablet se necesita una URL HTTPS alcanzable y el backend central activo. localhost en el celular no representa la laptop. Una laptop apagada no puede servir datos a otros dispositivos. No se abrió la red ni se modificó el firewall.

## Datos y migraciones SQLite

No se reinicializa la base ni se eliminan tareas, recordatorios, historial, metas o conversaciones antiguas.

| Versión | Contenido |
|---|---|
| 1 | Tareas y restricciones |
| 2 | Preferencias y registros de recordatorios |
| 3 | completedAt, task_events, analytics_metadata y goals |
| 4 | Tablas históricas de conversaciones, conservadas e inactivas |
| 5 | owner, sessions, auth_attempts y versiones/triggers de tareas y metas |
| 6 | Semestres, asignaturas, sesiones semanales, relaciones académicas y ampliación del ledger de avisos |

Las migraciones se aplican secuencialmente en una transacción, son idempotentes y rechazan versiones superiores a 6. La cuenta no se crea automáticamente durante la migración.

Las fechas límite son días locales YYYY-MM-DD de America/Lima; los instantes son ISO UTC. El título admite 3–120 caracteres. Prioridades alta/media/baja; estados pendiente/en_progreso/completada. Los datos demo siguen separados.

Las estadísticas conservan la distinción entre estados actuales y eventos históricos. No se inventan finalizaciones a partir de updatedAt. Las metas cuentan tareas distintas finalizadas en sus fechas. CSV neutraliza fórmulas y PDF es A4 con fuentes locales; algunos caracteres especiales pueden no representarse.

## API

Públicos mínimos: GET /api/health, GET /api/auth/session y POST /api/auth/login.
Todas las rutas siguientes requieren sesión:

| Rutas | Operación |
|---|---|
| POST /api/auth/logout | Revocar sesión |
| POST /api/auth/password | Cambiar contraseña y revocar todas |
| GET /api/settings | Versión y almacenamiento |
| POST /api/settings/backup | SQLite consistente; exige contraseña actual y CSRF |
| GET, POST /api/tasks | Listar/crear |
| GET, PUT, DELETE /api/tasks/:id | Consultar/editar/eliminar |
| PATCH /api/tasks/:id/status | Cambiar estado |
| POST /api/tasks/import | Importar datos legados |
| GET /api/reminders | Avisos |
| PATCH /api/reminders/:id/read | Marcar leído |
| POST /api/reminders/:id/claim | Reclamar notificación |
| GET /api/statistics | Estadísticas |
| GET /api/statistics/export.csv y export.pdf | Descargar reportes con revisión |
| GET, POST /api/goals | Listar/crear metas |
| PUT /api/goals/:id | Editar meta |
| PATCH /api/goals/:id/active | Activar/desactivar |

No existen rutas de registro público ni de IA. Las respuestas JSON siguen {data: ...} o {error: {message: ...}}.

## Copias de seguridad

En Configuración puedes descargar un respaldo verificando tu contraseña. Las copias contienen tareas, metas, historial, conversaciones antiguas y hash de acceso: son **privadas**. No contienen sesiones reutilizables ni contadores de intentos.

También puedes ejecutar desde server:

```powershell
npm.cmd run db:backup
```

Se usa sqlite.backup sobre la base activa, se verifica integridad y se publica la copia completa por renombrado. No se copia simplemente el .db mientras WAL está activo. Los archivos se crean con permisos restrictivos cuando el sistema lo soporta; en Windows configura también ACL privadas.

Con BACKUP_INTERVAL_HOURS mayor que cero se genera una copia al iniciar y periódicamente (24 h por defecto en producción). No hay trabajos externos o servicios de pago. El temporizador necesita que el proceso esté activo.

**Estrategia del operador:** volumen de datos y almacenamiento de respaldos separados; copia diaria cifrada fuera del servidor/volumen principal; al menos siete diarias y cuatro semanales, control de espacio y prueba mensual de restauración. El programa no borra automáticamente respaldos del usuario ni sube archivos a terceros. La replicación externa y rotación necesitan configurarse en el alojamiento autorizado.

### Restaurar sin tocar la base principal

```powershell
npm.cmd run db:restore -- --source RUTA_DE_COPIA.db --target RUTA_NUEVA_RESTAURADA.db
```

El destino debe ser nuevo y diferente de DB_PATH. Se comprueba integridad, se aplican migraciones compatibles y se eliminan sesiones/contadores de la copia restaurada. Un reemplazo de la base principal requiere **autorización expresa**, servidor detenido, respaldo reciente y verificación previa de esta copia temporal. Este trabajo no realizó ninguna restauración sobre la base personal.

No borres WAL de una base activa. Un rollback de código no deshace migraciones: conserva la versión de esquema compatible o restaura una copia anterior verificada, solo con aprobación y considerando los cambios posteriores.

## Producción y despliegue pendiente

Estrategia preparada: **un contenedor Node 24, un origen HTTPS y una instancia con SQLite persistente**. Express sirve client/dist y /api. Un proxy autorizado termina TLS y reenvía el protocolo; TRUST_PROXY se limita a sus direcciones reales. No uses true, confianza irrestricta ni soluciones que desactiven las cookies Secure.

Dockerfile construye el frontend, instala solo dependencias productivas del servidor y ejecuta como usuario node. .dockerignore excluye entornos, bases, respaldos y archivos de desarrollo. Los volúmenes son /data y /backups. El endpoint /api/health funciona para supervisión interna; el resto de producción exige HTTPS.

Preparación local de imagen, solo si tienes Docker:

```powershell
docker build -t alira:0.8.0 .
```

Antes de iniciar producción, configura FRONTEND_ORIGIN, TRUST_PROXY, almacenamiento y propietario. Ejemplo de creación privada del propietario en un volumen nombrado:

```powershell
docker run --rm -it -e FRONTEND_ORIGIN=https://alira.tu-dominio -e TRUST_PROXY=loopback -v alira-data:/data -v alira-backups:/backups alira:0.8.0 npm run admin:create
```

Este comando no publica puertos. loopback solo es correcto si el proxy realmente llega por loopback; para el servicio real usa su IP/CIDR o red confiable explícita. No copies este valor sin validar la topología. Monta volúmenes nombrados o bind mounts persistentes; no dependas de volúmenes anónimos.

Si alojas fuera de contenedor, compila client, instala dependencias de server, configura NODE_ENV=production, rutas absolutas persistentes y un supervisor que gestione reinicios y cierre SIGTERM. Mantén el puerto de Node accesible únicamente al proxy. No expongas /data, /backups o archivos .env mediante el servidor estático.

### Railway evaluado, no contratado

Consulta del 15/10/2026: Railway publica un plan Hobby de **USD 5/mes**, que incluye USD 5 de uso; el exceso se factura. También presenta Free/Trial con límites menores; no se asume que sean adecuados para disponibilidad y respaldos de esta aplicación. La tabla consultada indica hasta 5 GB de volumen para Hobby. Verifica nuevamente antes de elegir. Fuentes: [planes](https://docs.railway.com/pricing/plans) y [volúmenes](https://docs.railway.com/volumes).

Railway exige prestar atención al montaje del volumen durante ejecución, no durante build/pre-deploy, y a permisos del usuario del contenedor. El Dockerfile corre sin root: antes de adoptarlo hay que resolver los permisos del volumen mediante un procedimiento aprobado; no se cambió a root automáticamente.

Usar una instancia, DB_PATH sobre el volumen, dominio HTTPS y proxy verificado. La inicialización del propietario necesita acceso privado al entorno con el volumen montado, nunca un endpoint de reclamación público. La copia externa cifrada requiere un destino fuera del volumen principal.

No se seleccionó definitivamente una plataforma, activó un plan ni contrató un servicio. Railway queda como candidato sujeto a costo, permisos, política de respaldo y aprobación del usuario.

### Publicación y reversión

Antes de autorizar publicación: elegir dominio/alojamiento, confirmar costo y persistencia, configurar proxy/TLS, crear propietario por terminal, probar cookies Secure, login/CSRF, descargas, dos dispositivos y restauración desde respaldo externo. Conserva una imagen/versionado anterior y una copia previa a cualquier migración.

Para revertir código, utiliza una imagen compatible con el esquema actual. Para revertir datos, detén el servicio y restaura primero a un destino nuevo; revisa pérdida de cambios posteriores y solicita aprobación antes de reemplazar producción. No apliques automáticamente una imagen antigua a un esquema no compatible.

## Archivos principales

| Grupo | Archivos |
|---|---|
| Migración | server/src/db/migrations/005-security.sql y db/database.js |
| Autenticación | services/passwords.js, authService.js y middleware/security.js |
| API y producción | server/src/app.js, config.js e index.js |
| Respaldos | services/backupService.js y scripts/backup.js, restore.js |
| Alta privada | server/scripts/admin-create.js |
| Interfaz | AuthGate.jsx, SecuritySettings.jsx, App.jsx, Header.jsx y auth.css |
| Concurrencia | taskApi.js, useTasks.js, GoalsPage.jsx y DeleteTaskDialog.jsx |
| Despliegue | Dockerfile, .dockerignore, .env.example y lockfiles |
| Pruebas | server/tests/security.test.js, helpers/authenticated.js, client/e2e/security.spec.js y fixtures.js |

Se conservan shared/tasks.js, shared/calendar.js, calendarios, cálculos de estadísticas, reportes y módulos funcionales previos. Las pruebas existentes se adaptaron para utilizar autenticación real, no un bypass de seguridad.

## Pruebas y limitaciones verificadas

En server: npm.cmd test.
En client: npm.cmd test, npm.cmd run lint, npm.cmd run build, npm.cmd run test:e2e y npm.cmd run test:pwa.

| Comprobación | Resultado ejecutado |
|---|---|
| Backend | 44/44 correctas |
| Cliente | 25/25 correctas |
| Navegador, regresión y seguridad | 19/19 correctas |
| Producción PWA | 10/10 correctas |
| Lint y build | Correctos |
| SQLite principal | No vaciada ni restaurada |
| Contraseñas, cookies y CSRF | Probados con credenciales de fixtures privadas y temporales |
| Reinicio y restauración | Proceso real y archivo temporal verificados |

Las bases de pruebas son temporales o en memoria; no usan ni vacían la base personal. Los puertos son 3011/5174 para E2E y 3012/5175 para PWA. La prueba de actualización utiliza otro servidor temporal.

No hay Docker instalado en este entorno: **no se ejecutó docker build ni un contenedor**. La entrega productiva de Express y cabeceras se comprobó mediante pruebas HTTP con protocolo reenviado controlado; no equivale a validar un proxy público o certificado TLS real. Tampoco se verificaron instalaciones físicas Android/iOS.

No se realizó una auditoría externa o pentest. Quedan controles operativos antes de publicar: TLS/proxy reales, permisos y restauración del volumen, copia cifrada externa, monitorización de espacio, costo, disponibilidad y pruebas desde dispositivos físicos. MFA, recuperación de cuenta y notificaciones push son mejoras opcionales posteriores.

No se publicará ni se contratarán servicios sin autorización explícita. No se crearon commits ni se hizo push.

## Fase 8 — Gestión académica e interfaz

La fase actual amplía las siete fases anteriores. Consulta [la documentación completa de la Fase 8](docs/FASE8.md) para el modelo relacional, los archivos, los endpoints, las pruebas y las limitaciones.

- Tipografía legible en rem; campana con panel accesible, leídos persistentes y perfil funcional.
- Académico: semestres, asignaturas, horario semanal/diario, evaluaciones, laboratorios, proyectos e hitos.
- Actividades vinculadas a tasks, sin segunda tabla de tareas ni conversión automática de categorías.
- Calendario integrado y filtros por semestre, asignatura, tipo, prioridad y estado.
- Avance académico basado en actividades completadas; no se calculan notas.
- Avisos académicos reutilizando el sistema existente. Las clases admiten avisos por día con activación explícita; no hay push con ALIRA cerrada.
- Migración 006 a esquema 6. Antes de migrar una base antigua, el arranque y los comandos de administración generan un respaldo consistente y verifican su integridad. Los respaldos previos conservan sesiones: son privados. No se reinicializa SQLite.
- Sin IA, nuevos servicios externos, commits, push ni despliegue.

Los comandos de instalación e inicio anteriores no cambian. Tras actualizar, reinicia el backend y recompila/reinicia el cliente. En PWA, acepta la actualización cuando hayas guardado/cerrado los formularios.

Comprobaciones de Fase 8: backend 44, cliente 25, navegador 19 y PWA 10 pruebas correctas; lint y build correctos. Los resultados y sus límites se detallan en docs/FASE8.md.
