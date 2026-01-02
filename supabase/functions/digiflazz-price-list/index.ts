import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const username = Deno.env.get('DIGIFLAZZ_USERNAME')
    const apiKey = Deno.env.get('DIGIFLAZZ_API_KEY')

    if (!username || !apiKey) {
      console.error('Digiflazz credentials not configured')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Digiflazz credentials not configured. Please add DIGIFLAZZ_USERNAME and DIGIFLAZZ_API_KEY secrets.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { cmd = 'prepaid' } = await req.json().catch(() => ({}))

    // Create MD5 signature
    const encoder = new TextEncoder()
    const data = encoder.encode(username + apiKey + 'pricelist')
    const hashBuffer = await crypto.subtle.digest('MD5', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const sign = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

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
