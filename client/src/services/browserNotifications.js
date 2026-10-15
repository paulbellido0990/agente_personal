export function browserNotificationsSupported() {
  return typeof window !== 'undefined' && window.isSecureContext && 'Notification' in window
}
export async function requestBrowserNotifications() {
  if (!browserNotificationsSupported()) throw new Error('Este navegador no admite notificaciones aquí. Los avisos dentro de ALIRA siguen disponibles.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('No se concedió permiso. Los avisos dentro de ALIRA siguen disponibles.')
}
export async function notifyOnce(event, api, NotificationClass = globalThis.Notification) {
  if (!NotificationClass || NotificationClass.permission !== 'granted') return false
  const result = await api.claimReminder(event.id)
  if (!result.claimed) return false
  new NotificationClass('ALIRA · Recordatorio', { body: event.titulo + ' · Fecha límite: ' + event.fechaLimite, tag: event.id })
  return true
}
