export type Route = 'workchat' | 'dashboard' | 'projects' | 'models' | 'activity' | 'settings'
export type Mode = 'chat' | 'task' | 'handoff'
export type Flow = 'single' | 'sequential' | 'parallel'
export type Status = 'todo' | 'doing' | 'review' | 'blocked' | 'accepted'
export type Project = { id: string; name: string; description: string; version: string; repo: string }
export type Attachment = { name: string; size: number; id: string }
export type Entry = { id: string; text: string; time: string; provider: string; model?: string; type: 'note' | 'handoff' | 'result'; attachment?: Attachment; handoff?: { prompt: string; name: string; url: string; flow: Flow }; replyTo?: string }
export type Conversation = { id: string; project: string; title: string; pinned: boolean; archived: boolean; entries: Entry[] }
export type Task = { id: string; project: string; title: string; acceptance: string; owner: string; priority: string; weight: number; status: Status }
export type Provider = { id: string; name: string; initials: string; role: string; enabled: boolean; configured: boolean; url: string; models: string[] }
export type Event = { id: string; project: string; time: string; type: string; text: string; provider?: string }
export type Usage = { id: string; provider: string; project: string; tokens: number; source: 'reported' | 'estimate'; time: string }
export type Data = { schema: 1; example: boolean; projects: Project[]; conversations: Conversation[]; tasks: Task[]; providers: Provider[]; events: Event[]; usage: Usage[]; theme: 'light' | 'dark' | 'system' }
export const key = 'zenwork.workspace.v1'
export const now = () => new Date().toISOString()
export const id = () => crypto.randomUUID()
export const statuses: Record<Status, string> = { todo: 'Chờ làm', doing: 'Đang thực hiện', review: 'Cần kiểm tra', blocked: 'Bị chặn', accepted: 'Đã nghiệm thu' }
export const flows: Record<Flow, string> = { single: 'Một AI', sequential: 'Tuần tự', parallel: 'Song song' }
export const defaults: Provider[] = [
  { id:'chatgpt', name:'ChatGPT', initials:'◎', role:'Sản phẩm & kiểm tra', enabled:true, configured:true, url:'https://chatgpt.com/', models:[] },
  { id:'claude', name:'Claude', initials:'✳', role:'Kỹ thuật', enabled:true, configured:true, url:'https://www.anthropic.com/claude-code', models:[] },
  ...[['gemini','Gemini','✦'],['grok','Grok','◈'],['deepseek','DeepSeek','◉'],['local','Local AI','⌘'],['custom','Custom AI','◇']].map(([id,name,initials])=>({id,name,initials,role:'Chưa cấu hình',enabled:false,configured:false,url:'',models:[]}))
]
const demoProject = {id:'zenwork',name:'ZenWork',description:'Không gian quản lý dự án và bàn giao giữa các AI.',version:'v1.0',repo:''}
export function initial(example = true): Data {
  return {
    schema:1, example, projects:[demoProject],
    conversations: example ? [
      {id:'planning',project:'zenwork',title:'Khởi động ZenWork',pinned:true,archived:false,entries:[]},
      {id:'identity',project:'zenwork',title:'Bộ nhận diện thương hiệu',pinned:false,archived:false,entries:[]},
      {id:'architecture',project:'zenwork',title:'Kiến trúc nền tảng',pinned:false,archived:false,entries:[]}
    ] : [],
    tasks: example ? [
      {id:'brand',project:'zenwork',title:'Định hình bộ nhận diện',acceptance:'Có logo, bảng màu, font và hướng dẫn áp dụng.',owner:'ChatGPT',priority:'P0',weight:4,status:'accepted'},
      {id:'ui',project:'zenwork',title:'Xây dựng WorkChat',acceptance:'Có thể lưu cuộc trò chuyện và bàn giao thủ công.',owner:'Claude',priority:'P0',weight:4,status:'doing'},
      {id:'qa',project:'zenwork',title:'Kiểm tra bàn giao và responsive',acceptance:'Luồng bàn giao chạy trên desktop và màn hình nhỏ.',owner:'Nhóm dự án',priority:'P1',weight:2,status:'todo'}
    ] : [],
    providers:structuredClone(defaults),events:[],usage:[],theme:'light'
  }
}
export function progress(tasks: Task[]) {
  const total = tasks.reduce((sum, task)=>sum + task.weight,0)
  const accepted = tasks.filter(task=>task.status==='accepted').reduce((sum, task)=>sum + task.weight,0)
  return { total, accepted, value: total ? Math.round(100*accepted/total) : null }
}
export function read(): Data {
  const raw = localStorage.getItem(key)
  if (!raw) return initial()
  const value = JSON.parse(raw)
  if (value.schema !== 1 || !Array.isArray(value.projects) || !value.projects.length) throw new Error('Phiên bản dữ liệu chưa được hỗ trợ.')
  return value
}
export function event(data: Data, project: string, type: string, text: string, provider?: string): Data {
  return {...data, events:[{id:id(),project,type,text,time:now(),provider},...data.events]}
}
export function handoffText(project: Project, conversation: Conversation, entry: Entry, flow: Flow, provider: Provider) {
  const entryIndex = conversation.entries.findIndex(item=>item.id===entry.id)
  const earlier = entryIndex < 0 ? conversation.entries : conversation.entries.slice(0,entryIndex)
  const context = earlier.slice(-5).map(item=>'- '+item.text).join('\n')
  return [
    '# ZenWork · '+project.name, 'Phiên bản: '+project.version, 'Cuộc trò chuyện: '+conversation.title,
    'Nhà cung cấp: '+provider.name, 'Điều phối: '+flows[flow], entry.model && 'Mô hình: '+entry.model, project.repo && 'Kho mã: '+project.repo,
    context && '\n## Bối cảnh gần đây\n'+context, '\n## Yêu cầu\n'+entry.text,
    entry.attachment && '\nTệp đính kèm cần chuyển riêng: '+entry.attachment.name,
    '\n## Kết quả cần trả\nTóm tắt thay đổi, tiêu chí đã kiểm tra, lỗi còn lại và liên kết Pull Request nếu có.'
  ].filter(Boolean).join('\n')
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function filesDb(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request = indexedDB.open('zenwork-files',1)
    request.onupgradeneeded = ()=>request.result.createObjectStore('files')
    request.onsuccess = ()=>resolve(request.result)
    request.onerror = ()=>reject(request.error)
  })
}
async function fileOperation<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore)=>IDBRequest<T>): Promise<T> {
  const db = await filesDb()
  try {
    return await new Promise((resolve,reject)=>{
      const transaction = db.transaction('files',mode)
      const request = run(transaction.objectStore('files'))
      transaction.oncomplete = ()=>resolve(request.result)
      transaction.onabort = ()=>reject(transaction.error)
      transaction.onerror = ()=>reject(transaction.error)
    })
  } finally { db.close() }
}
export const putFile = (id: string,file: File) => fileOperation('readwrite',store=>store.put(file,id))
export const getFile = (id: string) => fileOperation<Blob | undefined>('readonly',store=>store.get(id))
