import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Activity, ArrowDownToLine, ArrowUp, BookOpen, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardList, Command, Copy, Ellipsis, ExternalLink, FileText, FolderKanban, GitBranch, GitPullRequest, LayoutDashboard, LogOut, Menu, MessageSquare, Moon, Paperclip, Pin, Plus, Search, Settings, Sparkles, Sun, Workflow, X
} from 'lucide-react'
import '@fontsource/lora/700.css'
import '@fontsource/dancing-script/700.css'
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import '@fontsource/ibm-plex-mono/500.css'
import { defaults, download, event, flows, getFile, handoffText, id, initial, key, now, progress, putFile, read, statuses } from './model'
import type { Conversation, Data, Entry, Flow, Mode, Provider, Route, Status } from './model'
import {Routing} from './Routing'
import './styles.css'

const logo = import.meta.env.BASE_URL + 'logo.png'
const menu = [
  {id:'workchat',label:'WorkChat',icon:MessageSquare}, {id:'dashboard',label:'Dashboard',icon:LayoutDashboard},
  {id:'projects',label:'Dự án',icon:FolderKanban}, {id:'models',label:'Mô hình AI',icon:Sparkles},
  {id:'activity',label:'Hoạt động',icon:Activity}, {id:'settings',label:'Cài đặt',icon:Settings}
] as const
const modes = [{id:'chat',label:'Trò chuyện',icon:MessageSquare},{id:'task',label:'Giao việc',icon:ClipboardList},{id:'handoff',label:'Bàn giao',icon:Workflow}] as const
const suggestions = [
  {title:'Lập kế hoạch dự án',desc:'Chia mục tiêu thành các bước rõ ràng',icon:BookOpen,text:'Hãy giúp tôi chia mục tiêu dự án thành các giai đoạn, nhiệm vụ và tiêu chí nghiệm thu.',mode:'chat'},
  {title:'Tạo nhiệm vụ',desc:'Xác định việc cần làm và tiêu chí nghiệm thu',icon:ClipboardList,text:'',mode:'task'},
  {title:'Bàn giao cho AI',desc:'Đóng gói bối cảnh để tiếp tục công việc',icon:Workflow,text:'',mode:'handoff'}
] as const
const displayDate = (time: string) => new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(time))
const officialUrl = (value: string) => { try { const url = new URL(value); return url.protocol==='https:' && !url.username && !url.password } catch { return false } }
type Modal = 'search' | 'task' | 'project' | 'provider' | 'usage' | 'rename' | 'result' | 'reset' | 'repo' | 'help' | null

