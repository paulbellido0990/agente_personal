# Fase 8 — Interfaz y gestión académica

ALIRA conserva la gestión personal, SQLite, autenticación y PWA. No utiliza IA ni servicios externos. No se cargan asignaturas, horarios o calificaciones ficticias.

## Uso

1. Abre **Académico > Semestres** y crea el semestre con sus fechas reales. Edita su estado para activarlo o archivarlo. Solo puede haber uno activo; activar otro deja el anterior inactivo, sin eliminarlo.
2. En **Mis asignaturas**, registra nombre, semestre, código, docentes, créditos opcionales, color, descripción y estado. Las categorías personales se conservan y no se convierten en asignaturas.
3. En **Horario**, añade las sesiones con día, horas, asignatura, tipo, aula, docente, observaciones y vigencia dentro del semestre. Se pueden editar o eliminar con confirmación.
4. Usa **Evaluaciones**, **Laboratorios** y **Proyectos finales** para abrir el formulario de tareas con su clasificación académica. También puedes seleccionar el ámbito al crear o editar una tarea normal.
5. Añade hitos desde un proyecto. Completar sus tareas actualiza el avance: hitos completados / hitos registrados. Sin hitos el avance es 0%; no se infiere por tiempo.
6. Consulta el **Calendario** existente con filtros por semestre, asignatura, tipo, prioridad y estado. Las clases no tienen prioridad ni estado de tarea; aplicar esos filtros muestra solamente tareas.
7. En Inicio/Mis tareas puedes separar tareas personales y académicas con **Ámbito de las tareas**. La búsqueda sigue usando título y descripción. El dashboard muestra próximas entregas y el horario de hoy cuando existen asignaturas.
8. **Resumen académico** muestra carga pendiente, porcentaje completado por curso, laboratorios terminados, exámenes de los próximos 30 días y proyectos activos. Estadísticas incluye un resumen actual adicional. Los reportes CSV/PDF y los cálculos históricos anteriores se mantienen.

Las evaluaciones admiten subtipo, hora, aula y temas. Los laboratorios admiten número, fecha de realización, observaciones y enlaces HTTP/HTTPS (uno por línea). Los proyectos admiten fecha de inicio, integrantes, repositorio y entregables; los hitos son tareas relacionadas. Sus estados, prioridades, fechas límite y recordatorios usan el CRUD existente.

## Horario y calendario

Las sesiones se guardan como reglas semanales de lunes a domingo. Las ocurrencias se calculan para el periodo visible, respetando el día y las fechas de vigencia en America/Lima; no se insertan cientos de tareas. Los bloques tienen alturas proporcionales a la duración real y borde con el color del curso. La vista permite día o semana y desplazamiento interno en pantallas pequeñas.

Hay conflicto cuando dos sesiones coinciden al menos un día efectivo de su vigencia y sus intervalos horarios se superponen. Un intervalo que termina justo al comenzar otro no entra en conflicto. El aviso no elimina ni mueve clases; revisa la lista de reglas para editar o eliminar la que corresponda. No se admiten sesiones que cruzan medianoche: registra reglas separadas si las necesitas.

El calendario distingue clases recurrentes (↻) de vencimientos. Una entrega se muestra una sola vez desde tasks. Una sesión semanal de laboratorio y la entrega de su informe son registros distintos con propósitos diferentes.

## Notificaciones y controles

La campana abre un panel de hasta 440 px, ajustado al viewport móvil. Muestra los avisos reales del servicio existente, fecha/hora de registro en Lima, estado leído y contador sin leer. Permite marcar leído y abrir la tarea; para clases abre Horario. Se cierra con Escape, botón Cerrar, clic fuera o al trasladar el foco fuera. Escape devuelve el foco a la campana.

El perfil ahora es un botón que abre Cuenta y seguridad. Se retiraron las flechas decorativas de las tarjetas de resumen. Calendario, filtros, CRUD, accesos a objetivos, menú lateral y controles PWA conservan acciones reales. Los iconos decorativos restantes no son controles ni reciben cursor de botón.

Se añadieron variables tipográficas en rem: título principal 28–32 px, secciones 20 px, cuerpo base 16 px, menús/formularios 15–16 px y secundarios 13–14 px. Las etiquetas compactas de la escala horaria usan 12 px como excepción. Los botones principales y de iconos mantienen áreas táctiles y foco visible.

## Recordatorios

Se reutilizan /api/reminders y la tabla activa reminder_events para tareas y clases. Los avisos de tareas académicas usan su fecha límite y 0, 1 o 3 días antes. Las clases requieren activación explícita por sesión y se deduplican por sesión, fecha de ocurrencia y anticipación.

El aviso registra la hora real de creación; una clase muestra además su hora registrada. Los avisos de clase muestran el día indicado, no prometen un disparo exacto por minuto. Se generan al consultar con ALIRA abierta y se recuperan al volver. No hay notificaciones push remotas ni ejecución garantizada con la aplicación cerrada. La notificación del navegador sigue necesitando permiso.

## Modelo relacional y migración 006

El esquema pasa de versión 5 a **6** mediante una migración transaccional. No se reinicializa SQLite ni se alteran tareas personales para clasificarlas automáticamente.

