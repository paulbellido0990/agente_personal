export function createTaskController(service) {
  return {
    list: (req, res) => res.json({ data: service.list(req.query) }),
    get: (req, res) => res.json({ data: service.get(req.params.id) }),
    create(req, res) {
      const { task, created } = service.create(req.body)
      res.status(created ? 201 : 200).location('/api/tasks/' + task.id).json({ data: task })
    },
    update: (req, res) => res.json({ data: service.update(req.params.id, req.body) }),
    status: (req, res) => res.json({ data: service.status(req.params.id, req.body) }),
    remove(req, res) { service.remove(req.params.id); res.status(204).end() },
    importTasks: (req, res) => res.json({ data: service.importTasks(req.body) }),
  }
}
