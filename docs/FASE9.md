# Fase 9 — ALIRA Personal y ALIRA Control

ALIRA es una plataforma multiusuario local con SQLite central. Conserva tareas, calendario, planificación, recordatorios, estadísticas, metas, reportes, módulo académico y PWA. No utiliza IA ni servicios externos. No se ha publicado ni contratado alojamiento.

## Roles y privacidad

- **ALIRA Personal**: cada cuenta administra únicamente sus tareas, semestres, asignaturas, docentes, horarios, evaluaciones, proyectos, metas y avisos.
- **ALIRA Control**: solo el administrador principal original, id interno 1, accede a administración, usuarios, anuncios, mensajes, soporte, actividad, auditoría, configuración y respaldos. También conserva su espacio personal.
- No se permite crear otros administradores ni cambiar roles desde formularios, cuerpos HTTP o invitaciones.
- Las consultas personales incorporan el ID de la sesión en el backend. No se acepta userId del navegador como autoridad.
- Manipular un ID ajeno no habilita lectura, modificación, borrado, importación, recordatorios, reportes ni relaciones académicas. Se devuelven errores genéricos o 404.
- El administrador no obtiene acceso por API al contenido de cursos, tareas, exámenes, horarios o proyectos ajenos. Solo ve cuentas, cantidades agregadas y comunicaciones dirigidas explícitamente a administración.
- El operador del servidor tiene acceso técnico a SQLite y los respaldos. No hay cifrado de extremo a extremo. Los respaldos son privados y deben custodiarse cifrados fuera del servidor.

## Operación y acceso

Los comandos de inicio no cambian:

~~~powershell
cd server
npm.cmd install
npm.cmd start
~~~

En otra terminal, desde la raíz:

~~~powershell
cd client
npm.cmd install
npm.cmd run dev -- --port 5173 --strictPort
~~~

Abre http://localhost:5173. Para PWA, usa build y preview como se describe en README. No mezcles localhost y 127.0.0.1 para las cookies.

La cuenta original se migra sin cambiar su nombre, hash de contraseña ni identificador lógico. Sus sesiones existentes conservan token, creación y caducidad, ahora vinculadas también a userId. No vuelvas a crearla. En una instalación vacía, npm.cmd run admin:create sigue siendo el único mecanismo de alta del administrador, en terminal privada; no hay credenciales predeterminadas.

### Invitar personas

1. Entra en ALIRA Control > Usuarios.
2. Elige un nombre único y pulsa Crear invitación privada.
3. Entrega el nombre de usuario y el código por un canal privado. La pantalla muestra el código solo durante esa vista; no se envía correo automáticamente.
4. La persona pulsa Tengo un código de invitación en el acceso, introduce el código y elige su propia contraseña de 12–128 caracteres.
5. Tras activarlo, inicia sesión con el usuario asignado. El código es de un solo uso y caduca a las 48 horas.

SQLite almacena únicamente SHA-256 del código aleatorio de 256 bits. No se registra en logs, auditoría ni URLs. No hay registro público libre. El endpoint público de activación no permite elegir rol, usuario destinatario ni privilegios: exige un código administrativo válido.

### Activar, desactivar y recuperar

- Desactivar revoca las sesiones e invitaciones pendientes sin borrar datos.
- Activar vuelve a habilitar una cuenta que ya completó su alta; una cuenta sin contraseña debe completar una invitación o recuperación.
- Revocar sesiones cierra los dispositivos de esa cuenta, conservando tareas y datos.
- Recuperar acceso exige la contraseña actual del administrador. Revoca sesiones, invalida la contraseña y códigos previos y emite un código de recuperación de una hora.
- La persona elige una contraseña nueva mediante el mismo formulario de activación.
- El administrador principal no puede desactivarse ni recuperarse por estos endpoints. Su contraseña se cambia desde su propia sesión.
- Cambiar contraseña revoca únicamente las sesiones de esa cuenta. Logout revoca la sesión actual.

Se mantienen scrypt asíncrono, cookies HttpOnly/SameSite=Strict y Secure en producción, expiración absoluta, CSRF, restricciones de origen, límites de intentos y HTTPS productivo. Hay hasta 20 sesiones por cuenta. La migración no sustituye secretos ni cambia .env, red o firewall.

## Docentes individuales

Académico incluye Mis docentes: crear, editar y eliminar docentes no utilizados, con nombre, correo opcional y notas. Se normaliza el nombre para rechazar duplicados por mayúsculas y formas Unicode equivalentes dentro de la cuenta; personas con nombres distintos se conservan separadas.

