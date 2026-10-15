import { test, expect } from './fixtures'
import { localDay } from '../../shared/tasks.js'
const API = 'http://127.0.0.1:3011/api'
test('campana accesible, leídos persistentes, perfil y tipografía responsive', async ({page, request}) => {
  const created = await request.post(API + '/tasks', {data:{titulo:'Aviso visual fase ocho',prioridad:'alta',estado:'pendiente',fechaLimite:localDay(),recordatorio:0}})
  const task = (await created.json()).data
  await page.goto('/')
  await expect(page.getByRole('button',{name:/Abrir recordatorios:/})).toBeVisible()
  await expect.poll(async () => (await request.get(API+'/reminders')).json().then(r=>r.data.some(e=>e.taskId===task.id))).toBe(true)
  await page.getByRole('button',{name:/Abrir recordatorios:/}).click()
  const popup=page.locator('#notification-popover')
  await expect(popup).toBeVisible()
  await expect(popup.getByRole('button',{name:'Cerrar',exact:true})).toBeFocused()
  await expect(popup.getByText('Aviso visual fase ocho',{exact:true})).toBeVisible()
  await popup.locator('li').filter({hasText:'Aviso visual fase ocho'}).getByRole('button',{name:'Marcar leído',exact:true}).click()
  await expect(popup.locator('li').filter({hasText:'Aviso visual fase ocho'})).toHaveClass('is-read')
  await page.keyboard.press('Escape')
  await expect(popup).toHaveCount(0)
  await expect(page.getByRole('button',{name:/Abrir recordatorios:/})).toBeFocused()
  await page.getByRole('button',{name:'Menú de cuenta'}).click()
  await page.getByRole('button',{name:'Cuenta y seguridad'}).click()
  await expect(page.getByRole('heading',{name:'Cuenta y seguridad'})).toBeVisible()
  for(const width of [360,390,768,1024,1440]){
    await page.setViewportSize({width,height:900})
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await page.getByRole('button',{name:/Abrir recordatorios:/}).click()
    await expect(popup).toBeVisible()
    expect(await popup.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})).toBe(true)
    await page.keyboard.press('Escape')
  }
  expect(await page.locator('h1').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(28)
  await request.delete(API+'/tasks/'+task.id)
})
