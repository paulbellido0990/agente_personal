import {getConfig} from '../src/config.js'
import {openDatabase} from '../src/db/database.js'
import {createBackup} from '../src/services/backupService.js'
const config=getConfig(),db=openDatabase(config.dbPath)
try{const result=await createBackup(db,config.backupDir);console.log('Respaldo consistente creado: '+result.path)}finally{db.close()}
