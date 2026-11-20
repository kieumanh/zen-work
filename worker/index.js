const cookie = '__Host-zenwork_session'
const duration = 12 * 60 * 60
const encoder = new TextEncoder()
const headers = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
}

const fromHex = value => Uint8Array.from(value.match(/../g) ?? [], pair => parseInt(pair, 16))
const toHex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
const same = (a, b) => {
  if (a.length !== b.length) return false
  let difference = 0
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return difference === 0
}
const redirect = (location, session) => new Response(null, {
  status: 303,
  headers: { ...headers, Location: location, ...(session ? { 'Set-Cookie': session } : {}) }
})
const cookieValue = (value, age) => `${cookie}=${value}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Lax`
const sessionKey = env => crypto.subtle.importKey('raw', fromHex(env.ZENWORK_SESSION_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])

async function signedIn(request, env) {
  const value = request.headers.get('Cookie')?.split(/;\s*/).find(item => item.startsWith(cookie + '='))?.slice(cookie.length + 1)
  if (!value || !/^\d{10}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(value)) return false
  const [expires, nonce, signature] = value.split('.')
  const now = Math.floor(Date.now() / 1000)
  if (Number(expires) <= now || Number(expires) > now + duration) return false
  return crypto.subtle.verify('HMAC', await sessionKey(env), fromHex(signature), encoder.encode(expires + '.' + nonce))
}

async function readForm(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded') || !request.body) return null
  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let data = '', length = 0
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > 2048) { await reader.cancel(); return null }
    data += decoder.decode(value, { stream: true })
  }
  return new URLSearchParams(data + decoder.decode())
}

async function login(request, env) {
  const form = await readForm(request)
  const email = form?.get('email')?.trim().toLowerCase()
  const password = form?.get('password')
  if (!email || !password || password.length > 256 || email.length > 254) return redirect('/login?error=1')
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const hash = toHex(await crypto.subtle.deriveBits({
    name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(env.ZENWORK_PASSWORD_SALT), iterations: 100000
  }, key, 256))
  if (!same(hash, env.ZENWORK_PASSWORD_HASH) || email !== env.ZENWORK_EMAIL) return redirect('/login?error=1')
  const expires = Math.floor(Date.now() / 1000) + duration
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(16)))
  const payload = expires + '.' + nonce
  const signature = toHex(await crypto.subtle.sign('HMAC', await sessionKey(env), encoder.encode(payload)))
  return redirect('/', cookieValue(payload + '.' + signature, duration))
}

