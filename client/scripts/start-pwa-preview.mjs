import {spawn,spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
const vite=new URL('../node_modules/vite/bin/vite.js',import.meta.url)
const env={...process.env,VITE_API_URL:'/api',ALIRA_DEV_API_TARGET:'http://127.0.0.1:3012'}
const build=spawnSync(process.execPath,[fileURLToPath(vite),'build'],{stdio:'inherit',env})
if(build.status!==0)process.exit(build.status||1)
const child=spawn(process.execPath,[fileURLToPath(vite),'preview','--host','127.0.0.1','--port','5175','--strictPort'],{stdio:'inherit',env})
process.on('SIGTERM',()=>child.kill())
process.on('SIGINT',()=>child.kill())
child.on('exit',code=>process.exit(code||0))
