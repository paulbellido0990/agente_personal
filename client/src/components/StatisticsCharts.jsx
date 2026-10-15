import { ResponsiveContainer,BarChart,Bar,LineChart,Line,XAxis,YAxis,CartesianGrid,Tooltip,Legend,Cell } from 'recharts'
const colors=['#8056D9','#E5AE56','#65AF93','#CC7A98','#86A9DD']
export function ChartCard({title,description,data,xKey='name',series=[{key:'value',name:'Tareas',color:'#8056D9'}],line=false,palette=null}) {
  const Chart=line?LineChart:BarChart
  const hasData=data.some(row=>series.some(s=>row[s.key]>0))
  return <section className="panel chart-card"><h3>{title}</h3><p>{description}</p>
    {hasData?<div className="chart-space" role="img" aria-label={title+'. Valores disponibles en la tabla adjunta.'}><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{width:300,height:240}}>
      <Chart data={data} margin={{top:12,right:12,left:-22,bottom:10}} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ede6f5"/><XAxis dataKey={xKey} tick={{fontSize:10}} interval="preserveStartEnd"/><YAxis allowDecimals={false} tick={{fontSize:10}}/><Tooltip/><Legend wrapperStyle={{fontSize:11}}/>
        {series.map(s=>line?<Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} type="monotone" isAnimationActive={false}/>:<Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[5,5,0,0]} isAnimationActive={false}>{palette&&series.length===1&&data.map((_,i)=><Cell key={i} fill={palette[i%palette.length]}/>)}</Bar>)}
      </Chart>
    </ResponsiveContainer></div>:<p className="chart-empty">Sin actividad registrada para este gráfico.</p>}
    <details className="chart-data"><summary>Ver datos de {title.toLowerCase()}</summary><div className="table-scroll"><table><thead><tr><th>Grupo</th>{series.map(s=><th key={s.key}>{s.name}</th>)}</tr></thead><tbody>{data.map((row,i)=><tr key={i}><td>{row[xKey]}</td>{series.map(s=><td key={s.key}>{row[s.key]}</td>)}</tr>)}</tbody></table></div></details>
  </section>
}
export default function StatisticsCharts({report}) {
  return <div className="statistics-charts">
    <ChartCard title="Actividad semanal" description="Últimos siete días del rango: primera finalización registrada de cada tarea." data={report.weekly} xKey="date" series={[{key:'completed',name:'Finalizadas únicas',color:'#8056D9'}]}/>
    <ChartCard title="Distribución por estado" palette={colors} description="Estado actual de las tareas existentes creadas en el rango." data={report.states}/>
    <ChartCard title="Distribución por prioridad" palette={['#D58BA0','#E5AE56','#65AF93']} description="Prioridad actual del mismo conjunto de tareas." data={report.priorities}/>
    <ChartCard title="Actividad por categoría" palette={colors} description="Cantidad de tareas existentes creadas en el rango; porcentajes en el resumen." data={report.categories}/>
    <ChartCard title="Tendencia mensual" description={report.monthly.length<2?'Solo hay un mes en el rango. Amplía el periodo para comparar; no se inventan meses previos.':'Creaciones y primeras finalizaciones registradas dentro del periodo.'} data={report.monthly} xKey="month" line series={[{key:'created',name:'Creadas',color:'#A78ACF'},{key:'completed',name:'Finalizadas únicas',color:'#5A9C85'}]}/>
  </div>
}
