// Shared auth helpers for edge functions.
// verify_jwt is intentionally false in Lovable-managed configs; we verify JWTs
// in code with supabase.auth.getUser() using the anon client.
import { createClient } from 'npm:@supabase/supabase-js@2'

export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

export function anonClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )
}

// Returns { user } if the Authorization header contains a valid JWT for a real
// user, or null otherwise. Service-role tokens are treated as unauthenticated
// user requests (use isServiceRole for that check).
export async function getAuthUser(req: Request): Promise<null | { id: string; email: string | null }> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) return null
  try {
    const { data, error } = await anonClient().auth.getUser(token)
    if (error || !data?.user) return null
    return { id: data.user.id, email: data.user.email ?? null }
  } catch (_e) {
    return null
  }
}

// Decode a JWT payload without verification. Only use for cheap role sniffing
// (service-role detection); never trust the payload for authorization.
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    // base64url -> base64
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=')
    return JSON.parse(atob(b64))
  } catch {
    return null
  }
}

export function isServiceRole(req: Request): boolean {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.slice('Bearer '.length).trim()
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (service && token === service) return true
  const claims = decodeJwtPayload(token)
  return claims?.role === 'service_role'
}

// Look up an admin row for the authenticated user by email. Returns null if
// the caller is not authenticated as an admin.
export async function requireAdmin(req: Request): Promise<null | { email: string; role: string }> {
  const user = await getAuthUser(req)
  if (!user?.email) return null
  const svc = serviceClient()
  const { data } = await svc
    .from('admins')
    .select('email, role')
    .eq('email', user.email.toLowerCase().trim())
    .maybeSingle()
  return data ? { email: data.email, role: data.role } : null
}

export async function requireSuperAdmin(req: Request): Promise<null | { email: string; role: string }> {
  const admin = await requireAdmin(req)
  if (!admin || admin.role !== 'super_admin') return null
  return admin
}

// Resolve the customer_id for the authenticated user via customer_auth by email.
export async function requireCustomer(req: Request): Promise<null | { customer_id: string; email: string }> {
  const user = await getAuthUser(req)
  if (!user?.email) return null
  const svc = serviceClient()
  const { data } = await svc
    .from('customer_auth')
    .select('customer_id, email')
    .eq('email', user.email.toLowerCase().trim())
    .maybeSingle()
  return data ? { customer_id: data.customer_id, email: data.email } : null
}
