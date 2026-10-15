import {test} from 'node:test'
import assert from 'node:assert/strict'
import {occursOn,classOccurrences,sessionConflicts,projectProgress,minutes} from '../../shared/academic.js'
const rule={id:'a',dia:4,horaInicio:'10:00',horaFin:'12:00',fechaInicio:'2026-10-01',fechaFin:'2026-10-31'}
test('recurrencias respetan lunes-domingo y vigencia sin convertir fechas locales',()=>{
 assert.ok(occursOn(rule,'2026-10-15'));assert.equal(occursOn(rule,'2026-10-16'),false);assert.equal(occursOn(rule,'2026-11-05'),false)
 assert.equal(classOccurrences([rule],'2026-10-01','2026-10-31').length,5)
 assert.equal(classOccurrences([rule],'2026-11-01','2026-11-30').length,0)
 assert.equal(minutes('10:30'),630)
})
test('conflictos exigen coincidencia real de día, horas y fechas',()=>{
 assert.equal(sessionConflicts(rule,[{...rule,id:'b',horaInicio:'11:00'}]).length,1)
 assert.equal(sessionConflicts(rule,[{...rule,id:'b',horaInicio:'12:00',horaFin:'13:00'}]).length,0)
 assert.equal(sessionConflicts(rule,[{...rule,id:'b',dia:5}]).length,0)
 assert.equal(sessionConflicts(rule,[{...rule,id:'b',fechaInicio:'2026-11-01',fechaFin:'2026-11-30'}]).length,0)
})
test('proyectos avanzan por hitos completados y no por fechas ni otras tareas',()=>{
 const tasks=[{academic:{projectId:'p'},estado:'completada'},{academic:{projectId:'p'},estado:'pendiente'},{academic:{projectId:'otro'},estado:'completada'}]
 assert.deepEqual(projectProgress(tasks,'p'),{total:2,completed:1,percent:50})
 assert.equal(projectProgress(tasks,'sin-hitos').percent,0)
})
