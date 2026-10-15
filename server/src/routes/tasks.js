import { Router } from 'express'
import { createTaskController } from '../controllers/taskController.js'
export function taskRoutes(service) {
  const router = Router()
  const controller = createTaskController(service)
  router.get('/', controller.list)
  router.post('/import', controller.importTasks)
  router.post('/', controller.create)
  router.get('/:id', controller.get)
  router.put('/:id', controller.update)
  router.patch('/:id/status', controller.status)
  router.delete('/:id', controller.remove)
  return router
}
