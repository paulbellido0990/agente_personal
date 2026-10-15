import { Router } from 'express'
import { createStatisticsService } from '../services/statisticsService.js'
import { createGoalService } from '../services/goalService.js'
import { createCsv,createPdf } from '../services/reportService.js'
import { HttpError } from '../errors.js'
export function statisticsRoutes(db,now) {
  const router=Router(),stats=createStatisticsService(db,now),goals=createGoalService(db,now)
  router.get('/statistics',(req,res)=>res.json({data:stats.report(req.query)}))
  for(const format of ['csv','pdf'])router.get('/statistics/export.'+format,async(req,res)=>{
    const {revision,...query}=req.query
    const report=stats.report(query)
    if(typeof revision!=='string'||revision!==report.revision)throw new HttpError(409,'Los datos cambiaron. Actualiza el reporte antes de exportarlo.')
    const content=format==='csv'?createCsv(report):await createPdf(report)
    res.setHeader('Content-Disposition','attachment; filename="ALIRA-'+report.from+'-'+report.to+'.'+format+'"')
    res.type(format==='csv'?'text/csv; charset=utf-8':'application/pdf').send(content)
  })
  router.get('/goals',(_req,res)=>res.json({data:goals.list()}))
  router.post('/goals',(req,res)=>res.status(201).json({data:goals.create(req.body)}))
  router.put('/goals/:id',(req,res)=>res.json({data:goals.update(req.params.id,req.body)}))
  router.patch('/goals/:id/active',(req,res)=>res.json({data:goals.toggle(req.params.id,req.body)}))
  return router
}
