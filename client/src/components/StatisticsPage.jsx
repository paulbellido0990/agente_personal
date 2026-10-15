import { useState } from 'react'
import { Download,RefreshCw,Target } from 'lucide-react'
import { addDays } from '../services/tasks'
import { taskApi } from '../services/taskApi'
import useReport from '../hooks/useReport'
import StatisticsCharts from './StatisticsCharts'
function presetRange(preset,today){
  return {from:preset==='month'?today.slice(0,7)+'-01':addDays(today,preset==='30'?-29:-6),to:today}
}
export default function StatisticsPage({today,tasks,demo,onGoals}) {
  const [preset,setPreset]=useState('7'),[range,setRange]=useState(()=>presetRange('7',today))
  const [draft,setDraft]=useState(range),[formError,setFormError]=useState('')
  const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState('')
  const report=useReport(range,tasks,!demo)
  function changePreset(value){
    setPreset(value);setFormError('')
    if(value!=='custom'){const next=presetRange(value,today);setDraft(next);setRange(next)}
  }
  function apply(event){
    event.preventDefault()
    const span=(new Date(draft.to+'T12:00Z')-new Date(draft.from+'T12:00Z'))/86400000+1
    if(!draft.from||!draft.to||!Number.isFinite(span)||span<1||span>366||draft.to>today){setFormError('Elige un periodo válido de hasta 366 días, sin fechas futuras.');return}
    setFormError('');setRange({...draft})
  }
  async function download(format){
    if(!report.data||report.loading||report.error)return
    setExporting(true);setExportError('')
    try{
      const blob=await taskApi.downloadReport({from:report.data.from,to:report.data.to},report.data.revision,format)
      const url=URL.createObjectURL(blob),link=document.createElement('a')
      link.href=url;link.download='ALIRA-'+report.data.from+'-'+report.data.to+'.'+format
      document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
    }catch(error){setExportError(error.message)}finally{setExporting(false)}
  }
  if(demo)return <section className="panel statistics-page"><h2>Estadísticas de tus tareas reales</h2><p className="calendar-empty">La demo está excluida de las estadísticas, metas y reportes. Pulsa «Volver a mis tareas» para consultar los datos de SQLite.</p></section>
  const data=report.data
  return <section className="statistics-page" aria-labelledby="statistics-title">
    <div className="statistics-heading"><div><span className="eyebrow">ACTIVIDAD CON CONTEXTO</span><h2 id="statistics-title">Estadísticas</h2><p>Datos de SQLite · fechas locales de America/Lima</p></div><button className="secondary-button" onClick={onGoals}><Target size={15}/>Mis objetivos</button></div>
    <form className="panel statistics-filters" onSubmit={apply}>
      <label>Periodo estadístico<select value={preset} onChange={e=>changePreset(e.target.value)}><option value="7">Últimos siete días</option><option value="30">Últimos treinta días</option><option value="month">Mes actual</option><option value="custom">Personalizado</option></select></label>
      <label>Desde<input type="date" required max={today} value={draft.from} disabled={preset!=='custom'} onChange={e=>setDraft({...draft,from:e.target.value})}/></label>
      <label>Hasta<input type="date" required max={today} value={draft.to} disabled={preset!=='custom'} onChange={e=>setDraft({...draft,to:e.target.value})}/></label>
      {preset==='custom'&&<button className="primary-button">Aplicar periodo</button>}
      <button type="button" className="secondary-button" disabled={report.loading} onClick={report.refresh}><RefreshCw size={14}/>Actualizar reporte</button>
    </form>
    {formError&&<p className="storage-warning" role="alert">{formError}</p>}
    {report.loading&&<p className="panel loading-message" role="status">Calculando estadísticas…</p>}
    {report.error&&<p className="storage-warning" role="alert">{report.error} No se exportarán datos desactualizados.</p>}
    {exportError&&<p className="storage-warning" role="alert">{exportError}</p>}
    {data&&!report.loading&&!report.error&&<>
      <div className="panel metric-definitions"><strong>{data.from} al {data.to}</strong><p>{data.definitions.cohort}</p><p>{data.definitions.activity}</p><small>Generado: {new Date(data.generatedAt).toLocaleString('es-PE',{timeZone:'America/Lima'})} (Lima)</small></div>
      {!data.summary.total&&!data.summary.completed&&!data.summary.created&&<p className="panel loading-message">No hay datos en este periodo. Crea tus tareas reales o prueba otro rango.</p>}
      <div className="statistics-metrics">{[
        ['Total de tareas',data.summary.total],['Pendientes',data.summary.pendiente],['En progreso',data.summary.en_progreso],['Completadas actuales',data.summary.completada],
        ['Vencidas actuales',data.summary.vencidas],['Próximas a vencer',data.summary.proximas],['Porcentaje completado',data.summary.percent+'%'],['Finalizadas en el periodo',data.summary.completed],
      ].map(([label,value])=><article className="panel statistic-tile" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
      <div className="panel statistics-insights"><h3>Lectura del periodo</h3>
        <p><strong>{data.summary.created}</strong> tareas creadas · <strong>{data.summary.completed}</strong> tareas con finalización registrada.</p>
        <p>Dentro de plazo: <strong>{data.summary.onTime}</strong> · Fuera de plazo: <strong>{data.summary.late}</strong> · Sin fecha límite: <strong>{data.summary.noDeadline}</strong>. Usa la fecha límite que tenía la tarea al completarse.</p>
        <p>Promedio diario: <strong>{data.summary.average??'No disponible'}</strong>. {data.summary.average===null?'Requiere siete días o más con cobertura completa del registro.':''}</p>
        <p>Día con mayor actividad registrada: {data.summary.bestDay?data.summary.bestDay+' ('+data.summary.bestCount+' tareas)':'Sin actividad registrada'}.</p>
        <p>{data.definitions.history} Inicio del registro: {data.startedAt}. Completadas sin fecha conocida en toda la base: <strong>{data.summary.unknownCompleted}</strong>.</p>
        {data.summary.unknownCreated>0&&<p>{data.summary.unknownCreated} tareas tienen fecha de creación desconocida y no se incluyen en las métricas temporales de creación.</p>}
        <p>Estos datos describen actividad registrada; no evalúan la productividad personal.</p>
      </div>
      <StatisticsCharts report={data}/>
      <section className="panel statistics-categories"><h3>Categorías y cumplimiento</h3><div className="table-scroll"><table><thead><tr><th>Categoría</th><th>Tareas</th><th>Porcentaje</th><th>Completadas actuales</th></tr></thead><tbody>{data.categories.map(row=><tr key={row.name}><td>{row.name}</td><td>{row.value}</td><td>{row.percent}%</td><td>{row.completed}</td></tr>)}</tbody></table></div>
        <p className="calendar-subtitle">Más finalizaciones registradas: {data.completionCategories.length?data.completionCategories.map(row=>row.name+' ('+row.value+')').join(', '):'Sin datos suficientes.'}</p>
      </section>
      <div className="statistics-export"><button className="primary-button" disabled={exporting} onClick={()=>download('csv')}><Download size={16}/>Exportar CSV</button><button className="secondary-button" disabled={exporting} onClick={()=>download('pdf')}><Download size={16}/>Exportar PDF A4</button></div>
    </>}
  </section>
}
