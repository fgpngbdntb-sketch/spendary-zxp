import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

function friendlyError(error) {
  if (error.code === 'invalid_credentials') return '邮箱或密码不正确，请检查后重试。'
  if (error.code === 'email_not_confirmed') return '请先在邮箱中确认注册，再登录。'
  if (error.code === 'over_email_send_rate_limit') return '确认邮件发送已达限额，请先检查已有邮件；若已确认邮箱，请切换到登录。否则请稍后再试，不要重复注册。'
  if (error.status === 429 || error.code?.includes('rate_limit')) return '操作过于频繁，请稍后再试。'
  if (error.code === 'weak_password') return '密码不符合要求，请使用更强的密码。'
  if (error.code === 'user_already_exists') return '该邮箱已注册，请切换到登录。'
  if (error.code === 'signup_disabled') return '当前暂不开放注册。'
  if (error.code === 'email_address_invalid') return '请使用有效的邮箱地址。'
  return '暂时无法完成操作，请检查网络并稍后重试。'
}

export default function Account() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const dialog = useRef(null)
  const form = useRef(null)
  const lock = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setReady(true)
    })
    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setError('无法恢复登录状态，请重新登录。')
      setSession(data.session)
      setReady(true)
    }).catch(() => { if (active) { setReady(true); setError('无法恢复登录状态，请重新登录。') } })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  function open(nextMode) {
    setMode(nextMode); setMessage(''); setError(''); form.current?.reset()
    setIsOpen(true); dialog.current.showModal()
  }
  function switchMode(nextMode) {
    setMode(nextMode); setMessage(''); setError(''); form.current.reset()
  }
  async function submit(event) {
    event.preventDefault()
    if (lock.current) return
    setError(''); setMessage('')
    const fields = new FormData(event.currentTarget)
    const email = String(fields.get('email')).trim()
    const password = String(fields.get('password'))
    if (mode === 'signup' && password !== fields.get('confirm')) {
      setError('两次密码不一致，请重新输入。'); return
    }
    if (!email || !password) { setError('请填写邮箱和密码。'); return }
    lock.current = true; setBusy(true)
    try {
      const result = mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })
      if (result.error) { setError(friendlyError(result.error)); return }
      form.current.reset()
      if (result.data.session) {
        setSession(result.data.session)
        dialog.current.close()
        setMessage(mode === 'signup' ? '账号已创建并登录。' : '登录成功。')
      } else {
        setMessage('如该邮箱可注册，确认邮件将发送到你的邮箱。请完成邮箱确认后，返回这里登录。')
      }
    } catch { setError('网络连接失败，请稍后重试。') }
    finally { lock.current = false; setBusy(false) }
  }
  async function signOut() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError(''); setMessage('')
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) { setError(friendlyError(error)); return }
      setSession(null); setMessage('已退出登录，消费记录安全保存在你的账号中。')
    } catch { setError('退出失败，请检查网络后重试。') }
    finally { lock.current = false; setBusy(false) }
  }
  return <section className="account" aria-label="Spendary 账号">
    <div className="account-row"><div className="account-copy"><strong>{!ready ? '正在检查登录状态…' : session ? session.user.email : '你的 Spendary 账号'}</strong><p>登录后仅能访问自己的消费记录；首次登录会迁移此浏览器的旧记录。</p></div>
      <div className="account-actions">{session ? <button disabled={busy} onClick={signOut}>{busy ? '正在退出…' : '退出登录'}</button> : <><button disabled={!ready || busy} onClick={() => open('login')}>登录</button><button disabled={!ready || busy} onClick={() => open('signup')}>创建账号</button></>}</div>
    </div>
    {!isOpen && error && <p className="auth-error" role="alert">{error}</p>}
    {!isOpen && message && <p className="auth-message" role="status">{message}</p>}
    <dialog className="sheet auth-sheet" ref={dialog} aria-labelledby="auth-title" onCancel={event => { if (busy) event.preventDefault() }} onClose={() => { setIsOpen(false); form.current?.reset() }}>
      <div className="handle"/><div className="sheet-heading"><div><p className="eyebrow">YOUR LITTLE EVERYDAY DIARY</p><h2 id="auth-title">{mode === 'signup' ? '创建 Spendary 账号' : '欢迎回来'}</h2></div><button className="close" aria-label="关闭账号表单" disabled={busy} onClick={() => dialog.current.close()}>×</button></div>
      <div className="auth-tabs"><button disabled={busy} aria-pressed={mode === 'login'} onClick={() => switchMode('login')}>登录</button><button disabled={busy} aria-pressed={mode === 'signup'} onClick={() => switchMode('signup')}>创建账号</button></div>
      <form ref={form} onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy} className="auth-fields"><label htmlFor="auth-email">邮箱</label><input id="auth-email" className="note" name="email" type="email" autoComplete="email" required maxLength={254}/>
        <label htmlFor="auth-password">密码{mode === 'signup' && <small>至少 6 个字符</small>}</label><input key={mode} id="auth-password" className="note" name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 6 : undefined} required/>
        {mode === 'signup' && <><label htmlFor="auth-confirm">再次输入密码</label><input id="auth-confirm" className="note" name="confirm" type="password" autoComplete="new-password" minLength={6} required/></>}
        </fieldset>
        {error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-message" role="status">{message}</p>}
        <button className="primary save" type="submit" disabled={busy}>{busy ? '正在处理…' : mode === 'signup' ? '创建账号' : '登录'}<span>↗</span></button>
        <p className="auth-caption">{mode === 'signup' ? '注册后请先查收邮箱确认邮件，再返回登录。' : '使用创建账号时的邮箱和密码登录。'}</p>
      </form>
    </dialog>
  </section>
}
