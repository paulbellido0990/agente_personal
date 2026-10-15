# ALIRA
**Tu asistente inteligente de tareas · Organiza. Avanza. Logra.**

Entrega de **Fase 1: configuración e interfaz visual**, según el alcance solicitado. React + Vite + JavaScript, CSS propio y lucide-react. No se modificó AGENTS.md.

## Iniciar desde Visual Studio Code
Requisitos: Node.js 22.12 o superior (también compatible con Node 20.19+), npm y acceso a internet para instalar dependencias.
Abre esta carpeta en VS Code y ejecuta en su terminal:
```powershell
cd client
npm.cmd install
npm.cmd run dev
```
Abre la dirección que Vite indique (normalmente http://localhost:5173). Detén el servidor con Ctrl+C.
En macOS/Linux puedes usar `npm` en lugar de `npm.cmd`. En Windows se usa `npm.cmd` para evitar el bloqueo de scripts npm.ps1 sin cambiar la política de PowerShell.

## Comprobaciones
Desde `client/`:
```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```
`build` genera `client/dist/`. `preview` sirve esa compilación para revisión local; no es un servidor de producción. No se configuró una suite de pruebas automatizadas en esta entrega visual.

## Qué incluye
- Dashboard adaptable, sidebar colapsable y navegación entre Inicio y Mis tareas.
- Encabezado con búsqueda funcional de los datos de demo, perfil ficticio y notificaciones deshabilitadas.
- Resumen calculado del mismo conjunto: 8 tareas, 4 pendientes (incluye en progreso), 4 completadas y 3 próximas a vencer.
- Tabla con búsqueda, filtros por estado, prioridad y categoría, orden ascendente/descendente por fecha y estado vacío.
- Calendario compacto estático de octubre de 2026 e indicador de progreso de la demo (50%).
- Panel conceptual del asistente marcado Próximamente, sin chat ni respuestas simuladas.
- Foco visible, etiquetas accesibles, enlace para saltar al contenido y respeto de movimiento reducido.

## Datos y alcance
Toda la información es **ficticia**, no pertenece al usuario. La fecha fija de demostración es el 14 de octubre de 2026 y no pretende representar el día actual. Próximas a vencer cuenta tareas sin completar entre el 14 y el 17 inclusive. Inicio muestra tareas sin completar; Mis tareas muestra las ocho. Los filtros y la búsqueda no modifican los datos.
El calendario es una composición visual estática, no una vista mensual/semanal funcional de Fase 2. El progreso corresponde al conjunto completo de demo, no a una medición semanal real.
Crear/editar/eliminar tareas, persistencia local, notificaciones, configuración, categorías administrables, estadísticas y navegación de calendario quedan pendientes. Los controles futuros están deshabilitados y señalados. No hay backend, base de datos, autenticación ni integración de IA. No se avanzó a Fase 2.
La fuente DM Sans se solicita a Google Fonts; si no hay conexión se usa Segoe UI o sans-serif.

## Archivos
- `client/src/App.jsx`: composición del dashboard y estado de navegación/búsqueda.
- `client/src/components/`: Sidebar, Header, SummaryCards, TaskTable, CalendarCard, ProgressCard y AssistantCard.
- `client/src/data/demo.js`: datos ficticios, etiquetas y cálculos de resumen.
- `client/src/styles/`: base visual, estructura responsive y estilos de componentes.
- `client/public/alira.svg`: marca vectorial local.
- `client/vite.config.js`, `client/eslint.config.js`: configuración de desarrollo y lint.
- `client/package.json` y `package-lock.json`: comandos y dependencias reproducibles.

La licencia queda por decidir con el usuario.
