const input = document.getElementById('password')
const toggle = document.getElementById('toggle')
toggle.addEventListener('click', () => {
  const visible = input.type === 'password'
  input.type = visible ? 'text' : 'password'
  toggle.textContent = visible ? 'Ẩn' : 'Hiện'
  toggle.setAttribute('aria-pressed', String(visible))
})
if (new URLSearchParams(location.search).has('error')) {
  document.getElementById('login-error').hidden = false
}
