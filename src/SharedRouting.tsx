import {useEffect,useState} from 'react'
import type {Run} from './routing'
import type {Project,Provider} from './model'
import {Routing} from './Routing'

export function SharedRouting(props:{project:Project;providers:Provider[];commit:(old:Run|undefined,next:Run)=>boolean}){
  const repo=/^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/?$/i.exec(props.project.repo)?.[1].replace(/\.git$/,'').toLowerCase()
  const endpoint='/api/coord/'+repo
  const [shared,setShared]=useState<{revision:number;run:Run|null}>()
  const [message,setMessage]=useState('')
  const [pr,setPr]=useState('')
  const [busy,setBusy]=useState(false)
  useEffect(()=>{
    let active=true
    if(repo) fetch(endpoint).then(async res=>{
      if(!res.ok || !res.headers.get('content-type')?.includes('application/json')) throw Error('Kho mã chưa đồng bộ được với D1. Tải lại sau khi kiểm tra kết nối.')
      const state=await res.json()
      if(active)setShared(state)
    }).catch(e=>{if(active)setMessage(e.message)})
    return ()=>{active=false}
  },[endpoint,repo])
  async function send(body:object){
    setBusy(true)
    try{
      const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,revision:shared?.revision})})
      if(!res.ok)throw Error((await res.text()).slice(0,200))
      const state=await res.json()
      if(state.run)setShared(state)
      setMessage(state.message||'Đã lưu trên D1.')
      return true
    }catch(e){setMessage(String(e));return false}finally{setBusy(false)}
  }
  return <><fieldset disabled={busy || Boolean(repo && !shared)} style={{border:0,padding:0,minWidth:0}}><Routing {...props} project={{...props.project,run:shared?.run||props.project.run}} commit={shared?(_old,next)=>send({run:next}):props.commit}/>
  {shared?.run && <details className="panel"><summary>Nhánh và kiểm thử GitHub</summary><button onClick={()=>send({action:'branch'})}>Tạo nhánh từ SHA gốc</button><label>Số PR <input inputMode="numeric" value={pr} onChange={e=>setPr(e.target.value)}/></label><button onClick={()=>send({action:'pr',pr})}>Đọc SHA và kết quả CI</button></details>}</fieldset><pre role="status" style={{whiteSpace:'pre-wrap'}}>{message}</pre></>
}
