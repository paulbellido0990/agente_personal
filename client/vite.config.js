import process from 'node:process'
import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {aliraPwa} from './pwa.mjs'
export default defineConfig({
 plugins:[react(),aliraPwa()],
 server:{proxy:{'/api':process.env.ALIRA_DEV_API_TARGET || 'http://127.0.0.1:3001'}},
 preview:{proxy:{'/api':process.env.ALIRA_DEV_API_TARGET || 'http://127.0.0.1:3001'},headers:{'Cache-Control':'no-cache'}},
})
