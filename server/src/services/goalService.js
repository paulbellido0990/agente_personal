import { randomUUID } from 'node:crypto'
import { validDate,localDay } from '../../../shared/tasks.js'
import { uniqueCompletions } from './statisticsCalculator.js'
import { HttpError } from '../errors.js'
function validate(body) {
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['nombre','descripcion','fechaInicio','fechaFin','objetivo','activa'].includes(k)))throw new HttpError(400,'Campos de meta no válidos.')
  if(typeof body.nombre!=='string'||body.nombre.trim().length<3||body.nombre.trim().length>120)throw new HttpError(400,'El nombre debe tener entre 3 y 120 caracteres.')
  if(body.descripcion!=null&&(typeof body.descripcion!=='string'||body.descripcion.length>2000))throw new HttpError(400,'La descripción admite hasta 2000 caracteres.')
  if(!validDate(body.fechaInicio)||!validDate(body.fechaFin)||body.fechaInicio>body.fechaFin)throw new HttpError(400,'El periodo de la meta no es válido.')
  if(!Number.isInteger(body.objetivo)||body.objetivo<1||body.objetivo>100000)throw new HttpError(400,'El objetivo debe ser un entero entre 1 y 100000.')
  if(body.activa!==undefined&&typeof body.activa!=='boolean')throw new HttpError(400,'El estado activo debe ser verdadero o falso.')
  return {nombre:body.nombre.trim(),descripcion:body.descripcion?.trim()||'',fechaInicio:body.fechaInicio,fechaFin:body.fechaFin,objetivo:body.objetivo,activa:body.activa===false?0:1}
}
export function createGoalService(db,now=()=>new Date()) {
  const get=id=>db.prepare('SELECT * FROM goals WHERE id=?').get(id)
  function find(id){const goal=get(id);if(!goal)throw new HttpError(404,'No se encontró la meta.');return goal}
  return {
    list() {
      const events=db.prepare("SELECT * FROM task_events WHERE kind='completed' ORDER BY occurredAt,id").all()
      const startedAt=db.prepare('SELECT startedAt FROM analytics_metadata WHERE id=1').get().startedAt
      const today=localDay(now())
      return db.prepare('SELECT * FROM goals ORDER BY fechaInicio DESC,createdAt DESC').all().map(goal=>{
        const completed=uniqueCompletions(events,goal.fechaInicio,goal.fechaFin).length
        return {...goal,activa:!!goal.activa,completed,percent:Math.min(100,Math.round(completed/goal.objetivo*100)),historyPartial:goal.fechaInicio<=localDay(new Date(startedAt)),phase:!goal.activa?'Desactivada':goal.fechaFin<today?'Finalizada':goal.fechaInicio>today?'Próxima':'En curso'}
      })
    },
    create(body) {
      const goal=validate(body),id=randomUUID(),stamp=now().toISOString()
      db.prepare('INSERT INTO goals (id,nombre,descripcion,fechaInicio,fechaFin,objetivo,activa,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(id,goal.nombre,goal.descripcion,goal.fechaInicio,goal.fechaFin,goal.objetivo,goal.activa,stamp,stamp)
      return this.list().find(g=>g.id===id)
    },
    update(id,body) {
      find(id)
      const goal=validate(body)
      db.prepare('UPDATE goals SET nombre=?,descripcion=?,fechaInicio=?,fechaFin=?,objetivo=?,activa=?,updatedAt=? WHERE id=?')
        .run(goal.nombre,goal.descripcion,goal.fechaInicio,goal.fechaFin,goal.objetivo,goal.activa,now().toISOString(),id)
      return this.list().find(g=>g.id===id)
    },
    toggle(id,body) {
      find(id)
      if(!body||Object.keys(body).length!==1||typeof body.activa!=='boolean')throw new HttpError(400,'Envía únicamente activa como booleano.')
      db.prepare('UPDATE goals SET activa=?,updatedAt=? WHERE id=?').run(body.activa?1:0,now().toISOString(),id)
      return this.list().find(g=>g.id===id)
    },
  }
}
