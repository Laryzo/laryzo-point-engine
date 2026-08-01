import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

// For external API integrations, we use API key authentication instead of CORS origin validation
// This allows authorized external systems to call this API from any origin
// Security is enforced via x-api-key header validation against database-stored keys
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Validation schemas with strict rules
const CustomerDataSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-\.]+$/, 'Name contains invalid characters'),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  whatsapp: z.string()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  parent_id: z.string()
    .uuid('Invalid parent ID format')
    .optional()
    .or(z.literal('')),
  position: z.enum(['left', 'right'])
    .optional(),
})

const TransactionDataSchema = z.object({
  product_code: z.string()
    .min(1, 'Product code is required')
    .max(50, 'Product code must be less than 50 characters')
    .regex(/^[A-Za-z0-9_\-]+$/, 'Product code contains invalid characters'),
  product_name: z.string()
    .min(1, 'Product name is required')
    .max(255, 'Product name must be less than 255 characters'),
  product_type: z.enum(['ppob', 'physical', 'service'], {
    errorMap: () => ({ message: 'Product type must be ppob, physical, or service' })
  }),
  qty: z.number()
    .int('Quantity must be an integer')
    .positive('Quantity must be positive')
    .max(1000, 'Quantity exceeds maximum allowed (1000)'),
  margin: z.number()
    .nonnegative('Margin cannot be negative')
    .max(10000000, 'Margin exceeds maximum allowed (10,000,000)'),
})

const RequestSchema = z.object({
  customer_data: CustomerDataSchema,
  transaction_data: TransactionDataSchema,
})

type ValidatedRequest = z.infer<typeof RequestSchema>

async function validateApiKey(supabase: ReturnType<typeof createClient>, request: Request): Promise<{ valid: boolean; keyId?: string }> {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) return { valid: false }
  
  // Query database for active keys
  const { data: keys, error } = await supabase
    .from('satellite_api_keys')
    .select('id, key_hash, expires_at')
    .eq('is_active', true)
  
  if (error || !keys || keys.length === 0) {
    console.log('No active API keys found or error:', error)
    return { valid: false }
  }
  
  // Check each key (hash comparison)
  for (const keyRecord of keys) {
    // Check expiration
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      continue
    }
    
    try {
      const isMatch = await bcrypt.compare(apiKey, keyRecord.key_hash)
      if (isMatch) {
        // Update usage stats
        await supabase
          .from('satellite_api_keys')
          .update({ 
            last_used_at: new Date().toISOString(),
            request_count: supabase.rpc ? undefined : 1
          })
          .eq('id', keyRecord.id)
        
        // Increment request count
        await supabase.rpc('increment_satellite_key_count', { key_id: keyRecord.id }).catch(() => {
          console.log('RPC increment not available, skipping count update')
        })
        
        return { valid: true, keyId: keyRecord.id }
      }
    } catch (e) {
      console.error('Error comparing key:', e)
    }
  }
  
  return { valid: false }
}

async function logRequest(supabase: ReturnType<typeof createClient>, request: Request, success: boolean, keyId?: string, error?: string) {
  const logData = {
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    success,
    error: error || null,
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    key_id: keyId || null
  }
  
  console.log('API Request Log:', JSON.stringify(logData, null, 2))
}

interface SatelliteApiResponse {
  success: boolean
  message: string
  data?: {
    customer_id: string
    transaction_id: string
    total_customer_points: number
    distributed_points: Array<{
      customer_id: string
      customer_name: string
      level: number
      points: number
    }>
  }
  error?: string
  validation_errors?: z.ZodError['errors']
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Validate API key from database
    const { valid, keyId } = await validateApiKey(supabase, req)
    
