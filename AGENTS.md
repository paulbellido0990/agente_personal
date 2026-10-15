# AGENTS.md — ALIRA

> Leer completamente antes de modificar el proyecto. Las instrucciones explícitas del usuario prevalecen.

## Identidad y alcance

- **Nombre:** ALIRA — Gestor Personal de Tareas.
- **Subtítulo:** Gestor personal de tareas académicas y personales.
- **Eslogan:** Organiza. Avanza. Logra.
- **Idioma:** español (Perú). Zona horaria: America/Lima.
- **Decisión definitiva:** ALIRA no utiliza inteligencia artificial, chat, modelos de lenguaje ni servicios externos de inferencia. No reintroducirlos ni solicitar claves API.
- **Fase actual:** 7 de 7, seguridad, acceso multidispositivo y preparación para producción, sin IA.
- **Publicación:** requiere autorización expresa. No contratar planes, activar cargos ni desplegar automáticamente.

ALIRA permite crear, editar, completar y eliminar tareas mediante formularios, botones y calendarios. Conserva planificación, recordatorios, estadísticas, objetivos y reportes. La PWA es una aplicación web instalable, no una aplicación nativa publicada en tiendas.

## Forma de trabajo

1. Inspeccionar documentación, archivos, Git y pruebas antes de editar. Preservar cambios existentes del usuario.
2. Explicar brevemente los archivos que se crearán o modificarán antes de hacerlo.
3. Implementar únicamente el alcance solicitado, con cambios pequeños, legibles y reutilizables.
4. No reconstruir el dashboard ni reinicializar Vite o SQLite.
5. No eliminar tareas, metas, eventos, preferencias, recordatorios ni tablas históricas.
6. No borrar conversaciones históricas: sus tablas y la migración 004 se conservan por compatibilidad, sin rutas ni uso en la aplicación.
7. No modificar configuraciones privadas, red, firewall, HOST u orígenes sin autorización.
8. Mantener mensajes, errores y documentación en español.
9. No añadir dependencias ni servicios externos innecesarios. Los recursos de interfaz deben estar disponibles localmente.
10. No crear commits, push ni publicaciones sin petición explícita.
11. Ejecutar las pruebas aplicables, lint y build; reportar resultados reales y limitaciones. No afirmar pruebas físicas no realizadas.

## Stack y arquitectura

- Frontend: React 19, Vite 7, JavaScript/JSX, CSS modular o convencional con variables.
- Iconos: lucide-react incluido en el bundle. Fuente: sistema, sin CDN.
- Backend: Node.js 24.x, Express 5. API REST bajo /api.
- Base: SQLite mediante node:sqlite, con migraciones incrementales y transaccionales.
- Reportes: CSV y PDF A4 mediante servicios existentes; no reemplazar sus cálculos por datos del cliente.
- PWA: manifest, iconos PNG derivados del logo existente, Service Worker generado por client/pwa.mjs; no requiere dependencia adicional.
- La URL pública de API se centraliza en client/src/services/taskApi.js y VITE_API_URL. Por defecto /api con proxy local de Vite.
- El backend mantiene HOST=127.0.0.1 por defecto y CORS limitado al origen configurado.
- SQLite es la única fuente de verdad para los datos reales. localStorage se usa para recuperar/importar datos legados, nunca para duplicar las tareas de SQLite.
- Mantener los módulos React, hooks y servicios existentes y la carga diferida de estadísticas y metas.

## Diseño y accesibilidad

Conservar la identidad SaaS profesional, limpia y amable de ALIRA.

| Uso | Color |
|---|---|
| Primario | #8056D9 |
| Hover | #6D41CA |
| Lavanda | #F3EFFB |
| Fondo | #FAF9FD |
| Tarjetas | #FFFFFF |
| Texto | #25213D |
| Texto secundario | #756F87 |
| Completadas | #E2F5ED |
| Prioridad media | #FFF1D9 |
| Prioridad alta | #FBE5E9 |
| Información | #E7EFFF |

