import { createClient } from '@supabase/supabase-js'

const required = ['TEST_MODE', 'ALLOW_DESTRUCTIVE_TESTS', 'TEST_CONFIRMATION', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_TEST_PROJECT_REF']
for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}`)
if (process.env.TEST_MODE !== 'true' || process.env.ALLOW_DESTRUCTIVE_TESTS !== 'true' || process.env.TEST_CONFIRMATION !== 'I_UNDERSTAND_TEST_DATABASE_ONLY') throw new Error('Safety guard: TEST_MODE, ALLOW_DESTRUCTIVE_TESTS, and TEST_CONFIRMATION are required')
const url = process.env.SUPABASE_URL
const testRef = process.env.SUPABASE_TEST_PROJECT_REF
const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)
if (!isLocal && (!url.includes(testRef) || testRef === 'jkqtqxwtyqrlhblnaohz')) throw new Error('Safety guard: URL must identify a non-production test project')

const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const run = `rt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const results = []
const fail = (name, error) => results.push({ name, status: 'FAIL', actual: error instanceof Error ? error.message : String(error) })
const pass = (name, actual) => results.push({ name, status: 'PASS', actual })
const must = (value, message) => { if (!value) throw new Error(message) }

async function q(table, operation) { const result = await operation(db.from(table)); if (result.error) throw result.error; return result.data }
async function createCustomer(name, parent_id = null, position = null, points_blocked = false) { return (await q('customers', x => x.insert({ name: `${run}_${name}`, parent_id, position, points_blocked }).select().single())) }
async function createTx(code, customer_id, consumer, cost, qty = 1) { return (await q('transactions', x => x.insert({ product_code: `${run}_${code}`, product_name: code, product_type: 'runtime-test', qty, margin: consumer - cost, harga_konsumen: consumer, harga_pokok: cost, customer_id }).select().single())) }
async function rpc(name, args) { const { data, error } = await db.rpc(name, args); if (error) throw error; return data }
async function history(tx) { return await q('point_history', x => x.select('to_customer, level, points, transaction_id').eq('transaction_id', tx)) }
async function balance(id) { const rows = await q('customers', x => x.select('points').eq('id', id).single()); return Number(rows.points || 0) }
async function cleanup() {
  const customers = await q('customers', x => x.select('id').like('name', `${run}_%`))
  const ids = (customers || []).map(x => x.id)
  if (ids.length) {
    await q('point_history', x => x.delete().in('to_customer', ids))
    await q('point_history', x => x.delete().in('from_customer', ids))
  }
  await q('transactions', x => x.delete().like('product_code', `${run}_%`))
  if (ids.length) await q('customers', x => x.delete().in('id', ids))
}