function App() {
  const [load] = useState(() => { try { return { data:read(),error:'' } } catch { return { data:initial(false),error:'Không đọc được dữ liệu đã lưu. Hãy xuất dữ liệu từ trình duyệt trước khi tiếp tục.' } } })
  const [data,setData] = useState(load.data)
  const [route,setRoute] = useState<Route>('workchat')
  const [projectId,setProject] = useState(data.projects[0].id)
  const [conversationId,setConversation] = useState(data.conversations[0]?.id ?? '')
  const [providerId,setProvider] = useState('chatgpt')
  const [model,setModel] = useState('')
  const [mode,setMode] = useState<Mode>('chat')
  const [flow,setFlow] = useState<Flow>('sequential')
  const [draft,setDraft] = useState('')
  const [file,setFile] = useState<File|null>(null)
  const [notice,setNotice] = useState(load.error)
  const [storageError,setStorageError] = useState(load.error)
  const [modal,setModal] = useState<Modal>(null)
  const [search,setSearch] = useState('')
  const [filter,setFilter] = useState('')
  const [providerFilter,setProviderFilter] = useState('')
  const [dateFilter,setDateFilter] = useState('')
  const [showHistory,setShowHistory] = useState(false)
  const [showContext,setShowContext] = useState(false)
  const [showMenus,setShowMenus] = useState(false)
  const [showRefs,setShowRefs] = useState(false)
  const [showArchived,setShowArchived] = useState(false)
  const [board,setBoard] = useState(true)
  const [editProvider,setEditProvider] = useState<Provider>()
  const [replyTo,setReplyTo] = useState<Entry>()
  const [busy,setBusy] = useState(false)
  const draftRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDialogElement>(null)
  const project = data.projects.find(item=>item.id===projectId) ?? data.projects[0]
  const conversation = data.conversations.find(item=>item.id===conversationId && item.project===project.id)
  const available = data.providers.filter(item=>item.enabled && item.configured)
  const provider = available.find(item=>item.id===providerId) ?? available[0]
  const tasks = data.tasks.filter(item=>item.project===project.id)
  const history = data.conversations.filter(item=>item.project===project.id && item.archived===showArchived).sort((a,b)=>Number(b.pinned)-Number(a.pinned))
  const stats = progress(tasks)

  useEffect(()=>{
    const query = matchMedia('(prefers-color-scheme: dark)')
    const apply = ()=>document.documentElement.dataset.theme = data.theme==='system' ? (query.matches?'dark':'light') : data.theme
    apply()
    query.addEventListener('change',apply)
    return ()=>query.removeEventListener('change',apply)
  },[data.theme])
  useEffect(()=>{
    const dialog = modalRef.current
    if (modal && dialog && !dialog.open) dialog.showModal()
    if (!modal && dialog?.open) dialog.close()
  },[modal])
  useEffect(()=>{
    const keydown = (e: KeyboardEvent)=>{ if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='k') { e.preventDefault(); setModal('search') } }
    window.addEventListener('keydown',keydown)
    return ()=>window.removeEventListener('keydown',keydown)
  },[])
  useEffect(()=>{ if (notice && notice!==storageError) { const timer=setTimeout(()=>setNotice(''),4100); return ()=>clearTimeout(timer) } },[notice,storageError])
  useEffect(()=>{ if (conversation?.entries.length) endRef.current?.scrollIntoView({block:'nearest'}) },[conversation?.entries.length])

  function save(update: (value: Data)=>Data) {
    if (storageError) { setNotice(storageError); return false }
    try {
      const latest = localStorage.getItem(key) ? read() : data
      const next = update(latest)
      localStorage.setItem(key,JSON.stringify(next))
      setData(next)
      return true
    } catch {
      setNotice('Không lưu được thay đổi. Hãy kiểm tra dung lượng hoặc quyền lưu của trình duyệt.')
      return false
    }
  }
  useEffect(()=>{
    const sync = (e: StorageEvent)=>{ if (e.key===key && e.newValue) { try { setData(read()); setStorageError('') } catch { setStorageError('Không đọc được dữ liệu đang lưu.') } } }
    window.addEventListener('storage',sync)
    return ()=>window.removeEventListener('storage',sync)
  },[])
  function navigate(next: Route) { setRoute(next);setShowHistory(false);setShowContext(false);setShowMenus(false) }
  function selectProject(next: string) {
    setProject(next)
    setConversation(data.conversations.find(item=>item.project===next && !item.archived)?.id ?? '')
    setDraft('');setFile(null)
  }
  function selectConversation(item: Conversation) {
    setProject(item.project);setConversation(item.id);setDraft('');setFile(null);setModal(null);navigate('workchat')
  }
  function newConversation() {
    const item: Conversation = {id:id(),project:project.id,title:'Cuộc trò chuyện mới',pinned:false,archived:false,entries:[]}
    if (save(d=>event({...d,conversations:[item,...d.conversations]},project.id,'Hội thoại','Tạo cuộc trò chuyện'))) selectConversation(item)
  }
  function updateConversation(updates: Partial<Conversation>, label: string) {
    if (!conversation) return
    if (save(d=>event({...d,conversations:d.conversations.map(item=>item.id===conversation.id ? {...item,...updates}:item)},project.id,'Hội thoại',label))) {
      if (updates.archived) setConversation('')
      setShowMenus(false);setModal(null)
    }
  }
  async function addEntry(type: Entry['type'], value: string) {
    const text = value.trim()
    const attached = type==='result'?null:file
    if (busy || (!text && !attached) || (type==='handoff' && (!provider || !text))) return
    if (conversation?.archived) { setNotice('Khôi phục hội thoại trước khi tiếp tục.');return }
    setBusy(true)
    try {
      const attachment = attached?{id:id(),name:attached.name,size:attached.size}:undefined
      if (attached && attachment) await putFile(attachment.id,attached)
      const entry: Entry = {id:id(),text,time:now(),provider:type==='result' ? replyTo?.provider ?? '' : provider?.id ?? '',replyTo:type==='result'?replyTo?.id:undefined,model:provider?.models.includes(model)?model:undefined,type,attachment}
      const conv: Conversation = conversation ?? {id:id(),project:project.id,title:text.slice(0,45)||'Cuộc trò chuyện mới',pinned:false,archived:false,entries:[]}
      if (save(d=>{
        const current=d.conversations.find(item=>item.id===conv.id)
        const prior = current ?? conv
        if (prior.archived) throw new Error('Hội thoại đã lưu trữ.')
        const savedEntry = type==='handoff' && provider ? {...entry,handoff:{prompt:handoffText(project,prior,entry,flow,provider),name:provider.name,url:provider.url,flow}} : entry
        const updated={...prior,entries:[...prior.entries,savedEntry]}
        const conversations=current?d.conversations.map(item=>item.id===conv.id?updated:item):[updated,...d.conversations]
        return event({...d,conversations},project.id,type==='note'?'Hội thoại':'Bàn giao',type==='note'?'Lưu tin nhắn':type==='result'?'Nhập kết quả thủ công':'Tạo gói bàn giao',entry.provider)
      })) {
        setConversation(conv.id)
        if (type!=='result') { setDraft('');setFile(null);setShowRefs(false) }
        setModal(null)
      }
    } catch { setNotice('Không thể lưu tệp đính kèm.') } finally {setBusy(false)}
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text);setNotice('Đã sao chép gói bàn giao.') }
    catch {
      download(new Blob([text],{type:'text/plain;charset=utf-8'}),'zenwork-handoff.md')
      setNotice('Đã tải gói bàn giao xuống.')
    }
  }
  function submitDraft() {
    if (mode==='task') { setModal('task');return }
    void addEntry(mode==='handoff'?'handoff':'note',draft)
  }
  function onDialog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fields = new FormData(e.currentTarget)
    const get = (name: string)=>String(fields.get(name) ?? '').trim()
    if (modal==='rename') { if (get('title')) updateConversation({title:get('title')},'Đổi tên cuộc trò chuyện');return }
    if (modal==='result') { void addEntry('result',get('result'));return }
    if (modal==='reset') {
      if (data.events.length || data.usage.length || data.tasks.some(item=>!['brand','ui','qa'].includes(item.id)) || data.conversations.some(item=>item.entries.length)) {
        setNotice('Không gian đã có dữ liệu riêng. Tạo dự án mới để bắt đầu với dữ liệu trống.');return
      }
      if (save(d=>({...initial(false),theme:d.theme,providers:d.providers}))) {setConversation('');setModal(null)}
      return
    }
    if (modal==='task') {
      if (!get('title') || !get('acceptance')) return
      const weight = Number(get('weight'))
      if (!Number.isInteger(weight) || weight<1 || weight>100) return
      const task = {id:id(),project:project.id,title:get('title'),acceptance:get('acceptance'),weight,owner:get('owner'),priority:get('priority'),status:'todo' as const}
      if (save(d=>event({...d,tasks:[...d.tasks,task]},project.id,'Nhiệm vụ','Tạo nhiệm vụ · '+task.title))) {
        setDraft('');setNotice('Đã tạo nhiệm vụ.');setModal(null)
      }
      return
    }
    if (modal==='project') {
      if (!get('title') || !get('version')) return
      const item = {id:id(),name:get('title'),description:get('description'),version:get('version'),repo:''}
      if (save(d=>event({...d,projects:[...d.projects,item]},item.id,'Dự án','Tạo dự án · '+item.name))) {
        setProject(item.id);setConversation('');setModal(null);navigate('projects')
      }
      return
    }
    if (modal==='provider') {
      const url=get('url')
      if (!get('title') || !get('role') || (url && !officialUrl(url))) {setNotice('Nhập tên, vai trò và địa chỉ HTTPS hợp lệ nếu có.');return}
      const item = {id:editProvider?.id ?? id(), name:get('title'), initials:editProvider?.initials ?? '◇', role:get('role'), url, models:[...new Set(get('models').split(',').map(value=>value.trim()).filter(Boolean))],configured:true,enabled:editProvider?.configured ? editProvider.enabled : true}
      if (save(d=>event({...d,providers:editProvider ? d.providers.map(old=>old.id===item.id?item:old) : [...d.providers,item]},project.id,'Nhà cung cấp','Lưu cấu hình bàn giao · '+item.name,item.id))) setModal(null)
      return
    }
    if (modal==='usage') {
      const tokens=Number(get('tokens'))
      if (!get('tokens') || !Number.isSafeInteger(tokens) || tokens<0 || !data.providers.some(item=>item.id===get('provider'))) return
      const item = {id:id(),project:project.id,provider:get('provider'),tokens,source:get('source') as 'estimate'|'reported',time:now()}
      if (save(d=>event({...d,usage:[item,...d.usage]},project.id,'Hạn mức','Ghi thống kê token',item.provider))) setModal(null)
      return
    }
    if (modal==='repo') {
      const repo=get('repo')
      if (repo && (!officialUrl(repo) || new URL(repo).hostname!=='github.com' || !/^\/[\w.-]+\/[\w.-]+\/?$/.test(new URL(repo).pathname))) {setNotice('Nhập liên kết kho mã GitHub hợp lệ.');return}
      if (save(d=>event({...d,projects:d.projects.map(item=>item.id===project.id?{...item,repo}:item)},project.id,'Dự án','Cập nhật liên kết GitHub'))) setModal(null)
    }
  }
  function taskStatus(taskId: string, status: Status) {
    const task=tasks.find(item=>item.id===taskId)
    if (!task || task.status===status) return
    save(d=>event({...d,tasks:d.tasks.map(item=>item.id===taskId?{...item,status}:item)},project.id,'Nhiệm vụ',task.title+' · '+statuses[task.status]+' → '+statuses[status]))
  }
  function exportWorkspace() {
    download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'zenwork-workspace.json')
    setNotice('Đã xuất dữ liệu. Tải riêng các tệp đính kèm từ WorkChat.')
  }
  const taskCard = (task: typeof tasks[number]) => <article className="task-card" key={task.id}>
    <div className="row spread"><span className="badge">{task.priority}</span><span className="mono subtle">{task.weight} điểm</span></div>
    <h3>{task.title}</h3><p>{task.acceptance}</p><div className="row spread task-bottom"><span>{task.owner || 'Chưa phân công'}</span><select aria-label={'Trạng thái '+task.title} value={task.status} onChange={e=>taskStatus(task.id,e.target.value as Status)}>{Object.entries(statuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
  </article>

  return <div className="shell">
    {showHistory && <button type="button" className="mobile-overlay" aria-label="Đóng điều hướng" onClick={()=>setShowHistory(false)}/>}
    <aside className={'sidebar '+(showHistory?'mobile-open':'')}>
      <button type="button" className="brand" onClick={()=>navigate('workchat')}><img src={logo} alt=""/><span><strong>ZenWork</strong><small>AI WORKSPACE</small></span></button>
      <label className="workspace-select"><span className="workspace-icon"><FolderKanban size={17}/></span><span><small>Dự án hiện tại</small><select aria-label="Dự án hiện tại" value={project.id} onChange={e=>selectProject(e.target.value)}>{data.projects.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></span><ChevronDown size={15}/></label>
      <div className="sidebar-body">
        <div className="section-label">KHÔNG GIAN LÀM VIỆC</div>
        <nav aria-label="Điều hướng chính">{menu.map(({id,label,icon:Icon})=><button key={id} type="button" aria-current={route===id?'page':undefined} className={route===id?'active':''} onClick={()=>navigate(id)}><Icon size={18}/><span>{label}</span>{route===id&&<span className="active-dot"/>}</button>)}</nav>
        <div className="history-head section-label"><span>HỘI THOẠI</span><button type="button" className="icon-btn" aria-label="Tìm hội thoại" onClick={()=>{setSearch('');setModal('search')}}><Search size={15}/></button><button type="button" className="icon-btn" aria-label="Tạo cuộc trò chuyện" onClick={newConversation}><Plus size={17}/></button></div>
        <div className="history">{history.length?history.map(item=><button type="button" key={item.id} className={route==='workchat'&&conversation?.id===item.id?'current':''} onClick={()=>selectConversation(item)}>{item.pinned?<Pin size={14}/>:<MessageSquare size={14}/>}<span>{item.title}</span></button>):<p>{showArchived?'Chưa có hội thoại lưu trữ.':'Chưa có cuộc trò chuyện.'}</p>}</div>
        <button type="button" className="archive-link" onClick={()=>setShowArchived(!showArchived)}>{showArchived?'Hội thoại đang mở':'Xem bản lưu trữ'}</button>
      </div>
      <div className="sidebar-foot"><span className="avatar">ZW</span><span><strong>Không gian cá nhân</strong><small>Dữ liệu trên thiết bị</small></span><form className="logout-form" action="/logout" method="post"><button className="icon-btn" aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={17}/></button></form></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><button type="button" className="icon-btn mobile-menu" aria-label="Mở điều hướng" onClick={()=>setShowHistory(true)}><Menu size={22}/></button><div className="breadcrumbs"><span>Không gian làm việc</span><ChevronRight size={14}/><strong>{menu.find(item=>item.id===route)?.label}</strong></div><div className="top-actions"><button type="button" className="search-btn" aria-label="Tìm kiếm" onClick={()=>{setSearch('');setModal('search')}}><Search size={16}/><span>Tìm kiếm</span><kbd><Command size={12}/> K</kbd></button><button type="button" className="icon-btn theme-btn" aria-label="Đổi giao diện sáng tối" onClick={()=>save(d=>({...d,theme:document.documentElement.dataset.theme==='dark'?'light':'dark'}))}>{data.theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button><button type="button" className="icon-btn help-btn" aria-label="Hướng dẫn" onClick={()=>setModal('help')}><CircleHelp size={19}/></button><button type="button" className="icon-btn context-toggle" aria-label="Mở ngữ cảnh dự án" onClick={()=>setShowContext(!showContext)}><Workflow size={20}/></button></div></header>
      <div className={'workarea '+(route==='workchat'?'workchat':'')}>
        {route==='workchat' ? <>
          <main className="chat-main">
            <div className="chat-toolbar"><div className="row"><div className="chat-title-icon"><MessageSquare size={18}/></div><div><h2>{conversation?.title ?? 'Cuộc trò chuyện mới'}</h2><span>{project.name} <i/> {project.version}</span></div></div><div className="row"><button type="button" className="quiet-btn new-btn" aria-label="Hội thoại mới" onClick={newConversation}><Plus size={17}/> <span>Hội thoại mới</span></button>{conversation&&<div className="relative"><button type="button" className="icon-btn" aria-expanded={showMenus} aria-label="Tùy chọn hội thoại" onClick={()=>setShowMenus(!showMenus)}><Ellipsis size={21}/></button>{showMenus&&<div className="popover"><button onClick={()=>{setModal('rename');setShowMenus(false)}}>Đổi tên</button><button onClick={()=>updateConversation({pinned:!conversation.pinned},conversation.pinned?'Bỏ ghim hội thoại':'Ghim hội thoại')}>{conversation.pinned?'Bỏ ghim':'Ghim hội thoại'}</button><button onClick={()=>updateConversation({archived:!conversation.archived},conversation.archived?'Khôi phục hội thoại':'Lưu trữ hội thoại')}>{conversation.archived?'Khôi phục':'Lưu trữ'}</button></div>}</div>}</div></div>
            <div className="chat-scroll">
              {conversation?.entries.length ? <div className="messages">{conversation.entries.map(entry=>{
                const entryProvider=data.providers.find(item=>item.id===entry.provider) ?? defaults[0]
                const promptText=entry.handoff?.prompt ?? (entry.type==='handoff'?handoffText(project,conversation,entry,flow,entryProvider):'')
                const targetName=entry.handoff?.name ?? entryProvider.name
                const targetUrl=entry.handoff?.url ?? entryProvider.url
                return <article key={entry.id} className={'message '+entry.type}><div className="row spread"><strong>{entry.type==='handoff'?'Bàn giao · '+targetName:entry.type==='result'?'Kết quả nhập thủ công':'Ghi chú của bạn'}</strong><time>{displayDate(entry.time)}</time></div><p>{entry.text}</p>{entry.attachment&&<button type="button" className="quiet-btn" onClick={async()=>{try{const blob=await getFile(entry.attachment!.id);if(blob) download(blob,entry.attachment!.name);else setNotice('Tệp không còn trên thiết bị này.')}catch{setNotice('Không đọc được tệp.')}}}><FileText size={16}/>{entry.attachment.name}</button>}{entry.type==='handoff'&&<div className="message-actions"><button type="button" className="quiet-btn" onClick={()=>copy(promptText)}><Copy size={15}/> Sao chép prompt</button>{targetUrl&&<a className="quiet-btn" href={targetUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Mở {targetName}</a>}<button type="button" className="quiet-btn" onClick={()=>{setReplyTo(entry);setModal('result')}}><Check size={16}/> Nhập kết quả</button></div>}</article>
              })}<div ref={endRef}/></div> : <div className="welcome">
                <div className="hero"><div className="hero-content"><img src={logo} alt=""/><div className="hero-label">KHÔNG GIAN ĐIỀU PHỐI AI</div><h1>Tập trung vào<br/><em>việc quan trọng.</em></h1><p>Thảo luận, giao việc và bàn giao giữa các AI trong cùng một dự án.</p></div></div>
                {conversation?.archived?<p className="empty">Hội thoại đã lưu trữ. Mở tùy chọn hội thoại để khôi phục.</p>:<div className="suggestions">{suggestions.map(({title,desc,icon:Icon,text,mode})=><button type="button" key={title} onClick={()=>{setMode(mode);setDraft(text);if(mode==='task')setModal('task');else draftRef.current?.focus()}}><span className="suggestion-icon"><Icon size={18}/></span><strong>{title}</strong><small>{desc}</small><ChevronRight className="suggestion-arrow" size={15}/></button>)}</div>}
              </div>}
            </div>
            {!conversation?.archived&&<div className="composer-area">
              <div className="tabs" aria-label="Chế độ WorkChat">{modes.map(({id,label,icon:Icon})=><button type="button" key={id} className={mode===id?'selected':''} aria-pressed={mode===id} onClick={()=>setMode(id)}><Icon size={16}/>{label}</button>)}</div>
              <form className="composer" onSubmit={e=>{e.preventDefault();submitDraft()}}>
                <textarea ref={draftRef} aria-label="Nội dung WorkChat" placeholder={mode==='task'?'Mô tả nhiệm vụ cần tạo…':mode==='handoff'?'Nhập mục tiêu và yêu cầu bàn giao…':'Viết ghi chú hoặc nhập @ để tham chiếu…'} value={draft} maxLength={16000} onChange={e=>{setDraft(e.target.value);setShowRefs(e.target.value.endsWith('@'))}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&(e.metaKey||e.ctrlKey)){e.preventDefault();submitDraft()}}}/>
                {showRefs&&<div className="reference-list">{tasks.slice(0,6).map(task=><button type="button" key={task.id} onClick={()=>{setDraft(d=>d+'task:'+task.id+' '+task.title+' ');setShowRefs(false);draftRef.current?.focus()}}><ClipboardList size={15}/>{task.title}</button>)}{project.repo&&<button type="button" onClick={()=>{setDraft(d=>d+'PR: '+project.repo.replace(/\/$/,'')+'/pulls ');setShowRefs(false)}}><GitPullRequest size={16}/>Danh sách Pull Request</button>}{!tasks.length&&!project.repo&&<small>Chưa có nhiệm vụ hoặc kho mã.</small>}</div>}
                {file&&<div className="file-tag"><FileText size={15}/>{file.name}<button type="button" className="icon-btn" aria-label="Bỏ tệp" onClick={()=>setFile(null)}><X size={14}/></button></div>}
                <div className="composer-toolbar"><div className="composer-options">
                  <input type="file" hidden ref={fileRef} onChange={e=>{const next=e.target.files?.[0];if(next&&next.size<=10*1024*1024)setFile(next);else if(next)setNotice('Tệp vượt giới hạn 10 MB.');e.target.value=''}}/>
                  <button type="button" className="icon-btn" aria-label="Đính kèm tệp" title="Đính kèm tệp đến 10 MB" onClick={()=>fileRef.current?.click()}><Paperclip size={19}/></button>
                  <button type="button" className="icon-btn ref-btn" aria-label="Tham chiếu nhiệm vụ" onClick={()=>setShowRefs(!showRefs)}>＠</button>
                  <span className="divider"/>
                  <div className="select-wrap"><span className="provider-mini">{provider?.initials ?? '◇'}</span><select aria-label="Nhà cung cấp AI" value={provider?.id ?? ''} onChange={e=>{setProvider(e.target.value);setModel('')}}>{available.length?available.map(item=><option key={item.id} value={item.id}>{item.name}</option>):<option value="">Chưa bật AI</option>}</select><ChevronDown size={13}/></div>
                  {Boolean(provider?.models.length)&&<div className="select-wrap"><select aria-label="Mô hình AI" value={provider?.models.includes(model)?model:''} onChange={e=>setModel(e.target.value)}><option value="">Mô hình mặc định</option>{provider?.models.map(name=><option key={name}>{name}</option>)}</select><ChevronDown size={13}/></div>}
                  <div className="select-wrap flow-select"><Workflow size={15}/><select aria-label="Chế độ điều phối" value={flow} onChange={e=>setFlow(e.target.value as Flow)}>{Object.entries(flows).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select><ChevronDown size={13}/></div>
                </div><button type="submit" className="send" title={mode==='chat'?'Lưu ghi chú':mode==='task'?'Tạo nhiệm vụ':'Tạo gói bàn giao'} aria-label={mode==='chat'?'Lưu ghi chú':mode==='task'?'Tạo nhiệm vụ':'Tạo gói bàn giao'} disabled={busy || (mode==='chat'&&!draft.trim()&&!file) || (mode==='handoff'&&(!draft.trim()||!provider))}><ArrowUp size={20}/></button></div>
              </form>
              <div className="composer-caption"><span className="status-dot"/> Bàn giao thủ công <span className="caption-divider"/> <span>Dữ liệu lưu trên thiết bị này</span></div>
            </div>}
          </main>
          <aside className={'context '+(showContext?'context-open':'')} aria-label="Ngữ cảnh dự án">
            <div className="context-heading"><h2>Ngữ cảnh dự án</h2><button type="button" className="icon-btn context-close" aria-label="Đóng ngữ cảnh" onClick={()=>setShowContext(false)}><X size={19}/></button></div>
            <section className="context-card"><div className="project-summary"><span className="project-icon"><FolderKanban size={20}/></span><div><strong>{project.name}</strong><small>Phiên bản {project.version}</small></div><button type="button" className="icon-btn" aria-label="Mở chi tiết dự án" onClick={()=>navigate('projects')}><ChevronRight size={17}/></button></div><button type="button" className="progress-link" onClick={()=>navigate('dashboard')}><span className="row spread"><span>Tiến độ {data.example&&project.id==='zenwork'?'mẫu':'dự án'}</span><strong>{stats.value===null?'—':stats.value+'%'}</strong></span><progress max="100" value={stats.value??0} aria-label="Tiến độ dự án"/><small>{stats.accepted}/{stats.total} điểm đã nghiệm thu</small></button></section>
            <section className="context-section"><div className="context-label"><h3>Luồng phối hợp</h3><span className="badge">{flows[flow]}</span></div><ol className="workflow">
              {(flow==='single'?[{icon:provider?.initials??'◇',label:provider?.name??'Chọn AI',desc:'Xử lý yêu cầu',kind:'gpt'},{icon:<Check size={14}/>,label:'Kiểm thử & duyệt',desc:'Xác minh kết quả',kind:'verify'}]:[
                {icon:'◎',label:'ChatGPT',desc:flow==='parallel'?'Phân tích sản phẩm':'Lập kế hoạch',kind:'gpt'},
                {icon:'✳',label:'Claude',desc:flow==='parallel'?'Phân tích kỹ thuật':'Xây dựng',kind:'claude'},
                {icon:'◎',label:'ChatGPT',desc:'Kiểm tra chéo',kind:'gpt'},
                {icon:'✳',label:'Claude',desc:'Sửa lỗi',kind:'claude'},
                {icon:<Check size={14}/>,label:'Kiểm thử & duyệt',desc:'Xác minh kết quả',kind:'verify'}
              ]).map((step,i)=><li key={i}><span className={'step-icon '+step.kind}>{step.icon}</span><span><strong>{step.label}</strong><small>{step.desc}</small></span></li>)}
            </ol></section>
            <section className="context-section providers"><div className="context-label"><h3>Kết nối AI</h3><button className="icon-btn" type="button" aria-label="Quản lý AI" onClick={()=>navigate('models')}><ChevronRight size={17}/></button></div>{data.providers.filter(item=>item.configured).slice(0,4).map(item=><div className="connected" key={item.id}><span className={'step-icon '+(item.id==='claude'?'claude':'gpt')}>{item.initials}</span><strong>{item.name}</strong><span className="connection-label">{item.enabled?'Thủ công':'Đã tắt'}</span></div>)}</section>
          </aside>
        </> : <main className="page">
          <div className="page-heading"><div><div className="eyebrow">{project.name} / {project.version}</div><h1>{menu.find(item=>item.id===route)?.label}</h1></div>{route==='projects'&&<button className="primary" onClick={()=>setModal('project')}><Plus size={17}/> Dự án mới</button>}{route==='models'&&<button className="primary" onClick={()=>{setEditProvider(undefined);setModal('provider')}}><Plus size={17}/> Thêm nhà cung cấp</button>}</div>
          {route==='dashboard'&&<>
            {data.example&&project.id==='zenwork'&&<p className="notice">ZenWork có sẵn nhiệm vụ mẫu để minh họa cách tính tiến độ. Bạn có thể tạo dự án mới trong mục Dự án.</p>}
            <div className="metric-grid"><section className="panel"><h2>Tiến độ có trọng số</h2><strong className="metric">{stats.value===null?'—':stats.value+'%'}</strong><progress max="100" value={stats.value??0}/><p>{stats.accepted}/{stats.total} điểm đã nghiệm thu</p></section><section className="panel"><h2>Nhiệm vụ</h2><strong className="metric">{tasks.length}</strong><p>{tasks.filter(item=>item.status==='doing').length} đang thực hiện · {tasks.filter(item=>item.status==='blocked').length} bị chặn</p><button className="quiet-btn" onClick={()=>navigate('projects')}>Xem bảng công việc <ChevronRight size={16}/></button></section><section className="panel"><h2>Hạ tầng</h2><strong className="metric metric-text">Chưa xác định</strong><p>Chưa có dữ liệu kiểm tra từ máy chủ, D1, R2, GitHub, email hoặc Runner.</p></section></div>
            <section className="panel"><div className="row spread"><h2>Mức sử dụng AI</h2><button className="quiet-btn" onClick={()=>setModal('usage')}><Plus size={16}/> Nhập số liệu</button></div><p>Hạn mức ChatGPT Plus và Claude Pro: <strong>Chưa xác định</strong>.</p>{data.usage.filter(item=>item.project===project.id).map(item=><div className="usage-row" key={item.id}><strong>{data.providers.find(p=>p.id===item.provider)?.name}</strong><span className="mono">{item.tokens.toLocaleString('vi-VN')} token</span><span className="badge">{item.source==='estimate'?'Ước lượng':'Nhập từ báo cáo'}</span><time>{displayDate(item.time)}</time></div>)}</section>
          </>}
          {route==='projects'&&<>
            <section className="panel"><div className="row spread"><div><h2>{project.name}</h2><p>{project.description || 'Chưa có mô tả.'}</p></div><button className="quiet-btn" onClick={()=>setModal('repo')}><GitBranch size={16}/> Kho mã GitHub</button></div>{project.repo&&<a className="inline-link" href={project.repo} target="_blank" rel="noreferrer">{project.repo} <ExternalLink size={14}/></a>}</section>
            <Routing key={project.id} project={project} providers={data.providers} commit={(old,next)=>{
              let applied=false
              const saved=save(d=>{
                const current=d.projects.find(p=>p.id===project.id)
                if (!current || current.run?.id!==old?.id || current.run?.history.length!==old?.history.length) {
                  setNotice('Lượt điều phối đã thay đổi. Hãy xem lại bước hiện tại.')
                  return d
                }
                applied=true
                return event({...d,projects:d.projects.map(p=>p.id===project.id?{...p,run:next}:p)},project.id,'Điều phối',next.history[next.history.length-1]||'Bắt đầu: '+next.goal)
              })
              return saved && applied
            }}/>
            <div className="row spread page-controls"><h2>Nhiệm vụ{data.example&&project.id==='zenwork'?' · Có dữ liệu mẫu':''}</h2><div className="row"><button className="quiet-btn" onClick={()=>setBoard(!board)}>{board?'Danh sách':'Kanban'}</button><button className="primary" onClick={()=>setModal('task')}><Plus size={16}/> Nhiệm vụ</button></div></div>
            {board?<div className="kanban">{Object.entries(statuses).map(([k,v])=><section key={k}><h3>{v} <span>{tasks.filter(item=>item.status===k).length}</span></h3>{tasks.filter(item=>item.status===k).map(taskCard)}</section>)}</div>:<div className="task-list">{tasks.length?tasks.map(taskCard):<p className="empty">Chưa có nhiệm vụ.</p>}</div>}
          </>}
          {route==='models'&&<><p className="notice">ZenWork lưu gói bàn giao để bạn sử dụng với công cụ chính thức. Hạn mức gói thuê bao chưa được xác minh.</p><div className="provider-grid">{data.providers.map(item=><article className="panel provider-card" key={item.id}><div className="row spread"><span className={'step-icon '+(item.id==='claude'?'claude':'gpt')}>{item.initials}</span><button type="button" className={'switch '+(item.enabled?'on':'')} role="switch" aria-checked={item.enabled} aria-label={'Bật '+item.name} disabled={!item.configured} onClick={()=>save(d=>event({...d,providers:d.providers.map(old=>old.id===item.id?{...old,enabled:!item.enabled}:old)},project.id,'Nhà cung cấp',(item.enabled?'Tắt ':'Bật ')+item.name,item.id))}><span/></button></div><h2>{item.name}</h2><p>{item.role} · {item.configured?'Read & Analyze':'Chưa cấp quyền'}</p><p><span className="badge">{!item.configured?'Chưa cấu hình':item.enabled?'Sẵn sàng bàn giao thủ công':'Đã tắt'}</span></p><button className="quiet-btn" onClick={()=>{setEditProvider(item);setModal('provider')}}>{item.configured?'Chỉnh sửa':'Thiết lập'}</button></article>)}</div></>}
          {route==='activity'&&<section className="panel"><div className="activity-filters"><label>Loại sự kiện<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Tất cả</option>{[...new Set(data.events.map(item=>item.type))].map(type=><option key={type}>{type}</option>)}</select></label><label>Nhà cung cấp<select value={providerFilter} onChange={e=>setProviderFilter(e.target.value)}><option value="">Tất cả</option>{data.providers.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Từ ngày<input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)}/></label></div><div className="timeline">{data.events.filter(item=>item.project===project.id&&(!filter||item.type===filter)&&(!providerFilter||item.provider===providerFilter)&&(!dateFilter||new Date(item.time)>=new Date(dateFilter+'T00:00:00+07:00'))).map(item=><article key={item.id}><span className="timeline-dot"/><div><strong>{item.text}</strong><p>{item.type} · {displayDate(item.time)}</p></div></article>)}{!data.events.some(item=>item.project===project.id&&(!filter||item.type===filter)&&(!providerFilter||item.provider===providerFilter)&&(!dateFilter||new Date(item.time)>=new Date(dateFilter+'T00:00:00+07:00')))&&<p className="empty">Chưa có hoạt động phù hợp.</p>}</div></section>}
          {route==='settings'&&<div className="settings-grid"><section className="panel"><h2>Giao diện & thiết bị</h2><label>Chế độ hiển thị<select value={data.theme} onChange={e=>{const theme=e.target.value as Data['theme'];save(d=>({...d,theme}))}}><option value="light">Sáng</option><option value="dark">Tối</option><option value="system">Theo thiết bị</option></select></label><p>Ngôn ngữ: Tiếng Việt</p><a className="quiet-btn" href="./ZenWork-Brand-Guide-0.1.1.pdf" download><ArrowDownToLine size={16}/> Bộ nhận diện PDF</a></section><section className="panel"><h2>Dữ liệu trên thiết bị</h2><p>Xuất dự án, hội thoại, nhiệm vụ, cấu hình AI và nhật ký ở định dạng JSON. Các tệp đính kèm được tải riêng trong WorkChat.</p><button className="quiet-btn" onClick={exportWorkspace}><ArrowDownToLine size={16}/> Xuất dữ liệu</button>{data.example&&<button className="quiet-btn" onClick={()=>setModal('reset')}>Bỏ dữ liệu mẫu</button>}</section><section className="panel"><h2>Hệ thống & phát hành</h2><p>Bản giao diện <span className="mono">0.1.2</span> · Schema cục bộ <span className="mono">1</span></p><p>Đăng nhập, đồng bộ, email, sao lưu máy chủ và phát hành Android đang chờ triển khai.</p></section></div>}
        </main>}
      </div>
    </div>
    <dialog ref={modalRef} onCancel={e=>{e.preventDefault();setModal(null)}} onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}>
      {modal&&<div className="dialog-body" key={modal}><div className="row spread"><h2>{{search:'Tìm hội thoại',task:'Tạo nhiệm vụ',project:'Tạo dự án',provider:editProvider?'Thiết lập '+editProvider.name:'Thêm nhà cung cấp',usage:'Ghi nhận token',rename:'Đổi tên hội thoại',result:'Nhập kết quả bàn giao',reset:'Bỏ dữ liệu mẫu',repo:'Kho mã GitHub',help:'Sử dụng WorkChat'}[modal]}</h2><button type="button" className="icon-btn" aria-label="Đóng" onClick={()=>setModal(null)}><X size={20}/></button></div>
        {modal==='search'?<><input autoFocus placeholder="Tìm theo tiêu đề hoặc nội dung…" aria-label="Tìm kiếm hội thoại" value={search} onChange={e=>setSearch(e.target.value)}/><div className="search-results">{data.conversations.filter(item=>[item.title,...item.entries.map(entry=>entry.text)].join(' ').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))).slice(0,30).map(item=><button key={item.id} type="button" onClick={()=>selectConversation(item)}><MessageSquare size={17}/><span>{item.title}</span><small>{data.projects.find(p=>p.id===item.project)?.name}{item.archived?' · Lưu trữ':''}</small></button>)}{!data.conversations.length&&<p>Chưa có hội thoại.</p>}</div></>:modal==='help'?<ul className="help-list"><li>Chọn <strong>Trò chuyện</strong> để lưu ghi chú dự án.</li><li>Chọn <strong>Giao việc</strong> để tạo nhiệm vụ có trọng số và tiêu chí nghiệm thu.</li><li>Chọn <strong>Bàn giao</strong>, sao chép prompt, rồi mở công cụ AI chính thức. Quay lại ZenWork để nhập kết quả.</li></ul>:<form onSubmit={onDialog}>
          {(modal==='task'||modal==='project'||modal==='provider'||modal==='rename')&&<label>{modal==='provider'?'Tên nhà cung cấp':'Tiêu đề'}<input autoFocus name="title" defaultValue={modal==='rename'?conversation?.title:modal==='provider'?editProvider?.name:modal==='task'?draft.slice(0,100):''} maxLength={100} required/></label>}
          {modal==='task'&&<><label>Tiêu chí nghiệm thu<textarea name="acceptance" maxLength={1500} required/></label><label>Phụ trách<input name="owner" defaultValue={provider?.name} maxLength={80}/></label><div className="form-columns"><label>Ưu tiên<select name="priority"><option>P0</option><option>P1</option><option>P2</option></select></label><label>Trọng số<input name="weight" type="number" min={1} max={100} defaultValue={1} required/></label></div></>}
          {modal==='project'&&<><label>Phiên bản<input name="version" defaultValue="v0.1" maxLength={30} required/></label><label>Mô tả<textarea name="description" maxLength={1000}/></label></>}
          {modal==='provider'&&<><p>Lưu cấu hình bàn giao thủ công. Mặc định Read và Analyze.</p><label>Vai trò<input name="role" defaultValue={editProvider?.configured?editProvider.role:''} maxLength={100} required/></label><label>Địa chỉ công cụ chính thức<input name="url" type="url" defaultValue={editProvider?.url} maxLength={500}/></label><label>Mô hình, phân cách bằng dấu phẩy<input name="models" defaultValue={editProvider?.models.join(', ')} maxLength={400}/></label></>}
          {modal==='result'&&<label>Kết quả, tiêu chí đã kiểm tra hoặc liên kết Pull Request<textarea autoFocus name="result" maxLength={16000} required/></label>}
          {modal==='usage'&&<><label>Nhà cung cấp<select name="provider" defaultValue={provider?.id}>{data.providers.filter(item=>item.configured).map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Token<input type="number" name="tokens" min={0} step={1} required/></label><label>Nguồn<select name="source"><option value="reported">Nhập từ báo cáo</option><option value="estimate">Ước lượng</option></select></label></>}
          {modal==='repo'&&<label>URL kho mã<input autoFocus name="repo" type="url" placeholder="https://github.com/chủ-kho/dự-án" defaultValue={project.repo} maxLength={500}/></label>}
          {modal==='reset'&&<p>Xóa hội thoại và nhiệm vụ minh họa khỏi không gian chưa có hoạt động riêng.</p>}
          <div className="dialog-actions"><button type="button" className="quiet-btn" onClick={()=>setModal(null)}>Hủy</button><button className="primary" type="submit" disabled={busy}>{modal==='reset'?'Bỏ dữ liệu mẫu':'Lưu'}</button></div>
        </form>}
      </div>}
    </dialog>
    {notice&&<div className="toast" role="status"><CheckCircle2 size={18}/>{notice}</div>}
  </div>
}
createRoot(document.getElementById('root')!).render(<App/>)