Usar bordes de 12–20 px, sombras suaves, espacios claros y tipografía del sistema. No generar un logo nuevo. Navegación: Inicio, Mis tareas, Calendario, Planificación, Recordatorios, Estadísticas, Objetivos y Configuración de cuenta, seguridad, respaldos, instalación y conexión.

Verificar 360, 390, 768, 1024 y 1440 px. Sidebar desplegable en celular, tablas de tareas como tarjetas, gráficos contenidos, modales con desplazamiento y altura dinámica, formularios cómodos con teclado virtual. Controles táctiles de al menos 44 px donde corresponda. Etiquetas, foco visible, navegación por teclado y confirmación accesible de borrado. Prioridad y estado se indican con texto además del color. No mostrar controles falsamente operativos.

## Modelo y reglas de tareas

Campos: id estable, titulo, descripcion, categoria, prioridad, estado, fechaLimite, recordatorio, createdAt, updatedAt y completedAt cuando corresponde.

- titulo: obligatorio, de 3 a 120 caracteres.
- descripcion: opcional, hasta 5000. categoria: hasta 80.
- prioridad: baja, media, alta.
- estado: pendiente, en_progreso, completada.
- fechaLimite: YYYY-MM-DD local o null. No convertir días locales accidentalmente a UTC.
- recordatorio: null, 0, 1 o 3 días antes; requiere fecha válida.
- createdAt/updatedAt/completedAt: instantes ISO UTC.
- Vencida: fecha anterior al día actual en Lima y no completada; no es un estado guardado.
- Usar la validación compartida y validación en backend. SQL siempre parametrizado.
- Los datos demo están identificados, separados en memoria y nunca se importan ni atribuyen al usuario.
- Confirmar eliminación. No sobrescribir registros ni datos locales al importar.
- No inferir finalizaciones antiguas desde updatedAt. Preservar task_events, completedAt y analytics_metadata.
- Las estadísticas y metas usan los cálculos existentes y distinguen estados actuales de actividad histórica verificable.

## PWA y seguridad offline

1. Registrar el Service Worker solo en producción y contexto seguro; usar HTTPS salvo localhost.
2. Precargar únicamente HTML, JS/CSS, manifest, logo e iconos locales de la compilación.
3. Nunca cachear respuestas de /api, reportes privados, destinos externos ni escrituras.
4. No implementar edición offline, colas o sincronización en segundo plano.
5. Sin backend, permitir abrir la interfaz precargada y explicar la limitación; no inventar datos ni mostrar agregados viejos como sincronizados.
6. Detectar disponibilidad mediante consultas reales, no solo navigator.onLine. Reintentar periódicamente y recuperar datos al reconectar.
7. Bloquear escrituras cuando la conexión esté identificada como caída; ante un fallo no anunciar guardado.
8. Mostrar el botón de instalación únicamente si el navegador proporciona beforeinstallprompt y no está instalada. Ofrecer instrucciones alternativas.
9. Versionar caché por compilación y recursos públicos. Las actualizaciones esperan confirmación o cierre de pestañas; no forzar recargas durante un formulario.
10. Eliminar únicamente cachés propias antiguas, nunca almacenamiento ajeno o datos del usuario.
11. Instalar la PWA no hace disponible un backend apagado. Sin internet puede funcionar con ambos servidores locales activos; sin acceso al backend solo queda la interfaz estática.
12. No exponer servidores a la red ni publicar sin autorización. Producción exige HTTPS, proxy explícitamente confiable y volúmenes persistentes.

## Fases de referencia

1. Interfaz profesional React/Vite.
2. Gestión completa de tareas.
3. API REST Express y SQLite.
4. Calendario, planificación y recordatorios.
5. Estadísticas, productividad, metas y reportes.
6. PWA multiplataforma sin IA: instalación, offline seguro, reconexión y responsive.
7. Autenticación del propietario, seguridad, sincronización online, respaldos y preparación de producción; publicación pendiente de autorización.

