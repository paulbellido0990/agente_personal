# ALIRA
**Tu asistente inteligente de tareas · Organiza. Avanza. Logra.**

## Fase 2: Gestión completa de tareas
Entrega según el alcance solicitado: React + Vite + JavaScript y localStorage, conservando el diseño de Fase 1. La numeración de esta entrega sigue la petición del usuario, aunque AGENTS.md describe otro reparto de fases.

## Ejecutar desde Visual Studio Code
Node.js 22.12+ o Node 20.19+.
Abre la carpeta del proyecto y ejecuta:
```powershell
cd client
npm.cmd install
npm.cmd run dev
```
Abre la URL que indique Vite (normalmente http://localhost:5173). Ctrl+C detiene el servidor.
En macOS/Linux usa npm en lugar de npm.cmd. Windows usa npm.cmd sin cambiar la política de PowerShell.

## Comprobaciones
Desde client:
```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```
Pruebas con node:test, sin dependencias adicionales. build genera dist; preview permite revisar esa compilación localmente.

## Uso
- Crea tareas con título de 3 a 120 caracteres, descripción opcional (máximo 5000), categoría libre (máximo 80), prioridad, estado y fecha opcional.
- Edita todos los atributos del formulario conservando ID y fecha de creación. Cambia estado desde el listado. Elimina con confirmación; Escape cancela los modales.
- Busca por título o descripción. Combina estado, prioridad y categoría. Ordena por fecha límite, prioridad (alta primero en ascendente) o creación; invierte la dirección.
- Inicio muestra pendientes y tareas en progreso por defecto. Al buscar o filtrar incluye las coincidencias de cualquier estado. Mis tareas muestra todas. Las vistas comparten tareas y filtros.
- Las tarjetas cuentan el conjunto completo, independientemente de filtros. Pendientes incluye en progreso. Próximas a vencer incluye hoy y los siguientes tres días; excluye completadas y vencidas. El progreso es completadas/total (0% si está vacío).
- Las fechas son YYYY-MM-DD; el día actual y las vencidas usan America/Lima. El día se actualiza cada 30 segundos y al volver a la ventana. Las tareas sin fecha aparecen al final en ambas direcciones.
- Explorar demo cambia a un conjunto ficticio separado, con fecha fija 14/10/2026. Sus cambios son temporales; nunca se copian a las tareas reales. Volver a mis tareas recupera el conjunto personal intacto. Recargar siempre abre las tareas reales, incluso si quedaron vacías.

## Persistencia y recuperación
La clave versionada es alira.tasks.v1. Cada tarea tiene ID UUID estable, createdAt y updatedAt ISO UTC; fechaLimite es fecha local o null.
Solo services/taskStorage.js accede a localStorage; el hook coordina las operaciones y los componentes reciben datos y callbacks. Esta separación permite sustituir la persistencia por un servicio REST en una entrega posterior; el contrato actual es síncrono y deberá adaptarse a async al integrar una API.
No se guardan datos de demo ni se inyectan tareas al iniciar.
Si hay registros incompletos se normalizan; registros sin título/ID válido y duplicados no se muestran. Si hay JSON dañado se muestra un aviso. El original permanece intacto al leer y se respalda bajo alira.tasks.v1.backup.UUID antes del siguiente guardado. Si el respaldo o el guardado falla, se mantiene el estado anterior y aparece un error.
El contenido se renderiza como texto React, sin HTML inyectado.
Los datos dependen del navegador y origen: borrar datos del sitio, usar otro puerto/perfil o cambiar de equipo no los conserva. No hay sincronización entre pestañas; evita editar simultáneamente en varias. Las copias recuperadas se conservan en localStorage, sin una interfaz de importación/exportación en esta fase.

## Estructura
- src/services/tasks.js: validación, fechas, normalización, búsqueda, filtros, ordenamiento y resumen.
- src/services/taskStorage.js: lectura, respaldo y guardado.
- src/hooks/useTasks.js: estado compartido y operaciones; useToday.js: día local.
- src/components/TaskForm.jsx, Modal.jsx y DeleteTaskDialog.jsx: formularios y confirmación con dialog nativo, foco, teclado y etiquetas.
- App.jsx, TaskTable, SummaryCards, ProgressCard y Header: componentes existentes conectados al estado real.
- src/styles/tasks.css: estilos incrementales de formularios, avisos y lista móvil, conservando la identidad previa.
- src/data/demo.js: solo datos ficticios.
- tests/tasks.test.mjs: lógica, persistencia, recuperación y errores.

## Límites
Calendario, estadísticas detalladas, administración de categorías, notificaciones, configuración y asistente IA continúan señalados como próximos. Se conserva un calendario compacto de referencia del mes, sin marcadores de tareas; la vista de tareas en calendario queda pendiente.
Sin backend, SQLite, inicio de sesión ni IA. No se avanzó a Fase 3 ni se crearon commits o push.
DM Sans se solicita a Google Fonts; existe alternativa local sans-serif.
Licencia pendiente de decidir.

## Resultado de esta entrega
Se ejecutaron npm.cmd test (10 pruebas correctas), npm.cmd run lint (sin errores) y npm.cmd run build (correcto). No se ejecutaron pruebas de interacción ni revisión visual en un navegador; el comportamiento responsive y de los modales requiere esa comprobación manual.

Revisión manual recomendada: crear una tarea, editar sus campos, cambiar su estado, probar filtros y órdenes, recargar, eliminar cancelando/confirmando y recargar la lista vacía. Explorar demo y volver a mis tareas para comprobar la separación. Repetir con teclado y a 360 px.