El formulario de horario permite buscar en el catálogo propio, seleccionar un registro y registrar uno si falta. La sesión guarda teacherId, permitiendo docentes diferentes en teoría y laboratorio. Los cambios de nombre se reflejan en la lectura del horario. Un docente asociado a sesiones no puede eliminarse hasta reasignarlas.

La migración crea relaciones solo para textos de sesión inequívocos: un nombre simple sin separadores de personas y dentro del límite. Los textos ambiguos, como Ana / Luis, se conservan sin teacherId para revisión manual. Los campos de docentes de cursos anteriores permanecen como información de compatibilidad; no se convierten en un catálogo global ni se adivinan identidades a partir de listas.

## Anuncios

ALIRA Control permite crear, editar, publicar o despublicar anuncios, elegir importancia, fijarlos y definir publicación/caducidad con hora de Lima. Los estados y fechas se validan en servidor.

Destinatarios:
- Todos: incluye cuentas presentes y futuras.
- Grupo de cuentas de usuario: excluye al administrador.
- Selección de cuentas: destinatarios explícitos.

Estos son grupos predefinidos; no se incluye todavía un editor de grupos personalizados. Las marcas de lectura no se duplican y se conservan como recibos; retirar un destinatario elimina su acceso, sin borrar el recibo histórico. El administrador puede consultar quienes marcaron leído. Editar el texto no reinicia automáticamente esos recibos.

Solo los anuncios publicados, vigentes y dirigidos a la cuenta aparecen en su dashboard, comunicaciones y centro de notificaciones. Los borradores, los futuros, los caducados y los ajenos no se entregan al usuario.

## Mensajes y soporte

El administrador inicia conversaciones individuales con usuarios activos. El destinatario puede leer y responder. Los participantes tienen historial y estados de lectura basados en la secuencia real de mensajes; no se comparan solo marcas horarias para decidir si hay nuevos mensajes.

Cualquier cuenta puede abrir soporte de tipo error, acceso, sugerencia o consulta. El administrador responde y cambia el estado entre abierta, en revisión, resuelta o cerrada. No existe un formulario de recuperación pública de cuentas bloqueadas: esos casos requieren contactar al administrador por un canal privado externo.

No se permite mensajería directa entre usuarios normales en esta fase. El administrador es participante explícito de mensajes administrativos y solicitudes de soporte, no un observador de conversaciones personales ajenas.

La comunicación usa HTTP con actualización cada 15 segundos y actualización manual; no utiliza WebSockets. La creación de conversaciones se limita a 20 por hora y cuenta, las respuestas a 30 por minuto. El centro de avisos reutiliza la campana existente y combina recordatorios, anuncios, mensajes y soporte. Los recordatorios mantienen su servicio y ledger originales. Las notificaciones del navegador siguen limitadas a recordatorios con permiso; no se añade push remoto.

## Compartición voluntaria

Compartir permite autorizar lectura a otra cuenta activa conocida por su nombre de usuario, por un recurso propio concreto:

| Recurso | Resumen compartido |
|---|---|
| Curso | Nombre, código, créditos, color y descripción |
| Regla de horario | Asignatura, día, horas, tipo, aula y vigencia |
| Proyecto | Título, descripción, estado, prioridad y vencimiento |

No se comparten automáticamente docentes/contactos, otras sesiones, hitos, tareas personales ni toda la cuenta. Es una lectura del estado vigente del recurso, sin permisos de edición ni colaboración compleja. El destinatario no puede volver a compartirlo ni revocarlo por el propietario.

La revocación se aplica en servidor en cada consulta. El cliente actualiza al consultar/reabrir o por sondeo; no puede borrar lo que una persona ya leyó o copió. Un permiso revocado ya no devuelve contenido. El administrador tampoco puede leer un recurso compartido si no es destinatario explícito.

## Actividad, auditoría y conservación

Usuarios activos significa cuentas habilitadas con inicio de sesión verificable en los últimos 30 días. lastLoginAt se actualiza únicamente al autenticar; durante la migración se recupera el máximo createdAt de sesiones existentes, que sí proceden de un acceso verificado. No se infieren accesos a partir de tareas o cambios de datos.

El uso de módulos se expresa como cantidades de registros existentes: tareas, cursos, docentes, sesiones y proyectos. No se registran pulsaciones, recorridos detallados, contenido de formularios ni conversaciones privadas en la auditoría.