    if (!valid) {
      await logRequest(supabase, req, false, undefined, 'Invalid API key')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid API key. Please provide a valid x-api-key header.'
        } as SatelliteApiResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      await logRequest(supabase, req, false, keyId, 'Invalid method')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Only POST requests are allowed'
        } as SatelliteApiResponse),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse and validate request body with Zod
    let requestData: ValidatedRequest
    try {
      const body = await req.json()
      
      // Validate with Zod schema
      const parseResult = RequestSchema.safeParse(body)
      
      if (!parseResult.success) {
        await logRequest(supabase, req, false, keyId, 'Validation failed')
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid input data',
            validation_errors: parseResult.error.errors
          } as SatelliteApiResponse),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
      
      requestData = parseResult.data
      
      // Clean up empty optional fields
      if (requestData.customer_data.email === '') {
        requestData.customer_data.email = undefined
      }
      if (requestData.customer_data.whatsapp === '') {
        requestData.customer_data.whatsapp = undefined
      }
      if (requestData.customer_data.parent_id === '') {
        requestData.customer_data.parent_id = undefined
      }
      
    } catch (error) {
      await logRequest(supabase, req, false, keyId, 'Invalid JSON body')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON body'
        } as SatelliteApiResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    
    console.log('Received validated satellite API request:', requestData)

    // Validate parent_id exists if provided
    if (requestData.customer_data.parent_id) {
      const { data: parentExists, error: parentError } = await supabase
        .from('customers')
        .select('id')
        .eq('id', requestData.customer_data.parent_id)
        .single()
      
      if (parentError || !parentExists) {
        await logRequest(supabase, req, false, keyId, 'Invalid parent_id')
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid parent_id: parent customer does not exist'
          } as SatelliteApiResponse),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Check if customer exists by name, if not create
    let customerId: string
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('name', requestData.customer_data.name)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
      console.log('Found existing customer:', customerId)
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: requestData.customer_data.name,
          email: requestData.customer_data.email,
          whatsapp: requestData.customer_data.whatsapp,
          parent_id: requestData.customer_data.parent_id,
          position: requestData.customer_data.position,
        })
        .select('id')
        .single()

      if (customerError) {
        console.error('Error creating customer:', customerError)
        await logRequest(supabase, req, false, keyId, 'Failed to create customer')
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create customer' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      customerId = newCustomer.id
      console.log('Created new customer:', customerId)
    }

    // Create transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        customer_id: customerId,
        product_code: requestData.transaction_data.product_code,
        product_name: requestData.transaction_data.product_name,
        product_type: requestData.transaction_data.product_type,
        qty: requestData.transaction_data.qty,
        margin: requestData.transaction_data.margin,
      })
      .select('id')
      .single()

    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
      await logRequest(supabase, req, false, keyId, 'Failed to create transaction')
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Created transaction:', transaction.id)

    // Distribute points (1% to customer, 1% to each upline up to 10 levels)
    //
    // SECURITY: the caller-supplied margin is never trusted as-is. When the
    // product exists in our own catalog we use the authoritative margin
    // (point_price - cost_price); otherwise the caller's value is clamped to a
    // conservative per-unit ceiling so a compromised API key cannot mint
    // unlimited loyalty points.
    const MAX_UNVERIFIED_MARGIN_PER_UNIT = 50000
    const requestedMargin = requestData.transaction_data.margin
    let margin = requestedMargin

    const { data: catalogProduct } = await supabase
      .from('products')
      .select('cost_price, point_price')
      .or(`digiflazz_sku.eq.${requestData.transaction_data.product_code},name.eq.${requestData.transaction_data.product_name}`)
      .limit(1)
      .maybeSingle()

    if (catalogProduct) {
      const authoritativeMargin = Math.max(
        0,
        (Number(catalogProduct.point_price) || 0) - (Number(catalogProduct.cost_price) || 0)
      )
      margin = Math.min(requestedMargin, authoritativeMargin)
      if (margin !== requestedMargin) {
        console.warn('Satellite margin clamped to catalog margin', { requestedMargin, margin })
      }
    } else {
      margin = Math.min(requestedMargin, MAX_UNVERIFIED_MARGIN_PER_UNIT)
      if (margin !== requestedMargin) {
        console.warn('Satellite margin clamped to unverified ceiling', { requestedMargin, margin })
      }
    }

    const qty = requestData.transaction_data.qty || 1
    const totalMargin = margin * qty
    const pointPercentage = 0.01 // 1%

    const distributedPoints: Array<{
      customer_id: string
      customer_name: string
      level: number
      points: number
    }> = []

    // Build list of point history records to insert
    const pointHistoryRecords: Array<{
      transaction_id: string
      from_customer: string | null
      to_customer: string
      level: number
      points: number
      product_code: string
      description: string
    }> = []

    // Give 1% to the customer who made the transaction
    const customerPoints = totalMargin * pointPercentage
    
    pointHistoryRecords.push({
      transaction_id: transaction.id,
      from_customer: null,
      to_customer: customerId,
      level: 0,
      points: customerPoints,
      product_code: requestData.transaction_data.product_code,
      description: `Bonus poin ${requestData.transaction_data.product_name || requestData.transaction_data.product_code}`
    })

    distributedPoints.push({
      customer_id: customerId,
      customer_name: requestData.customer_data.name,
      level: 0,
      points: customerPoints,
    })

    console.log('Prepared points for customer:', customerPoints)

    // Get customer for upline distribution
    const { data: customer } = await supabase
      .from('customers')
      .select('parent_id, name')
      .eq('id', customerId)
      .single()

    if (customer?.parent_id) {
      let currentParentId = customer.parent_id
      let level = 1

      // Distribute 1% to each upline up to 10 levels
      while (currentParentId && level <= 10) {
        const { data: parentCustomer } = await supabase
          .from('customers')
          .select('id, name, parent_id')
          .eq('id', currentParentId)
          .single()

        if (parentCustomer) {
          const uplinePoints = totalMargin * pointPercentage
          
          pointHistoryRecords.push({
            transaction_id: transaction.id,
            from_customer: customerId,
            to_customer: parentCustomer.id,
            level: level,
            points: uplinePoints,
            product_code: requestData.transaction_data.product_code,
            description: `Bonus jaringan level ${level}`
          })

          distributedPoints.push({
            customer_id: parentCustomer.id,
            customer_name: parentCustomer.name,
            level: level,
            points: uplinePoints,
          })

          console.log(`Prepared points for level ${level} upline:`, uplinePoints)

          currentParentId = parentCustomer.parent_id
          level++
        } else {
          break
        }
      }
    }

    // Insert all point history records at once
    if (pointHistoryRecords.length > 0) {
      const { error: historyError } = await supabase
        .from('point_history')
        .insert(pointHistoryRecords)

      if (historyError) {
        console.error('Error inserting point history:', historyError)
        throw historyError
      }

      // Update customer points using atomic RPC function (same pattern as digiflazz-webhook)
      for (const record of pointHistoryRecords) {
        const { data: success, error: rpcError } = await supabase.rpc('increment_customer_points', {
          customer_uuid: record.to_customer,
          points_to_add: record.points
        })

        if (rpcError) {
          console.error('Error incrementing points via RPC:', rpcError)
        } else if (!success) {
          console.log(`Points increment skipped for blocked customer: ${record.to_customer}`)
        } else {
          console.log(`Successfully incremented ${record.points} points for customer ${record.to_customer}`)
        }
      }
    }

    // Calculate total points for the customer
    const { data: totalPointsData } = await supabase
      .from('point_history')
      .select('points')
      .eq('to_customer', customerId)

    const totalCustomerPoints = totalPointsData?.reduce((sum, p) => sum + (Number(p.points) || 0), 0) || 0

    const response: SatelliteApiResponse = {
      success: true,
      message: 'Transaction processed successfully',
      data: {
        customer_id: customerId,
        transaction_id: transaction.id,
        total_customer_points: totalCustomerPoints,
        distributed_points: distributedPoints,
      },
    }

    console.log('Satellite API response:', response)
    await logRequest(supabase, req, true, keyId)

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Satellite API error:', error)
    await logRequest(supabase, req, false, undefined, 'Unexpected error')
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