~~~mermaid
erDiagram
  academic_terms ||--o{ courses : contiene
  courses ||--o{ class_sessions : programa
  courses ||--o{ task_academic : clasifica
  tasks ||--o| task_academic : extension
  tasks ||--o{ task_academic : proyecto_de_hitos
  tasks ||--o{ reminder_events : avisa
  class_sessions ||--o{ reminder_events : avisa_ocurrencias
~~~

- academic_terms: fechas, nombre, estado y versión.
- courses: FK al semestre y atributos de asignatura.
- class_sessions: FK al curso y regla semanal con vigencia, recordatorio y versión.
- task_academic: FK única a tasks, FK a courses, tipo, referencia opcional al proyecto y detalles validados en JSON. Los metadatos no duplican título, estado, prioridad ni vencimiento.
- reminder_events: mismo ledger activo, ahora admite taskId o sessionId, exactamente uno.

Para permitir avisos de clases, la migración conserva la tabla previa como **reminder_events_legacy_v5**, crea el ledger ampliado y copia todos sus registros con los mismos IDs, fechas y marcas de lectura/notificación. La tabla legacy queda como archivo de compatibilidad; no se consulta ni actualiza desde la aplicación. No se eliminan tablas ni conversaciones históricas.

El arranque normal, admin:create y db:backup ejecutan prepareMigrationBackup antes de abrir una base antigua: inspeccionan versión, comprueban integridad, crean una copia consistente mediante sqlite.backup y verifican la copia. Si falla, no comienza la migración. Estas copias alira-before-v6-*.db conservan también sesiones y son **privadas**; no deben compartirse. Las copias normales descargables siguen retirando sesiones reutilizables. No se borran copias automáticamente.

db:restore continúa creando únicamente un archivo nuevo, acepta hasta esquema 6 y nunca reemplaza la base principal. Las pruebas de migración usan archivos temporales y comparan registros anteriores y posteriores. No se permite reducir la vigencia de un semestre por debajo de una sesión existente. Los proyectos con hitos requieren reasignar o eliminar esos hitos antes de borrar el proyecto.

## API protegida

Todas las rutas académicas requieren sesión; escrituras requieren CSRF. PUT/DELETE requieren If-Match con la versión leída, preservada en el formulario. Conflicto: 409; versión ausente: 428. La respuesta se confirma después del COMMIT. Los valores de tablas/columnas provienen de listas internas; entradas de usuario siempre parametrizadas.

| Ruta | Método | Función |
|---|---|---|
| /api/academic | GET | Semestres, cursos, reglas, conflictos y resúmenes actuales |
| /api/academic/terms | POST | Crear semestre |
| /api/academic/terms/:id | PUT | Editar, activar o archivar |
| /api/academic/courses | POST | Crear asignatura |
| /api/academic/courses/:id | PUT | Editar asignatura |
| /api/academic/sessions | POST | Crear regla semanal |
| /api/academic/sessions/:id | PUT, DELETE | Editar o eliminar regla |
| /api/tasks y /api/tasks/:id | CRUD existente | Actividades, evaluaciones, proyectos e hitos |

El campo opcional academic de una tarea contiene courseId, tipo, projectId y detalles. null conserva el ámbito personal. Los formularios guardan una sola tarea y su relación dentro de la misma transacción. El listado académico se consulta cada diez segundos, al enfocar, al reconectar y después de guardar. Un formulario abierto conserva su versión; no sobrescribe cambios de otro dispositivo.

## Archivos

Nuevos:
- shared/academic.js: recurrencias, conflictos, etiquetas y avance.
- server/src/db/migrations/006-academic.sql y db/migrationBackup.js.
- server/src/services/academicService.js y routes/academic.js.
- client/src/hooks/useAcademic.js.
- client/src/components/AcademicPage.jsx, AcademicForm.jsx, AcademicTaskFields.jsx, AcademicSchedule.jsx y AcademicCalendarFilters.jsx.
- client/src/styles/academic.css y readability.css.
- server/tests/academic.test.js, client/tests/academic.test.mjs y client/e2e/academic.spec.js, interface.spec.js.
- docs/FASE8.md.

Modificados:
- App, Header, Sidebar, SecuritySettings, TaskForm, TaskDetails, TaskTable, SummaryCards, CalendarPage, ReminderPanel, StatisticsPage, main, useReminders y taskApi.
- Estilos existentes: tamaños expresados en rem con mínimos legibles.
- Backend: app, index, database, middleware de versiones, repositorio/servicio de tareas y recordatorios; scripts de administración, backup y restore.
- Expectativas de versión en pruebas previas; README, AGENTS y versiones del paquete/lockfiles.

## Comprobaciones

- Bloque A antes del módulo académico: lint y 11 pruebas de navegador correctas.
- Backend: 44 pruebas correctas, incluidas migración v5 con respaldo WAL, preservación de registros, autenticación/CSRF y conflictos de versiones.
- Cliente: 25 pruebas correctas, incluidas recurrencias, límites temporales, superposiciones y avance por hitos.
- Playwright: 19 pruebas de navegador correctas; flujo académico completo y regresiones. Prueba académica repetida tras el ajuste responsive.
- PWA de producción: 10 pruebas correctas.
- Lint y build ejecutados correctamente.
- Anchos automatizados: 360, 390, 768, 1024 y 1440 px.

No se afirma instalación física en dispositivos ni validación de TLS público, Docker o alojamiento. No se añaden notas/calificaciones, feriados, excepciones puntuales a la recurrencia, adjuntos privados, edición offline, notificaciones push ni IA. Las estadísticas académicas son estados actuales, sin reinterpretar historia ni notas. La publicación permanece pendiente de autorización. No se crean commits ni push.
