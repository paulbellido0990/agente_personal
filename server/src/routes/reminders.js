import { Router } from 'express'
import { createReminderService } from '../services/reminderService.js'
export function reminderRoutes(db, now) {
  const router = Router()
  const service = createReminderService(db, now)
  router.get('/', (_req,res) => res.json({ data: service.list() }))
  router.patch('/:id/read', (req,res) => res.json({ data: service.read(req.params.id) }))
  router.post('/:id/claim', (req,res) => res.json({ data: service.claim(req.params.id) }))
  return router
}
