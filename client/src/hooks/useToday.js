import { useEffect, useState } from 'react'
import { localDay } from '../services/tasks'
export default function useToday() {
  const [today, setToday] = useState(localDay)
  useEffect(() => {
    const update = () => setToday(localDay())
    const timer = setInterval(update, 30000)
    window.addEventListener('focus', update)
    return () => { clearInterval(timer); window.removeEventListener('focus', update) }
  }, [])
  return today
}
