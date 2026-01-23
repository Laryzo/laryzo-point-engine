import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts"
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts"

// CORS configuration - restrict to trusted origins
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://jkqtqxwtyqrlhblnaohz.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')
  )
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  }
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  return ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')
  )
}

interface DigiflazzPriceItem {
  product_name: string
  category: string
  brand: string
  type: string
  seller_name: string
  price: number
  buyer_sku_code: string
  buyer_product_status: boolean
  seller_product_status: boolean
  unlimited_stock: boolean
  stock: number
  multi: boolean
  start_cut_off: string
  end_cut_off: string
  desc: string
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Validate origin for non-preflight requests
  if (!isOriginAllowed(origin)) {
    console.warn('Blocked digiflazz-price-list request from unauthorized origin:', origin)
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Get credentials from environment or system_settings
    let username = Deno.env.get('DIGIFLAZZ_USERNAME')
    let apiKey = Deno.env.get('DIGIFLAZZ_API_KEY')

    // If not in env, try to get from system_settings
    if (!username || !apiKey) {
      const { data: settings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['digiflazz_username', 'digiflazz_api_key'])

      const settingsMap = (settings || []).reduce((acc: Record<string, string>, s: any) => {
        acc[s.key] = s.value
        return acc
      }, {})

      username = username || settingsMap.digiflazz_username
      apiKey = apiKey || settingsMap.digiflazz_api_key
    }

    if (!username || !apiKey) {
      console.error('Digiflazz credentials not configured')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Kredensial Digiflazz belum dikonfigurasi. Silakan isi di menu Pengaturan Sistem.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { cmd = 'prepaid' } = await req.json().catch(() => ({}))

    // Create MD5 signature using Deno std library
    const encoder = new TextEncoder()
    const data = encoder.encode(username + apiKey + 'pricelist')
    const hashBuffer = await crypto.subtle.digest('MD5', data)
    const sign = encodeHex(new Uint8Array(hashBuffer))

    console.log(`Fetching ${cmd} price list from Digiflazz...`)

    const response = await fetch('https://api.digiflazz.com/v1/price-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cmd: cmd === 'pasca' ? 'pasca' : 'prepaid',
        username,
        sign
      })
    })

    const result = await response.json()

    if (result.data?.rc && result.data.rc !== '00') {
      console.error('Digiflazz API error:', result.data.message)
      return new Response(
        JSON.stringify({ success: false, error: result.data.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const products: DigiflazzPriceItem[] = result.data || []
    console.log(`Retrieved ${products.length} products from Digiflazz`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: products,
        count: products.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fetching price list:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
