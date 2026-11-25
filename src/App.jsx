import { useEffect, useRef, useState } from 'react'
import './App.css'
import Account from './Account'
import { supabase } from './supabase'
import { migrateExpenses, readExpenses, addExpense, deleteExpense } from './expenses'
const cats=[['Food','#ba654c','◒'],['Transport','#7c9277','↗'],['Shopping','#bd944d','◇']]
const money=n=>new Intl.NumberFormat('zh-CN',{style:'currency',currency:'CNY'}).format(n/100)
function ExpenseDiary({userId}){
 const [items,setItems]=useState([]),[selected,select]=useState(null),[cat,setCat]=useState(''),[error,setError]=useState('');const sheet=useRef(null),amount=useRef(null)
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[cloudError,setCloudError]=useState(''),[retry,setRetry]=useState(0)
 const lock=useRef(false)
 useEffect(()=>{
  let active=true
  async function load(){
   try{await migrateExpenses(userId);const rows=await readExpenses(userId);if(active)setItems(rows)}
   catch(error){if(active)setCloudError(error.message?.includes('本地')||error.message?.includes('迁移')?error.message:'云端读取或迁移失败，本地副本不会被提前删除。请检查网络后重试。')}
   finally{if(active)setLoading(false)}
  }
  load();return()=>{active=false}
 },[userId,retry])
 async function remove(id){
  if(lock.current)return
  lock.current=true;setBusy(true);setCloudError('')
  try{await deleteExpense(userId,id);setItems(list=>list.filter(x=>x.id!==id));if(selected===id)select(null)}
  catch{setCloudError('删除失败，记录尚未从页面移除。请检查网络后重试。')}
  finally{lock.current=false;setBusy(false)}
 }
 const [today]=useState(()=>new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'}))
 const total=items.reduce((s,i)=>s+i.cents,0),detail=items.find(i=>i.id===selected)
 function open(){if(loading||busy||cloudError)return;setCat('');setError('');sheet.current.showModal();amount.current.focus()}
 async function save(e){
  e.preventDefault();if(lock.current)return
  const form=e.currentTarget,data=new FormData(form),value=String(data.get('amount')).trim()
  if(!/^\d+(\.\d{1,2})?$/.test(value)||Number(value)<=0||Number(value)>99999999){setError('请输入大于 0 的金额，最多两位小数。');return}
  if(!cat){setError('请选择一个分类。');return}
  lock.current=true;setBusy(true);setError('')
  const item={id:crypto.randomUUID(),cents:Math.round(Number(value)*100),cat,note:String(data.get('note')).trim()}
  try{const saved=await addExpense(userId,item);setItems(list=>[...list,saved]);select(saved.id);form.reset();sheet.current.close()}
  catch{setError('云端保存失败，请检查网络后重试。')}
  finally{lock.current=false;setBusy(false)}
 }

 return <main className="app"><header><a href="#" className="brand"><span>●</span> Spendary<i>.</i></a><span className="edition">A LITTLE EVERYDAY DIARY</span></header><Account/>{loading&&<p className="auth-message" role="status">正在读取并迁移你的消费记录…</p>}{cloudError&&<div role="alert" className="auth-error">{cloudError}<button className="text-button" onClick={()=>{setLoading(true);setCloudError('');setRetry(n=>n+1)}}>重新加载</button></div>}<section className="intro"><div><p className="eyebrow">TODAY, IN LITTLE DOTS</p><h1>把日常，记成一张地图。</h1><p className="muted">每一笔消费，都是生活留下的小小圆点。</p></div><p className="date">今天<br/><strong>{today}</strong></p></section>{!loading&&<div className="dashboard"><section className="map card"><div className="heading"><h2>今日消费地图</h2><span className="pill">{items.length} 颗圆点</span></div><div className="dot-map">{items.length?items.map(i=>{const c=cats.find(c=>c[0]===i.cat);return <button key={i.id} className={'dot '+(selected===i.id?'chosen':'')} style={{'--color':c[1],width:Math.min(100,42+Math.sqrt(i.cents/100)*5),height:Math.min(100,42+Math.sqrt(i.cents/100)*5)}} aria-label={`${i.cat} ${money(i.cents)} ${i.note}`} aria-pressed={selected===i.id} onClick={()=>select(i.id)}>{c[2]}</button>}):<div className="empty"><div className="orbit" aria-hidden="true"><span>＋</span></div><h3>今天的地图，等你落下第一颗点</h3><p>从一杯咖啡、一次出发开始。</p><button className="text-button" onClick={open}>记下第一笔 ↗</button></div>}</div>{detail&&<div className="detail" aria-live="polite"><span>{detail.cat} · {detail.note||'日常的一笔'}</span><strong>{money(detail.cents)}</strong></div>}<div className="map-footer"><div className="legend">{cats.map(c=><span key={c[0]}><i style={{background:c[1]}}/>{c[0]}</span>)}</div><p>颜色记分类 · 大小记金额</p></div></section><aside><section className="total-card"><p className="eyebrow">TODAY’S SPENDING</p><p className="total-label">今日消费</p><div className="total" aria-live="polite">{money(total)}</div><div className="total-foot"><span>{items.length} 笔日常记录</span><span aria-hidden="true">✳</span></div></section><section className="journal card"><div className="heading"><h2>今日小记</h2><span className="muted">{String(items.length).padStart(2,'0')}</span></div>{!items.length?<div className="empty-list"><span aria-hidden="true">≋</span><p>还没有消费记录</p><small>不必记住所有，让圆点帮你记。</small></div>:<ul>{[...items].reverse().map(i=><li key={i.id} className={selected===i.id?'active':''}><button className="entry" onClick={()=>select(i.id)}><span className="entry-icon" style={{color:cats.find(c=>c[0]===i.cat)[1]}}>{cats.find(c=>c[0]===i.cat)[2]}</span><span className="entry-copy"><strong>{i.note||i.cat}</strong><small>{i.cat} · {i.time}</small></span><strong>{money(i.cents)}</strong></button><button className="delete" aria-label={`删除 ${i.note||i.cat} ${money(i.cents)}`} disabled={busy||loading} onClick={()=>remove(i.id)}>×</button></li>)}</ul>}</section></aside></div>}<footer><span>小小消费，也有生活的形状。</span><span>保存在你的账号中 · 仅本人可见</span></footer><div className="add-bar"><button className="primary add" disabled={loading||busy||!!cloudError} onClick={open}>＋ 添加消费</button></div><dialog ref={sheet} className="sheet" aria-labelledby="form-title" onClick={e=>{if(e.target===sheet.current)sheet.current.close()}}><div className="handle"/><div className="sheet-heading"><div><p className="eyebrow">ONE MORE LITTLE DOT</p><h2 id="form-title">记下一笔日常</h2></div><button className="close" aria-label="关闭添加表单" onClick={()=>sheet.current.close()}>×</button></div><form onSubmit={save} noValidate aria-busy={busy}><fieldset disabled={busy}><label htmlFor="amount">消费金额</label><div className="amount"><span>¥</span><input ref={amount} id="amount" name="amount" inputMode="decimal" placeholder="0.00" autoComplete="off" aria-describedby={error?'form-error':undefined}/></div><fieldset><legend>选择分类</legend><div className="categories">{cats.map(c=><button type="button" key={c[0]} className={cat===c[0]?'category selected':'category'} style={{'--color':c[1]}} aria-pressed={cat===c[0]} onClick={()=>{setCat(c[0]);setError('')}}><span>{c[2]}</span>{c[0]}</button>)}</div></fieldset><label htmlFor="note">备注 <small>选填</small></label><input className="note" name="note" id="note" maxLength={80} placeholder="这颗圆点，关于什么？"/>{error&&<p id="form-error" className="error" role="alert">{error}</p>}<button type="submit" className="primary save">保存，添一颗圆点 <span>↗</span></button></fieldset></form></dialog></main>
}

export default function App(){
 const [auth,setAuth]=useState({ready:false,userId:null})
 useEffect(()=>{
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setAuth({ready:true,userId:session?.user.id||null}))
  return()=>subscription.unsubscribe()
 },[])
 if(!auth.userId)return <main className="app"><header><a className="brand" href="#">● Spendary.</a></header><Account/><section className="intro"><h1>把日常，记成一张地图。</h1><p className="muted">{auth.ready?'登录后查看、添加和管理你的消费记录。':'正在检查登录状态…'}</p></section></main>
 return <ExpenseDiary key={auth.userId} userId={auth.userId}/>
}