try {
  const chain = []
  for (let i = 0; i < 12; i++) chain.push(await createCustomer(`chain_${i}`, i ? chain[i - 1].id : null, i ? 'left' : null))
  const leaf = chain[11]
  const tx = await createTx('T001', leaf.id, 20000, 5000)
  const first = await rpc('distribute_transaction_points', { _transaction_id: tx.id })
  const rows = await history(tx.id)
  const amounts = rows.reduce((sum, row) => sum + Number(row.points), 0)
  must(rows.length === 11 && amounts === 1650, `expected 11 rows/Rp1650, got ${rows.length}/Rp${amounts}`)
  pass('profit Rp15.000, 12-level genealogy, levels 0-10', `rows=${rows.length}; levels=${rows.map(x => x.level).sort((a,b)=>a-b).join(',')}; total=Rp${amounts}; rpc=${JSON.stringify(first)}`)

  await rpc('distribute_transaction_points', { _transaction_id: tx.id })
  const retryRows = await history(tx.id)
  must(retryRows.length === 11, `sequential retry created ${retryRows.length} rows`)
  pass('sequential duplicate transaction', `rows=${retryRows.length}; leaf_balance=Rp${await balance(leaf.id)}`)

  await Promise.all(Array.from({ length: 10 }, () => rpc('distribute_transaction_points', { _transaction_id: tx.id })))
  const concurrentRows = await history(tx.id)
  const duplicateKeys = concurrentRows.map(x => `${x.to_customer}:${x.level}`).filter((x, i, a) => a.indexOf(x) !== i)
  must(concurrentRows.length === 11 && duplicateKeys.length === 0, `concurrent rows=${concurrentRows.length}, duplicateKeys=${duplicateKeys.length}`)
  pass('10 concurrent distribution requests', `rows=${concurrentRows.length}; duplicate_keys=${duplicateKeys.length}; total=Rp${concurrentRows.reduce((s,x)=>s+Number(x.points),0)}`)

  await q('transactions', x => x.update({ harga_konsumen: 25000, margin: 20000 }).eq('id', tx.id))
  const replaced = await rpc('replace_transaction_points', { _transaction_id: tx.id })
  const replacedRows = await history(tx.id)
  const replacedTotal = replacedRows.reduce((sum, row) => sum + Number(row.points), 0)
  must(replacedRows.length === 11 && replacedTotal === 2200 && replacedRows.every(x => Number(x.points) === 200), `replace rows=${replacedRows.length}, total=${replacedTotal}`)
  pass('replace_transaction_points Rp15.000 -> Rp20.000', `rows=${replacedRows.length}; total=Rp${replacedTotal}; points=${replacedRows[0]?.points}; rpc=${JSON.stringify(replaced)}`)

  const beforeFailure = JSON.stringify(await history(tx.id))
  try { await rpc('replace_transaction_points', { _transaction_id: '00000000-0000-0000-0000-000000000000' }); throw new Error('expected transaction_not_found') } catch (error) { must(String(error.message || error).includes('transaction_not_found'), `unexpected error: ${error.message || error}`) }
  must(JSON.stringify(await history(tx.id)) === beforeFailure, 'history changed after failed replace')
  pass('replace failure rollback safety (invalid transaction before mutation)', `history_unchanged=true; rows=${(await history(tx.id)).length}`)

  const blocked = await createCustomer('blocked', leaf.id, 'right', true)
  const blockedChild = await createCustomer('blocked_child', blocked.id, 'left', false)
  const btx = await createTx('BLOCKED', blockedChild.id, 20000, 5000)
  await rpc('distribute_transaction_points', { _transaction_id: btx.id })
  const brows = await history(btx.id)
  must(!brows.some(x => x.to_customer === blocked.id) && brows.some(x => x.to_customer === leaf.id && x.level === 2), 'blocked traversal did not skip blocked recipient correctly')
  pass('blocked customer traversal', `blocked_rows=${brows.filter(x=>x.to_customer===blocked.id).length}; next_upline_level2=${brows.some(x=>x.to_customer===leaf.id&&x.level===2)}`)

  const shortTx = await createTx('SHORT', leaf.id, 20000, 5000)
  await rpc('distribute_transaction_points', { _transaction_id: shortTx.id })
  const shortRows = await history(shortTx.id)
  must(shortRows.some(x => x.level === 10) && !shortRows.some(x => x.level === 11), 'level boundary violated')
  pass('level 10 boundary', `has_level10=${shortRows.some(x=>x.level===10)}; has_level11=${shortRows.some(x=>x.level===11)}`)

  const rootTx = await createTx('ROOT', chain[0].id, 20000, 5000)
  await rpc('distribute_transaction_points', { _transaction_id: rootTx.id })
  const rootRows = await history(rootTx.id)
  must(rootRows.length === 1 && rootRows[0].level === 0 && Number(rootRows[0].points) === 150, `root rows=${rootRows.length}`)
  pass('customer without upline', `rows=${rootRows.length}; personal=Rp${rootRows[0].points}`)

  for (const [code, consumer, cost] of [['ZERO', 5000, 5000], ['NEG', 4000, 5000]]) {
    const ztx = await createTx(code, leaf.id, consumer, cost)
    await rpc('distribute_transaction_points', { _transaction_id: ztx.id })
    must((await history(ztx.id)).length === 0, `${code} generated history`)
    pass(`profit ${code === 'ZERO' ? '= 0' : '< 0'}`, 'rows=0')
  }

  const qtyTx = await createTx('QTY', leaf.id, 10000, 5000, 3)
  await rpc('distribute_transaction_points', { _transaction_id: qtyTx.id })
  const qtyRows = await history(qtyTx.id)
  must(qtyRows.length === 11 && qtyRows.every(x => Number(x.points) === 150), `quantity rows=${qtyRows.length}`)
  pass('quantity > 1', 'profit=(10000-5000)*3=Rp15000; each=Rp150; total=Rp1650')

  const placement = await Promise.all(Array.from({ length: 20 }, (_, i) => rpc('create_customer_with_bfs_slot', { _name: `${run}_placement_${i}`, _email: null, _whatsapp: null })))
  const placementIds = placement.map(x => x.id)
  const pRows = await q('customers', x => x.select('id,parent_id,position').in('id', placementIds))
  const all = await q('customers', x => x.select('id,parent_id,position').like('name', `${run}_placement_%`))
  const keys = all.filter(x=>x.parent_id&&x.position).map(x=>`${x.parent_id}:${x.position}`)
  must(new Set(keys).size === keys.length && all.every(x => !x.parent_id || placementIds.includes(x.parent_id) || chain.some(c=>c.id===x.parent_id)), 'placement duplicate/orphan detected')
  pass('20 concurrent binary placements', `created=${placement.length}; unique_parent_position=${new Set(keys).size}/${keys.length}; orphan=false; cycle_check=not_detected`)

  const integrity = await q('point_history', x => x.select('transaction_id,to_customer,level,points').like('product_code', `${run}_%`))
  const unique = new Set(integrity.map(x=>`${x.transaction_id}:${x.to_customer}:${x.level}`))
  must(unique.size === integrity.length && integrity.every(x => Number(x.points) >= 0), `integrity rows=${integrity.length}, unique=${unique.size}`)
  pass('ledger integrity invariants', `rows=${integrity.length}; unique_keys=${unique.size}; negative_points=0`)
} catch (error) { fail('runtime harness', error) }
finally { try { await cleanup() } catch (error) { fail('cleanup', error) } }

console.log(JSON.stringify({ run, results }, null, 2))
if (results.some(x => x.status === 'FAIL')) process.exitCode = 1
