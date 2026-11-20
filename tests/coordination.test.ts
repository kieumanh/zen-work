import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {DatabaseSync} from 'node:sqlite'
// @ts-expect-error Worker entry is plain JavaScript.
import worker from '../worker/index.js'

it('rejects unsigned requests and prevents stale writes to a shared project',async()=>{
  const db=new DatabaseSync(':memory:')
  db.exec(readFileSync('migrations/0001_coordination.sql','utf8'))
  const env={ZENWORK_EMAIL:'test@example.org',ZENWORK_PASSWORD_SALT:'00'.repeat(24),ZENWORK_PASSWORD_HASH:'00'.repeat(32),ZENWORK_SESSION_KEY:'01'.repeat(48),DB:{prepare(sql:string){
    return {bind(...args:string[]){
      const statement=db.prepare(sql)
      return {first:()=>statement.get(...args),run:()=>({meta:statement.run(...args)})}
    }}
  }}}
  const origin='https://zenwork.test'
  const url=origin+'/api/coord/demo/project'
  expect((await worker.fetch(new Request(url),env)).status).toBe(401)
  const payload=(Math.floor(Date.now()/1000)+60)+'.'+'ab'.repeat(16)
  const {createHmac}=await import('node:crypto')
  const signature=createHmac('sha256',Buffer.from(env.ZENWORK_SESSION_KEY,'hex')).update(payload).digest('hex')
  const headers={Cookie:'__Host-zenwork_session='+payload+'.'+signature,Origin:origin}
  const run={id:'1',kind:'new',baseline:'start',goal:'test',branch:'feature/zw-'+crypto.randomUUID(),step:0,history:[]}
  const write=()=>worker.fetch(new Request(url,{method:'POST',headers,body:JSON.stringify({revision:0,run})}),env)
  expect((await write()).status).toBe(200)
  expect((await write()).status).toBe(409)
  expect(await (await worker.fetch(new Request(url,{headers}),env)).json()).toEqual({revision:1,run})
  db.close()
})
