import {createInterface} from 'node:readline/promises'
import {Writable} from 'node:stream'
import {getConfig} from '../src/config.js'
import {openDatabase} from '../src/db/database.js'
import {initializeOwner} from '../src/services/passwords.js'
if(!process.stdin.isTTY){console.error('Ejecuta este comando en una terminal interactiva privada.');process.exit(1)}
let muted=false
const output=new Writable({write(chunk,_encoding,callback){if(!muted)process.stdout.write(chunk);callback()}})
const rl=createInterface({input:process.stdin,output,terminal:true})
let db
try{
 const config=getConfig();db=openDatabase(config.dbPath)
 if(db.prepare('SELECT id FROM owner').get())throw new Error('La cuenta propietaria ya existe; no se sobrescribirá.')
 const username=await rl.question('Nombre del propietario: ')
 process.stdout.write('Contraseña (mínimo 12 caracteres, oculta): ');muted=true
 const password=await rl.question('')
 process.stdout.write('\nRepite la contraseña: ')
 const confirmation=await rl.question('');muted=false;process.stdout.write('\n')
 if(password!==confirmation)throw new Error('Las contraseñas no coinciden.')
 await initializeOwner(db,username.trim(),password)
 console.log('Propietario creado. No hay registro público. Ya puedes iniciar sesión.')
}catch(error){muted=false;console.error(error.message);process.exitCode=1}finally{rl.close();db?.close()}
