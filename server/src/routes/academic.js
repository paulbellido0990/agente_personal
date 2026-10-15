import {createTeacherService} from '../services/teacherService.js'
import {Router} from 'express'
import {createAcademicService} from '../services/academicService.js'
export function academicRoutes(db,now,userId='1'){
 const router=Router(),service=createAcademicService(db,now,userId)
 const teachers=createTeacherService(db,userId,now)
 router.get('/teachers',(_req,res)=>res.json({data:teachers.list()}))
 router.post('/teachers',(req,res)=>res.status(201).json({data:teachers.save(req.body)}))
 router.put('/teachers/:id',(req,res)=>res.json({data:teachers.save(req.body,req.params.id)}))
 router.delete('/teachers/:id',(req,res)=>{teachers.remove(req.params.id);res.status(204).end()})
 router.get('/',(_req,res)=>res.json({data:service.snapshot()}))
 for(const kind of ['terms','courses','sessions']){
  router.post('/'+kind,(req,res)=>res.status(201).json({data:service.save(kind,req.body)}))
  router.put('/'+kind+'/:id',(req,res)=>res.json({data:service.save(kind,req.body,req.params.id)}))
 }
 router.delete('/sessions/:id',(req,res)=>{service.removeSession(req.params.id);res.status(204).end()})
 return router
}
