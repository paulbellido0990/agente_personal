import { createHash } from 'node:crypto'
import { localDay,addDays } from '../../../shared/tasks.js'
import { calculateStatistics } from './statisticsCalculator.js'
import { HttpError } from '../errors.js'
export function createStatisticsService(db,now=()=>new Date()) {
  return {
    report(query={}) {
      if(Object.keys(query).some(k=>!['from','to'].includes(k))||Object.values(query).some(v=>typeof v!=='string'))throw new HttpError(400,'Filtros estadísticos inválidos.')
      const current=now(),today=localDay(current)
      let report
      try{
        db.exec('BEGIN')
        report=calculateStatistics({
          tasks:db.prepare('SELECT * FROM tasks ORDER BY id').all(),
          events:db.prepare('SELECT * FROM task_events ORDER BY occurredAt,id').all(),
          startedAt:db.prepare('SELECT startedAt FROM analytics_metadata WHERE id=1').get().startedAt,
          from:query.from||addDays(today,-6),to:query.to||today,now:current,
        })
        db.exec('COMMIT')
      }catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw new HttpError(400,error.message)}
      const {generatedAt,...stable}=report
      const revision=createHash('sha256').update(JSON.stringify(stable)).digest('hex')
      return {...report,generatedAt,revision}
    },
  }
}
