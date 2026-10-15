import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
export function workerSource(version,files) {
 return `const CACHE='alira-static-${version}';
const FILES=${JSON.stringify(files)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(url=>new Request(url,{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith('alira-static-')&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting())});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 // La API, las escrituras y los destinos externos siempre usan la red.
 if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname==='/api'||url.pathname.startsWith('/api/'))return;
 if(req.mode==='navigate'){
   event.respondWith(fetch(req).catch(()=>caches.open(CACHE).then(cache=>cache.match('/index.html'))));
   return;
 }
 if(!FILES.includes(url.pathname))return;
 event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.pathname))||fetch(req)));
});
`
}
export function aliraPwa() {
 return {name:'alira-static-pwa',apply:'build',generateBundle(_options,bundle){
   const files=['/index.html','/alira.svg','/manifest.webmanifest','/icons/alira-192.png','/icons/alira-512.png','/icons/alira-maskable-512.png','/icons/apple-touch-icon.png',...Object.keys(bundle).filter(n=>n!=='index.html').map(n=>'/'+n)].sort()
   const hash=createHash('sha256').update(JSON.stringify(bundle)).update(workerSource('',files))
   for(const file of files.filter(path=>!path.startsWith('/assets/') && path!=='/index.html'))hash.update(readFileSync(new URL('./public'+file,import.meta.url)))
   const version=hash.digest('hex').slice(0,16)
   this.emitFile({type:'asset',fileName:'sw.js',source:workerSource(version,files)})
 }}
}
