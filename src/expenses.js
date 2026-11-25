import { supabase } from './supabase'
const LEGACY = 'spendary.expenses.v1'
const JOURNAL = 'spendary.expenses.migration.v1'
const fields = 'id,user_id,cents,category,note,occurred_at,created_at'
const flights = new Map()
const valid = i => i && typeof i.id === 'string' && Number.isSafeInteger(i.cents) && i.cents > 0 && i.cents <= 9999999900 && ['Food','Transport','Shopping'].includes(i.cat) && typeof i.note === 'string' && i.note.length <= 80 && typeof i.time === 'string'
export const toItem = row => ({ id: row.id, cents: Number(row.cents), cat: row.category, note: row.note, time: new Date(row.occurred_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) })
async function assertUser(userId) {
 const { data, error } = await supabase.auth.getSession()
 if (error || data.session?.user.id !== userId) throw new Error('登录状态已变化，请重新登录。')
}
async function legacyId(userId, id) {
 const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${LEGACY}:${userId}:${id}`)))
 bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128
 const hex = [...bytes.slice(0,16)].map(b => b.toString(16).padStart(2,'0')).join('')
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}
async function migrate(userId) {
 const raw = localStorage.getItem(LEGACY)
 let job = JSON.parse(localStorage.getItem(JOURNAL) || 'null')
 if (raw === null && !job) return
 if (job && job.userId !== userId) throw new Error('此浏览器有属于另一个账号的待迁移记录，请用原账号完成迁移。')
 if (!job) {
  const old = JSON.parse(raw)
  if (!Array.isArray(old) || !old.every(valid) || new Set(old.map(i=>i.id)).size !== old.length) throw new Error('本地记录格式有误，副本已保留，请勿清除浏览器数据。')
  // Bind the source to the first signed-in owner before any network write.
  job = { userId, raw, rows: [] }
  for (const item of old) {
   const at = new Date(); const match = /^(\d{2}):(\d{2})$/.exec(item.time)
   if (!match || +match[1]>23 || +match[2]>59) throw new Error('本地记录时间无效，副本已保留。')
   at.setHours(+match[1],+match[2],0,0)
   job.rows.push({id:await legacyId(userId,item.id),user_id:userId,cents:item.cents,category:item.cat,note:item.note,occurred_at:at.toISOString()})
  }
  localStorage.setItem(JOURNAL,JSON.stringify(job))
 }
 if (raw !== null && raw !== job.raw) throw new Error('本地记录已变化，迁移已暂停，浏览器副本仍保留。')
 await assertUser(userId)
 // Stable IDs and SELECT-before-INSERT allow retries without UPDATE grants.
 for (const row of job.rows) {
  const {data:existing,error:readError}=await supabase.from('expenses').select(fields).eq('user_id',userId).eq('id',row.id).maybeSingle()
  if(readError) throw readError
  if(!existing){
   await assertUser(userId)
   const {error}=await supabase.from('expenses').insert(row)
   if(error && error.code!=='23505') throw error
  }
  const {data:saved,error}=await supabase.from('expenses').select(fields).eq('user_id',userId).eq('id',row.id).single()
  if(error || !saved || Number(saved.cents)!==row.cents || saved.category!==row.category || saved.note!==row.note || new Date(saved.occurred_at).getTime()!==new Date(row.occurred_at).getTime()) throw new Error('云端记录核对失败，本地副本已保留。')
 }
 await assertUser(userId)
 if(localStorage.getItem(LEGACY)!==null && localStorage.getItem(LEGACY)!==job.raw) throw new Error('本地副本已变化，暂未删除。')
 localStorage.removeItem(LEGACY)
 localStorage.removeItem(JOURNAL)
}
export function migrateExpenses(userId) {
 if(!flights.has(userId)) flights.set(userId,migrate(userId).finally(()=>flights.delete(userId)))
 return flights.get(userId)
}
export async function readExpenses(userId) {
 await assertUser(userId)
 const all=[]
 for(let offset=0;;offset+=500){
  const {data,error}=await supabase.from('expenses').select(fields).eq('user_id',userId).order('occurred_at').order('id').range(offset,offset+499)
  if(error) throw error
  all.push(...data)
  if(data.length<500) return all.map(toItem)
 }
}
export async function addExpense(userId,item){
 await assertUser(userId)
 const {data,error}=await supabase.from('expenses').insert({id:item.id,user_id:userId,cents:item.cents,category:item.cat,note:item.note}).select(fields).single()
 if(error) throw error
 return toItem(data)
}
export async function deleteExpense(userId,id){
 await assertUser(userId)
 const {data,error}=await supabase.from('expenses').delete().eq('user_id',userId).eq('id',id).select('id')
 if(error) throw error
 if(data.length!==1) throw new Error('记录已变化，请重新加载后重试。')
}
