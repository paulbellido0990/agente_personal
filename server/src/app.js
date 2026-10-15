import express from 'express'
import { reminderRoutes } from './routes/reminders.js'
import { createTaskRepository } from './repositories/taskRepository.js'
import { createTaskService } from './services/taskService.js'
import { taskRoutes } from './routes/tasks.js'
import { HttpError, errorHandler } from './errors.js'
export function createApp({ db, origin = 'http://localhost:5173', now }) {
  const app = express()
  app.disable('x-powered-by')
  app.use((req, res, next) => {
    res.setHeader('Vary', 'Origin')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'no-store')
    if (req.headers.origin && req.headers.origin !== origin) return next(new HttpError(403, 'Origen no permitido.'))
    if (req.headers.origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    }
    if (req.method === 'OPTIONS') return res.status(204).end()
    if (['POST','PUT','PATCH'].includes(req.method) && !req.is('application/json')) return next(new HttpError(415, 'Envía Content-Type: application/json.'))
    next()
  })
  app.use(express.json({ limit: '1mb', strict: true }))
  app.get('/api/health', (_req, res) => { db.prepare('SELECT 1').get(); res.json({ data: { status: 'ok' } }) })
  app.use('/api/reminders', reminderRoutes(db, now))
  app.use('/api/tasks', taskRoutes(createTaskService(createTaskRepository(db))))
  app.use((_req, _res, next) => next(new HttpError(404, 'La ruta solicitada no existe.')))
  app.use(errorHandler)
  return app
}
