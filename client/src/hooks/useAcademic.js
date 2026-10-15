import {useCallback,useEffect,useRef,useState} from 'react'
import {taskApi} from '../services/taskApi'
const empty={terms:[],courses:[],sessions:[],teachers:[],statistics:[],load:[],projects:[]}
export default function useAcademic(demo){
 const [data,setData]=useState(empty),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false)
 const running=useRef(false)
 const refresh=useCallback(async(signal)=>{
  if(demo)return
  try{const next=await taskApi.academic(signal);if(signal?.aborted)return;setData(current=>JSON.stringify(current)===JSON.stringify(next)?current:next);setError('')}
  catch(e){if(!signal?.aborted)setError(e.message)}
  finally{if(!signal?.aborted)setLoading(false)}
 },[demo])
 useEffect(()=>{
  const controller=new AbortController()
  const update=()=>refresh(controller.signal)
  queueMicrotask(update)
  const timer=setInterval(update,10000)
  window.addEventListener('focus',update);window.addEventListener('online',update)
  return()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',update);window.removeEventListener('online',update)}
 },[refresh])
 async function mutate(action){
  if(running.current)return null
  running.current=true;setBusy(true);setError('')
  try{const result=await action();await refresh();return result||{ok:true}}
  catch(e){setError(e.message);return null}
  finally{running.current=false;setBusy(false)}
 }
 return {data:demo?empty:data,error:demo?'':error,loading:!demo&&loading,busy,refresh,save:(kind,body,record)=>mutate(()=>taskApi.saveAcademic(kind,body,record)),remove:(record,kind)=>mutate(()=>taskApi.removeAcademic(record,kind))}
}