La auditoría protege eventos administrativos relevantes: invitación, activación/desactivación, recuperación, revocación, anuncios, estado de soporte, configuración y generación de respaldos. Guarda actor, acción, referencia y fecha; no contraseñas, tokens ni cuerpos de mensajes. Triggers rechazan cambios o borrados del historial desde las operaciones de la aplicación. Esto no sustituye una auditoría externa ni impide cambios hechos por el operador con acceso directo al archivo SQLite.

Mensajes, soporte, recibos y auditoría se conservan sin borrado automático. Los contadores de intentos vencen según sus ventanas de seguridad. Invitaciones utilizadas/caducadas conservan su registro, pero dejan de autorizar. No hay purga ni eliminación de usuarios desde el panel. Cualquier política futura de retención o borrado requerirá revisión y autorización; la interfaz informa estos límites a las personas.

## Migración 007 y relaciones

Se aplica incrementalmente desde esquema 6 a 7, dentro de una transacción:

- users: identidad activa, roles, estado y último login. El propietario se conserva como administrador id 1.
- owner permanece como registro compatible del alta privada. No es una segunda autoridad de autenticación; users autoriza las cuentas.
- En una instalación nueva se reserva el ID principal sin nombre ni contraseña hasta el alta privada. Esa reserva no permite iniciar sesión.
- sessions añade userId y conserva las filas existentes y ownerId como columna de compatibilidad; no se duplica la tabla de sesiones.
- userId se incorpora a tareas, metas, eventos, semestres, cursos, sesiones, relaciones académicas, avisos y tablas históricas. Los registros anteriores pertenecen al principal.
- user_analytics mantiene un inicio del historial independiente por cuenta, conservando el valor anterior del propietario.
- El índice de semestre activo pasa a ser único por usuario.
- teachers y class_sessions.teacherId proporcionan relaciones reales.
- Se añaden user_invitations, announcements, announcement_recipients, message_threads, messages, message_reads, support_tickets, admin_audit_log, platform_settings y resource_shares.
- Triggers impiden relaciones académicas entre propietarios y cambios de propiedad.