const loginAssets = new Set(['/login.css', '/login.js', '/logo.png'])
const failure = (message, status) => new Response(message, { status, headers })
function asset(path, method) {
  const file = files[path]
  if (!file) return failure('Không tìm thấy trang.', 404)
  const [type, encoded] = file
  return new Response(method === 'HEAD' ? null : Uint8Array.from(atob(encoded), char => char.charCodeAt(0)), {
    headers: { ...headers, 'Content-Type': type }
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method
    if (method === 'POST' && request.headers.get('Origin') !== url.origin) return failure('Yêu cầu không hợp lệ.', 403)
    if (method !== 'GET' && method !== 'HEAD' && method !== 'POST') return failure('Phương thức không được hỗ trợ.', 405)
    if (loginAssets.has(path) && method !== 'POST') return asset(path, method)
    if (!env.ZENWORK_EMAIL || !/^[a-f0-9]{48}$/.test(env.ZENWORK_PASSWORD_SALT ?? '') ||
        !/^[a-f0-9]{64}$/.test(env.ZENWORK_PASSWORD_HASH ?? '') || !/^[a-f0-9]{96}$/.test(env.ZENWORK_SESSION_KEY ?? '')) {
      return failure('Đăng nhập đang tạm thời gián đoạn.', 503)
    }
    if (path.startsWith('/api/coord/')) {
      if (!(await signedIn(request,env))) return failure('Cần đăng nhập lại.',401)
      const repo=path.slice('/api/coord/'.length)
      if (!/^[a-z0-9_-]+\/[a-z0-9_.-]+$/.test(repo) || repo.endsWith('/..') || repo.endsWith('/.')) return failure('Kho mã không hợp lệ.',400)
      const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}})
      if (!env.DB) return failure('Chưa gắn cơ sở dữ liệu D1.',503)
      const row=await env.DB.prepare('SELECT revision,snapshot FROM coordination WHERE repo=?').bind(repo).first()
      if (method==='GET') return json({revision:row?.revision||0,run:row?JSON.parse(row.snapshot):null})
      if (method!=='POST') return failure('Phương thức không hợp lệ.',405)
      const body=await request.json().catch(()=>null)
      if (!body || !Number.isSafeInteger(body.revision) || body.revision!==(row?.revision||0)) return failure('Dữ liệu đã thay đổi. Tải lại để đối chiếu.',409)
      if (body.action==='branch' || body.action==='pr') {
        if (env.GITHUB_REPOSITORY?.toLowerCase()!==repo || !env.GITHUB_TOKEN || !row) return failure('Chưa cấu hình quyền GitHub cho kho này.',503)
        const run=JSON.parse(row.snapshot)
        const gh=(path,options={})=>fetch('https://api.github.com/repos/'+repo+path,{...options,redirect:'error',headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,'User-Agent':'ZenWork',Accept:'application/vnd.github+json'}})
        if(body.action==='branch'){
          if(run.step!==1 || !/^[0-9a-f]{40}$/.test(run.baseline)) return failure('Cần bước xây dựng và SHA gốc đủ 40 ký tự.',400)
          const result=await gh('/git/refs',{method:'POST',body:JSON.stringify({ref:'refs/heads/'+run.branch,sha:run.baseline})})
          return result.ok?json({message:'Đã tạo nhánh '+run.branch}):failure('GitHub từ chối tạo nhánh ('+result.status+').',409)
        }
        if(!/^[1-9][0-9]{0,9}$/.test(String(body.pr))) return failure('Số PR không hợp lệ.',400)
        const result=await gh('/pulls/'+body.pr)
        if(!result.ok) return failure('Không đọc được PR.',502)
        const pr=await result.json()
        if(pr.head.ref!==run.branch || pr.head.repo?.full_name.toLowerCase()!==repo) return failure('PR không thuộc nhánh đang bàn giao.',409)
        const checks=await gh('/commits/'+pr.head.sha+'/check-runs?per_page=100')
        if(!checks.ok) return failure('Không đọc được kết quả CI.',502)
        const report=await checks.json()
        return json({message:[pr.html_url,pr.head.sha,...report.check_runs.map(c=>c.name+': '+(c.conclusion||c.status)), 'Số check: '+report.total_count].join('\n')})
      }
      const r=body.run
      if (!r || !['existing','new'].includes(r.kind) || typeof r.goal!=='string' || typeof r.baseline!=='string' || !Number.isInteger(r.step) || r.step<0 || r.step>5 || !/^feature\/zw-[a-f0-9-]{36}$/.test(r.branch) || !Array.isArray(r.history) || !r.history.every(x=>typeof x==='string') || JSON.stringify(r).length>150000) return failure('Gói điều phối không hợp lệ.',400)
      const result=row?await env.DB.prepare('UPDATE coordination SET snapshot=?,revision=revision+1 WHERE repo=? AND revision=?').bind(JSON.stringify(r),repo,body.revision).run():await env.DB.prepare('INSERT OR IGNORE INTO coordination VALUES (?,1,?)').bind(repo,JSON.stringify(r)).run()
      return result.meta.changes?json({revision:body.revision+1,run:r}):failure('Có cập nhật đồng thời. Tải lại để đối chiếu.',409)
    }
    if (method === 'POST') {
      if (path === '/login') return login(request, env)
      if (path === '/logout') return redirect('/login', cookieValue('', 0))
      return failure('Không tìm thấy trang.', 404)
    }
    const authenticated = await signedIn(request, env)
    if (path === '/login') return authenticated ? redirect('/') : asset('/login.html', method)
    if (!authenticated) return redirect('/login')
    return asset(path === '/' ? '/index.html' : path, method)
  }
}
