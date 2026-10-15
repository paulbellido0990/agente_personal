// Rasteriza el logo existente; no requiere red ni cambia su identidad.
import {chromium} from '@playwright/test'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
const svg=await readFile(new URL('../public/alira.svg',import.meta.url),'utf8')
const root=new URL('../public/icons/',import.meta.url)
await mkdir(root,{recursive:true})
const browser=await chromium.launch({headless:true})
try{
 const page=await browser.newPage()
 for(const [name,size,maskable] of [['alira-192.png',192,false],['alira-512.png',512,false],['alira-maskable-512.png',512,true],['apple-touch-icon.png',180,false]]){
   const result=await page.evaluate(async({svg,size,maskable})=>{
     const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(svg);await image.decode()
     const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size
     const ctx=canvas.getContext('2d');ctx.fillStyle='#8056D9';ctx.fillRect(0,0,size,size)
     const inset=maskable?size*.16:0;ctx.drawImage(image,inset,inset,size-inset*2,size-inset*2)
     return canvas.toDataURL('image/png').split(',')[1]
   },{svg,size,maskable})
   await writeFile(new URL(name,root),Buffer.from(result,'base64'))
 }
}finally{await browser.close()}
