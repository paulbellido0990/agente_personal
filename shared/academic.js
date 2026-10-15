import { addDays, validDate } from './tasks.js'
export const activityLabels = {teoria:'Teoría',laboratorio:'Laboratorio',practica:'Práctica calificada',tarea:'Tarea',grupal:'Trabajo grupal',exposicion:'Exposición',examen:'Examen',proyecto:'Proyecto final',hito:'Hito',otros:'Otros'}
export const evaluationLabels = {parcial:'Examen parcial',final:'Examen final',sustitutorio:'Examen sustitutorio',practica:'Práctica calificada',laboratorio:'Evaluación de laboratorio',exposicion:'Exposición'}
export const weekdays = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
export const minutes = time => Number(time.slice(0,2))*60 + Number(time.slice(3))
export const validTime = time => typeof time === 'string' && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time)
export function occursOn(session, day) {
  return validDate(day) && day >= session.fechaInicio && day <= session.fechaFin && ((new Date(day+'T12:00:00Z').getUTCDay()+6)%7)+1 === session.dia
}
export function sessionConflicts(session, sessions) {
  return sessions.filter(other => other.id !== session.id && other.dia === session.dia && session.horaInicio < other.horaFin && other.horaInicio < session.horaFin).filter(other => {
    const from = other.fechaInicio > session.fechaInicio ? other.fechaInicio : session.fechaInicio
    const to = other.fechaFin < session.fechaFin ? other.fechaFin : session.fechaFin
    if (from > to) return false
    for(let i=0;i<7;i++){const day=addDays(from,i);if(day>to)break;if(occursOn(session,day))return true}
    return false
  })
}
export function classOccurrences(sessions, from, to) {
  if(!validDate(from)||!validDate(to)||from>to)return []
  const result=[]
  // Los consumidores solicitan días/semanas/meses; no materializamos recurrencias.
  for(let day=from, count=0;day<=to&&count<370;day=addDays(day,1),count++){
    for(const session of sessions) if(occursOn(session,day))result.push({...session,occurrence:day})
    if(day==='9999-12-31')break
  }
  return result
}
export function projectProgress(tasks, projectId) {
  const milestones=tasks.filter(t=>t.academic?.projectId===projectId)
  return {total:milestones.length,completed:milestones.filter(t=>t.estado==='completada').length,percent:milestones.length?Math.round(milestones.filter(t=>t.estado==='completada').length/milestones.length*100):0}
}
