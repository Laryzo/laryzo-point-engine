import { createClient } from '@supabase/supabase-js'

const required = ['TEST_MODE', 'ALLOW_DESTRUCTIVE_TESTS', 'TEST_CONFIRMATION', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_TEST_PROJECT_REF']
for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}`)
if (process.env.TEST_MODE !== 'true' || process.env.ALLOW_DESTRUCTIVE_TESTS !== 'true' || process.env.TEST_CONFIRMATION !== 'I_UNDERSTAND_TEST_DATABASE_ONLY') throw new Error('Safety guard rejected reset')
const url = process.env.SUPABASE_URL
const ref = process.env.SUPABASE_TEST_PROJECT_REF
const local = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(url)
if (!local && (!url.includes(ref) || ref === 'jkqtqxwtyqrlhblnaohz')) throw new Error('Safety guard rejected non-test URL')
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)
const prefix = process.env.TEST_FIXTURE_PREFIX || 'rt_'
const { data: customers, error: customerError } = await db.from('customers').select('id').like('name', `${prefix}%`)
if (customerError) throw customerError
const ids = (customers || []).map(x => x.id)
if (ids.length) {
  for (const column of ['to_customer', 'from_customer']) {
    const { error } = await db.from('point_history').delete().in(column, ids)
    if (error) throw error
  }
}
const { error: txError } = await db.from('transactions').delete().like('product_code', `${prefix}%`)
if (txError) throw txError
if (ids.length) {
  const { error } = await db.from('customers').delete().in('id', ids)
  if (error) throw error
}
console.log(JSON.stringify({ status: 'PASS', deleted_customers: ids.length, fixture_prefix: prefix }))