~~~mermaid
erDiagram
  users ||--o{ tasks : posee
  users ||--o{ academic_terms : posee
  users ||--o{ teachers : registra
  users ||--o{ sessions : autentica
  academic_terms ||--o{ courses : contiene
  courses ||--o{ class_sessions : programa
  teachers ||--o{ class_sessions : imparte
  users ||--o{ announcement_recipients : recibe
  announcements ||--o{ announcement_recipients : comunica
  users ||--o{ message_threads : participa_con_administracion
  message_threads ||--o{ messages : contiene
  message_threads ||--o| support_tickets : soporte
  users ||--o{ resource_shares : autoriza_o_recibe
~~~

Antes de migrar una base antigua, el servidor y los comandos de administración crean y verifican una copia consistente con sqlite.backup. La base real no se migra hasta verificar las pruebas con bases temporales. Las copias previas conservan sesiones y son especialmente privadas.

SQLite requiere suspender las FK solo en la conexión aislada de migración para añadir columnas REFERENCES con un DEFAULT no nulo a tablas pobladas. Se comprueban todas las relaciones mediante foreign_key_check antes de COMMIT y se reactivan antes de devolver la conexión. Las peticiones normales mantienen foreign_keys=ON. Cualquier fallo revierte la migración.

Los respaldos normales/descargables y db:restore eliminan sesiones y contadores de sus copias e invalidan códigos de invitación/recuperación. No modifican la base activa. Restaurar sigue creando únicamente un archivo nuevo, sin reemplazar la base principal.

## Endpoints

Todos los endpoints siguientes exigen sesión, salvo la activación indicada. Las escrituras autenticadas requieren CSRF. Los prefijos de rutas son /api.

| Ruta | Método | Acceso |
|---|---|---|
| /auth/invitation | POST | Público con código válido, JSON y X-Alira-Request |
| /control/dashboard | GET | Principal; indicadores agregados |
| /control/users | GET | Principal; cuentas y cantidades |
| /control/invitations | POST | Principal; emitir invitación |
| /control/users/:id/actions | POST | Principal; activar/desactivar/revocar/recuperar |
| /control/announcements | GET, POST | Principal |
| /control/announcements/:id | PUT | Principal; If-Match |
| /control/audit | GET | Principal; últimos 200 eventos |
| /control/settings | GET, PUT | Principal; If-Match para editar |
| /communications | GET | Cuenta actual; anuncios y conversaciones autorizadas |
| /communications/threads | POST | Principal: mensaje; usuario: soporte propio |
| /communications/threads/:id | GET | Participantes autorizados |
| /communications/threads/:id/messages | POST | Participantes autorizados |
| /communications/threads/:id/status | PATCH | Principal; soporte e If-Match |
| /notifications | GET | Avisos de la cuenta actual |
| /notifications/:type/:id/read | PATCH | Destinatario; leído por tipo |
| /academic/teachers | GET, POST | Catálogo propio |
| /academic/teachers/:id | PUT, DELETE | Propietario e If-Match |
| /shares | GET, POST | Permisos propios/recibidos; crear sobre recurso propio |
| /shares/:id | GET, DELETE | Lectura autorizada; revocación solo por propietario |
| /settings/backup | POST | Principal y contraseña actual |

Las APIs anteriores de tareas, academia, metas, estadísticas, CSV/PDF y recordatorios conservan sus rutas, con propietario extraído de la sesión. No se admite un parámetro para solicitar datos personales de otro usuario. Las cabeceras If-Match se mantienen en ediciones/borrados de recursos versionados.

## Archivos

Nuevos:
- server/src/db/migrations/007-platform.sql.
- server/src/services/tenant.js, platformValidation.js, adminService.js, communicationService.js, shareService.js y teacherService.js.
- server/src/routes/platform.js.
- client/src/hooks/useRemote.js.
- client/src/components/ControlPage.jsx, CommunicationsPage.jsx, AnnouncementCards.jsx, InvitationForm.jsx, SharesPage.jsx y TeacherPicker.jsx.
- client/src/styles/platform.css.
- server/tests/platform.test.js, client/tests/platform.test.mjs y client/e2e/platform.spec.js.
- docs/FASE9.md.

Modificados:
- Autenticación, app, arranque, migraciones, respaldo/restauración y middleware de versiones.
- Repositorio y servicios de tareas, académico, metas, estadísticas y recordatorios; routers existentes.
- App, AuthGate, Sidebar, Header, SecuritySettings, ReminderPanel, AcademicForm, AcademicPage y AcademicSchedule.
- taskApi, useTasks, useAcademic, useReminders y main.
- Pruebas previas de migración/compatibilidad, versiones de paquetes y lockfiles.
- README.md y AGENTS.md.

No se añaden dependencias, servicios externos, claves de IA ni recursos de CDN.

## Pruebas y límites

Referencia anterior, antes de implementar: 44 backend, 25 cliente, 19 navegador y 10 PWA correctas.

Fase 9:
- Backend: 53 pruebas, incluidas cuentas temporales, ataques por IDs, SQL de relaciones cruzadas, roles, CSRF, invitaciones, recuperación, reportes, docentes, anuncios, soporte, mensajes, compartición, respaldo y migración v6.
- Cliente: 27 pruebas, incluidas limpieza de versiones al cambiar de cuenta y avisos tipados.
- Navegador: 20 pruebas; dos contextos separados para administrador/usuario, además de regresión completa.
- PWA: 10 pruebas de producción.
- Lint, build y git diff --check.
- Anchos 360, 390, 768, 1024 y 1440 px en pruebas automatizadas.

Los resultados finales ejecutados se recogen también en README. Las bases de pruebas son temporales o en memoria. La comprobación manual posterior de la base real no es una prueba que vacíe o modifique datos personales.

Pendiente fuera de esta fase: correo automático, grupos personalizados, MFA, recuperación pública, chat entre usuarios normales, WebSockets, colaboración editable, exportación personal de una base completa, purga/retención automatizada, push remoto y acceso offline a datos privados. Las invitaciones y anuncios no se envían a servicios externos.

No se probaron instalaciones físicas Android/iOS, Docker ni TLS público; no hay publicación ni pentest externo. No se crean commits ni push.

## Verificación local posterior

La base real se migró de esquema 6 a 7 después de verificar las pruebas y un respaldo consistente. La comparación con el respaldo previo confirmó que se conservaron los registros anteriores (incluidas las sesiones), nombre y hash de la cuenta principal. integrity_check devolvió ok y foreign_key_check no encontró relaciones rotas. Los contadores de solicitudes se excluyen de esa comparación porque cambian durante el uso normal.

El backend y el frontend locales respondieron correctamente después del reinicio. No se crearon cuentas de demostración en la base real ni se sustituyó la contraseña del propietario. Las cuentas de pruebas pertenecen exclusivamente a bases temporales.
