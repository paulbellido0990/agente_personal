import { useCallback,useEffect,useState } from 'react'
import { taskApi } from '../services/taskApi'
export default function useReport(range,tasks,enabled) {
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  const [revision,setRevision]=useState(0)
  useEffect(()=>{
    if(!enabled)return
    const controller=new AbortController()
    Promise.resolve().then(()=>{
      if(controller.signal.aborted)return
      setLoading(true);setError('')
      return taskApi.statistics(range,controller.signal)
    }).then(result=>{
      if(result&&!controller.signal.aborted){setData(result);setLoading(false)}
    }).catch(failure=>{if(!controller.signal.aborted){setError(failure.message);setLoading(false)}})
    return ()=>controller.abort()
  },[range,tasks,enabled,revision])
  const refresh=useCallback(()=>setRevision(n=>n+1),[])
  return {data,loading,error,refresh}
}
