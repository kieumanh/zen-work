import {useState} from 'react'
import {advance,packet,stages} from './routing'
import type {Run} from './routing'
import {download,id} from './model'
import type {Project,Provider} from './model'

export function Routing({project,providers,commit}:{project:Project;providers:Provider[];commit:(old:Run|undefined,next:Run)=>boolean|Promise<boolean>}) {
  const [copy,setCopy]=useState('')
  const run=project.run
  const stage=run && stages[run.step]
  const [kind,setKind]=useState<'existing'|'new'>(project.repo?'existing':'new')
  const [evidence,setEvidence]=useState('')
  const provider=providers.find(p=>p.id===stage?.[0])
  const blocked=provider && !(provider.enabled && provider.configured)
  async function finish(revise:boolean) {
    if(run && evidence.trim() && !blocked && await commit(run,advance(run,evidence,revise))) setEvidence('')
  }
  return <section className="panel routing"><h2>Điều phối Claude và ChatGPT</h2>
    {(!run || !stage) && <form onSubmit={e=>{
      e.preventDefault()
      const form=new FormData(e.currentTarget)
      const goal=String(form.get('goal')).trim()
      const baseline=String(form.get('baseline')||'Khởi tạo từ đầu').trim()
      if (!goal || !baseline) return
      const token=id()
      commit(run,{id:token,kind,goal,baseline,branch:'feature/zw-'+token,step:0,history:[]})
    }}><label>Điểm bắt đầu<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="new">Khởi tạo từ đầu</option><option value="existing">Tiếp nhận source có sẵn</option></select></label>
    {kind==='existing' && <label>Commit gốc hoặc tên và phiên bản gói source<input required name="baseline" maxLength={250}/></label>}
    <label>Tính năng, phạm vi và tiêu chí nghiệm thu<textarea required name="goal" maxLength={2500}/></label><button className="primary">Bắt đầu một lượt xây dựng</button></form>}
    {run && stage && <><h3>Bước {run.step+1}/5 · {stage[1]}</h3><p>{provider?.name|| (stage[0]==='ci'?'CI/CD':'Chủ dự án')} · {stage[2]}</p>
    {blocked?<p role="status">Nhà cung cấp đang tắt hoặc chưa được cấu hình.</p>:<><details><summary>Xem gói bàn giao</summary><pre>{packet(run,project.name,project.repo)}</pre></details>
    <div className="row"><button className="quiet-btn" onClick={()=>download(new Blob([packet(run,project.name,project.repo)],{type:'text/markdown;charset=utf-8'}),'zenwork-'+stage[0]+'.md')}>Tải gói bàn giao</button><button className="quiet-btn" onClick={()=>navigator.clipboard.writeText(packet(run,project.name,project.repo)).then(()=>setCopy("Đã sao chép."),()=>setCopy("Hãy dùng Tải gói bàn giao."))}>Sao chép prompt</button><small role="status">{copy}</small>{provider && <a href={provider.id==='chatgpt'?'https://chatgpt.com/':'https://claude.ai/code'} target="_blank" rel="noreferrer">Mở công cụ chính thức</a>}</div>
    <label>Kết quả đã đối chiếu (kế hoạch, SHA, PR hoặc kết quả CI)<textarea value={evidence} maxLength={6000} onChange={e=>setEvidence(e.target.value)}/></label>
    <div className="row"><button className="primary" disabled={!evidence.trim()} onClick={()=>finish(false)}>{run.step===4?'Xác nhận nghiệm thu':'Xác nhận và bàn giao'}</button>{run.step>=2 && <button className="quiet-btn" disabled={!evidence.trim()} onClick={()=>finish(true)}>Trả Claude sửa</button>}</div></>}</>}
    {run && !stage && <p>Lượt trước đã được nghiệm thu.</p>}
  </section>
}
