import {useCallback,useEffect,useState} from 'react'
import {taskApi} from '../services/taskApi'
export default function useRemote(path,enabled=true){
 const [result,setResult]=useState({path:null,data:null,error:'',loading:true})
 const refresh=useCallback(async(signal)=>{
  if(!enabled)return
  try{const data=await taskApi.platform(path,{signal});if(!signal?.aborted)setResult({path,data,error:'',loading:false})}
  catch(e){if(!signal?.aborted)setResult(current=>({...current,path,error:e.message,loading:false}))}
 },[path,enabled])
 useEffect(()=>{
  if(!enabled)return
  const controller=new AbortController(),check=()=>refresh(controller.signal)
  queueMicrotask(check);const timer=setInterval(check,15000)
  window.addEventListener('focus',check);window.addEventListener('online',check)
  return()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',check);window.removeEventListener('online',check)}
 },[refresh,enabled])
 return {...(result.path===path?result:{data:null,error:'',loading:true}),refresh}
}
