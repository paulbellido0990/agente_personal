import PDFDocument from 'pdfkit'
export const metricLabels={
  total:'Tareas existentes creadas en el periodo',pendiente:'Pendientes actuales',en_progreso:'En progreso actuales',completada:'Completadas actuales',
  vencidas:'Vencidas actuales',proximas:'Próximas a vencer (hoy + 3 días)',percent:'Porcentaje completado actual',
  created:'Tareas creadas en el periodo (incluye eliminadas)',completed:'Tareas con finalización registrada en el periodo',
  onTime:'Finalizaciones dentro de plazo',late:'Finalizaciones fuera de plazo',noDeadline:'Finalizaciones sin fecha límite',
  unknownCompleted:'Completadas históricas sin fecha conocida (toda la base)',unknownCreated:'Fecha de creación desconocida (toda la base)',average:'Promedio diario verificable',bestCount:'Mayor cantidad diaria registrada',
}
const cell=value=>{
  let text=String(value??'No disponible')
  // Neutralizar fórmulas al abrir el CSV en hojas de cálculo.
  if(/^[\s]*[=+\-@]/.test(text)||/^[\t\r]/.test(text))text="'"+text
  return '"'+text.replaceAll('"','""')+'"'
}
export function createCsv(report) {
  const rows=[
    ['ALIRA','Reporte de estadísticas'],['Periodo',report.from,report.to],['Generado (UTC)',report.generatedAt],
    ['Definición',report.definitions.cohort],['Actividad',report.definitions.activity],['Historial',report.definitions.history],
    ['Métrica','Valor'],...Object.entries(metricLabels).map(([key,label])=>[label,report.summary[key]]),
    ['Fecha más activa',report.summary.bestDay],[],['Distribución por estado','Cantidad'],...report.states.map(r=>[r.name,r.value]),
    [],['Distribución por prioridad','Cantidad'],...report.priorities.map(r=>[r.name,r.value]),
    [],['Categoría','Tareas','Porcentaje','Completadas actuales'],...report.categories.map(r=>[r.name,r.value,r.percent,r.completed]),
    [],['Actividad por día','Creadas','Finalizadas únicas'],...report.daily.map(r=>[r.date,r.created,r.completed]),
    [],['Mes','Creadas','Finalizadas únicas'],...report.monthly.map(r=>[r.month,r.created,r.completed]),
    [],['Categoría de finalización registrada','Cantidad'],...report.completionCategories.map(r=>[r.name,r.value]),
  ]
  return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')
}
export function createPdf(report) {
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:'A4',margin:44,bufferPages:true,info:{Title:'ALIRA · Reporte de productividad',Author:'ALIRA'}})
    const chunks=[]
    doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject)
    const width=doc.page.width-88
    function title(subtitle) {
      doc.fillColor('#8056D9').fontSize(28).text('ALIRA')
      doc.fillColor('#25213D').fontSize(17).text(subtitle,{paragraphGap:8})
      doc.fontSize(9).fillColor('#756F87').text('Periodo: '+report.from+' al '+report.to)
      doc.text('Generado: '+report.generatedAt+' · America/Lima para fechas de actividad')
      doc.moveDown()
    }
    function heading(text){doc.moveDown(.5);doc.fillColor('#6D41CA').fontSize(12).text(text);doc.moveDown(.4)}
    function row(label,value) {
      if(doc.y>740){doc.addPage();title('Continuación del reporte')}
      const y=doc.y,h=Math.max(21,doc.heightOfString(label,{width:width-110})+8)
      doc.roundedRect(44,y,width,h,4).fill('#F3EFFB')
      doc.fillColor('#25213D').fontSize(9).text(label,51,y+5,{width:width-120})
      doc.text(String(value??'No disponible'),44+width-100,y+5,{width:90,align:'right'})
      doc.y=y+h+4
    }
    function bars(items) {
      const max=Math.max(1,...items.map(r=>r.value))
      for(const item of items){
        if(doc.y>710){doc.addPage();title('Distribuciones')}
        const label=String(item.name)
        const y=doc.y
        doc.fontSize(9).fillColor('#25213D').text(label,44,y,{width:width-55})
        const lineHeight=Math.max(16,doc.heightOfString(label,{width:width-55}))
        const barY=y+lineHeight
        doc.roundedRect(44,barY,width,8,3).fill('#F3EFFB')
        if(item.value)doc.roundedRect(44,barY,Math.max(3,width*item.value/max),8,3).fill('#A88AE4')
        doc.fillColor('#25213D').text(String(item.value),44+width-45,y,{width:45,align:'right'})
        doc.y=barY+19
      }
    }
    try{
      title('Estadísticas y seguimiento de actividad')
      doc.fontSize(9).fillColor('#756F87').text(report.definitions.cohort)
      heading('Resumen del periodo')
      for(const [key,label]of Object.entries(metricLabels))row(label,report.summary[key])
      heading('Límites del historial')
      doc.fontSize(10).fillColor('#756F87').text(report.definitions.history)
      doc.text('Registro de finalizaciones desde '+report.startedAt+'. '+report.definitions.activity)
      doc.addPage();title('Distribución de tareas')
      heading('Estado actual');bars(report.states)
      heading('Prioridad');bars(report.priorities)
      heading('Categorías (porcentaje del conjunto actual)')
      bars(report.categories.map(r=>({...r,name:r.name+' · '+r.percent+'%'})))
      if(!report.categories.length)doc.fontSize(10).text('No hay tareas en este conjunto.')
      doc.addPage();title('Evolución registrada')
      heading('Últimos siete días del rango: finalizaciones únicas')
      bars(report.weekly.map(r=>({name:r.date,value:r.completed})))
      heading('Comparación mensual')
      for(const month of report.monthly)row(month.month,'C: '+month.created+' / F: '+month.completed)
      heading('Categorías con más finalizaciones registradas');bars(report.completionCategories)
      doc.fillColor('#756F87').fontSize(9).text('C = creadas; F = primera finalización de cada tarea dentro del periodo. No se evalúa a la persona por el número de tareas.')
      const pages=doc.bufferedPageRange()
      for(let index=0;index<pages.count;index++){
        doc.switchToPage(index)
        doc.fontSize(8).fillColor('#756F87').text('ALIRA · Organiza. Avanza. Logra.     '+(index+1)+' / '+pages.count,44,doc.page.height-32,{lineBreak:false})
      }
      doc.end()
    }catch(error){doc.destroy();reject(error)}
  })
}