## Comprobaciones y entrega

En server: npm.cmd test.
En client: npm.cmd test, npm.cmd run lint, npm.cmd run build, npm.cmd run test:e2e y npm.cmd run test:pwa.

Las pruebas deben utilizar SQLite temporal o en memoria, sin vaciar ni abrir la base personal. test:pwa compila producción y utiliza puertos y base separados. Diferenciar pruebas unitarias, navegador automatizado, eventos de instalación simulados e instalación física real.

Mantener README actualizado con comandos disponibles, variables, endpoints, migraciones, offline, HTTPS, uso en PC/celular/tablet y limitaciones. No inventar métricas ni asegurar instalación en Android/iOS si no se probó físicamente.

## Seguridad y publicación — Fase 7

- Un solo propietario, creado únicamente mediante npm.cmd run admin:create en una terminal privada. No hay registro público, credenciales por defecto ni configuración inicial abierta por HTTP.
- Contraseñas con scrypt asíncrono N=131072, r=8, p=1, sal aleatoria y comparación constante. Mínimo 12, máximo 128 caracteres. No registrar credenciales ni pasarlas como argumentos del shell.
- Sesiones persistentes en SQLite: token aleatorio de 256 bits; guardar únicamente su SHA-256. Cookies HttpOnly y SameSite=Strict; Secure y prefijo __Host- en producción.
- Expiración absoluta configurable (predeterminado 168 horas). Logout revoca la sesión; cambiar contraseña revoca todas. Mantener límites de intentos y solicitudes.
- Todas las rutas de datos exigen autenticación de backend, incluyendo importación, recordatorios y descargas. Solo salud, estado de sesión e inicio de sesión son públicos. CORS no reemplaza autenticación.
- Escrituras autenticadas requieren X-CSRF-Token; el login requiere JSON y X-Alira-Request. Rechazar orígenes ajenos y solicitudes cross-site. No cachear cookies, tokens ni respuestas privadas.
- Mantener CSP compatible, HSTS en producción, bloqueo de marcos y cabeceras de seguridad. No desactivar HTTPS para resolver un despliegue.
- Configuración productiva debe declarar origen HTTPS, rutas absolutas de volúmenes y redes TRUST_PROXY; nunca confiar indiscriminadamente en encabezados reenviados.
- Producción sirve client/dist y /api desde el mismo origen. Usar VITE_API_URL=/api; una sola instancia con volumen SQLite persistente.
- Migración 005: owner, sessions, auth_attempts y versiones de tareas/metas. No borrar ni modificar retrospectivamente el contenido histórico. Mantener versiones 1 a 5 incrementales/transaccionales.
- PUT/PATCH/DELETE de tareas y metas requieren If-Match con la versión leída. Validación y escritura comparten transacción; confirmar la respuesta después de COMMIT. No actualizar silenciosamente la versión de un formulario abierto.
- La caché PWA contiene solo recursos estáticos. El dashboard se monta después de verificar la sesión. Al salir, desmontar datos de memoria y notificar a otras pestañas. Una recarga offline no acredita una sesión.
- Respaldos con sqlite.backup, no copia simple del archivo WAL activo. Verificar integridad y retirar sesiones de la copia. Descargar exige sesión, CSRF y contraseña actual.
- Copias periódicas en BACKUP_DIR fuera de la carpeta principal, con almacenamiento separado y copia externa cifrada a cargo del operador. No borrar automáticamente respaldos del usuario.
- Restaurar únicamente a un archivo nuevo mediante db:restore. Nunca reemplazar la base principal sin autorización expresa, respaldo previo y servidor detenido.
- No afirmar Docker, TLS público, Railway o dispositivos físicos probados si no se ejecutaron. No publicar ni contratar servicios para probarlos.
