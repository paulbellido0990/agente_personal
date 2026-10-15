import { localDay, validDate, addDays } from '../../../shared/tasks.js'
const percent=(value,total)=>total?Math.round(value/total*1000)/10:0
const dayOf=stamp=>localDay(new Date(stamp))
const inRange=(day,from,to)=>day>=from&&day<=to
export function uniqueCompletions(events,from,to) {
  const seen=new Set()
  return events.filter(e=>e.kind==='completed'&&inRange(dayOf(e.occurredAt),from,to)).sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt)||a.id.localeCompare(b.id)).filter(e=>{
    if(seen.has(e.taskId))return false
    seen.add(e.taskId);return true
  })
}
export function validateRange(from,to,today) {
  if(!validDate(from)||!validDate(to)||from>to||to>today)throw new Error('Elige fechas válidas, ordenadas y no posteriores a hoy.')
  const days=Math.round((new Date(to+'T12:00Z')-new Date(from+'T12:00Z'))/86400000)+1
  if(days>366)throw new Error('El periodo puede tener hasta 366 días.')
  return days
}
export function calculateStatistics({tasks,events,startedAt,from,to,now=new Date()}) {
  const dates=new Map()
  const dateOf=stamp=>{if(!dates.has(stamp))dates.set(stamp,dayOf(stamp));return dates.get(stamp)}
  const today=localDay(now)
  const days=validateRange(from,to,today)
  const cohort=tasks.filter(t=>t.createdAt!=='1970-01-01T00:00:00.000Z'&&inRange(dateOf(t.createdAt),from,to))
  const completed=uniqueCompletions(events,from,to)
  const createdIds=new Set()
  const creations=events.filter(e=>e.kind==='created'&&inRange(dateOf(e.occurredAt),from,to)).filter(e=>{if(createdIds.has(e.taskId))return false;createdIds.add(e.taskId);return true})
  const states=['pendiente','en_progreso','completada'].map((key,i)=>({key,name:['Pendientes','En progreso','Completadas'][i],value:cohort.filter(t=>t.estado===key).length}))
  const priorities=['alta','media','baja'].map((key,i)=>({key,name:['Alta','Media','Baja'][i],value:cohort.filter(t=>t.prioridad===key).length}))
  const categories=[...new Set(cohort.map(t=>t.categoria))].sort().map(name=>{
    const value=cohort.filter(t=>t.categoria===name).length
    return {name,value,percent:percent(value,cohort.length),completed:cohort.filter(t=>t.categoria===name&&t.estado==='completada').length}
  }).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name))
  const createdByDay=new Map(),completedByDay=new Map()
  for(const event of creations){const day=dateOf(event.occurredAt);createdByDay.set(day,(createdByDay.get(day)||0)+1)}
  for(const event of completed){const day=dateOf(event.occurredAt);completedByDay.set(day,(completedByDay.get(day)||0)+1)}
  const daily=Array.from({length:days},(_,i)=>{
    const date=addDays(from,i)
    return {date,created:createdByDay.get(date)||0,completed:completedByDay.get(date)||0}
  })
  const months=[...new Set(daily.map(d=>d.date.slice(0,7)))]
  const monthly=months.map(month=>({month,created:daily.filter(d=>d.date.startsWith(month)).reduce((s,d)=>s+d.created,0),completed:daily.filter(d=>d.date.startsWith(month)).reduce((s,d)=>s+d.completed,0)}))
  const known=completed.filter(e=>e.fechaLimite)
  const onTime=known.filter(e=>dateOf(e.occurredAt)<=e.fechaLimite).length
  const unknown=tasks.filter(t=>t.estado==='completada'&&!t.completedAt).length
  const coverageFrom=addDays(dateOf(startedAt),1)
  const sufficient=from>=coverageFrom&&days>=7
  const best=daily.reduce((a,b)=>b.completed>a.completed?b:a,{date:null,completed:0})
  const completionCategories=[...new Set(completed.map(e=>e.categoria))].sort().map(name=>({name,value:completed.filter(e=>e.categoria===name).length})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name))
  return {
    from,to,today,generatedAt:now.toISOString(),startedAt,days,coverageFrom,
    summary:{
      total:cohort.length,pendiente:states[0].value,en_progreso:states[1].value,completada:states[2].value,
      vencidas:cohort.filter(t=>t.estado!=='completada'&&t.fechaLimite&&t.fechaLimite<today).length,
      proximas:cohort.filter(t=>t.estado!=='completada'&&t.fechaLimite>=today&&t.fechaLimite<=addDays(today,3)).length,
      percent:percent(states[2].value,cohort.length),created:creations.length,completed:completed.length,onTime,late:known.length-onTime,
      noDeadline:completed.length-known.length,unknownCompleted:unknown,unknownCreated:tasks.filter(t=>t.createdAt==='1970-01-01T00:00:00.000Z').length,
      average:sufficient?Math.round(completed.length/days*100)/100:null,
      bestDay:best.date,bestCount:best.completed,
    },
    states,priorities,categories,completionCategories,daily,weekly:daily.slice(-7),monthly,
    definitions:{
      cohort:'Tareas existentes creadas en el periodo; estados actuales, no al cierre histórico.',
      activity:'Creaciones y primeras finalizaciones registradas de cada tarea dentro del rango. Se conserva el historial aunque se elimine una tarea.',
      history:'Sin fechas de finalización anteriores al inicio del registro. No se usa updatedAt para inferirlas.',
      average:'Finalizaciones únicas / días del rango; disponible con al menos siete días y cobertura desde el día posterior al inicio del registro.',
    },
  }
}
