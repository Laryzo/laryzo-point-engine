import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS configuration - restrict to trusted origins
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://jkqtqxwtyqrlhblnaohz.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com')
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
    origin === allowed || origin.endsWith('.lovable.dev') || origin.endsWith('.lovableproject.com')
  )
}

interface Customer {
  id: string;
  name: string;
  parent_id: string | null;
  points_blocked: boolean;
}

interface Transaction {
  id: string;
  customer_id: string;
  harga_konsumen: number;
  harga_pokok: number;
  product_code: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate origin for non-preflight requests
  if (!isOriginAllowed(origin)) {
    console.warn('Blocked calculate-points request from unauthorized origin:', origin)
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting point calculation...');

    // 1. Clear existing point_history and reset customer points
    console.log('Clearing existing point data...');
    await supabase.from('point_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('customers').update({ points: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Fetch all customers (including points_blocked status)
    console.log('Fetching customers...');
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, name, parent_id, points_blocked');

    if (customerError) {
      console.error('Error fetching customers:', customerError);
      throw customerError;
    }

    // Create customer lookup map
    const customerMap = new Map<string, Customer>();
    customers?.forEach(c => customerMap.set(c.id, c));

    // 3. Fetch all transactions
    console.log('Fetching transactions...');
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('id, customer_id, harga_konsumen, harga_pokok, product_code');

    if (transactionError) {
      console.error('Error fetching transactions:', transactionError);
      throw transactionError;
    }

    console.log(`Found ${transactions?.length || 0} transactions to process`);

    // 4. Calculate points for each transaction
    const pointHistoryRecords: any[] = [];
    const customerPointsAccumulator = new Map<string, number>();

    const POINT_PERCENTAGE = 0.01; // 1% per level
    const MAX_UPLINE_LEVELS = 10;

    for (const transaction of transactions || []) {
      const profit = (transaction.harga_konsumen || 0) - (transaction.harga_pokok || 0);
      const pointsPerLevel = profit * POINT_PERCENTAGE;

      if (profit <= 0 || !transaction.customer_id) continue;

      // Level 0: Customer's own purchase points
      // Check if customer is blocked
      const selfCustomer = customerMap.get(transaction.customer_id);
      if (!selfCustomer?.points_blocked) {
        const selfPoints = pointsPerLevel;
        pointHistoryRecords.push({
          transaction_id: transaction.id,
          from_customer: transaction.customer_id,
          to_customer: transaction.customer_id,
          level: 0,
          points: selfPoints,
          product_code: transaction.product_code
        });

        // Accumulate points for customer
        const currentSelfPoints = customerPointsAccumulator.get(transaction.customer_id) || 0;
        customerPointsAccumulator.set(transaction.customer_id, currentSelfPoints + selfPoints);
      }

      // Levels 1-10: Upline points
      let currentCustomerId = transaction.customer_id;
      for (let level = 1; level <= MAX_UPLINE_LEVELS; level++) {
        const currentCustomer = customerMap.get(currentCustomerId);
        if (!currentCustomer || !currentCustomer.parent_id) break;

        const parentId = currentCustomer.parent_id;
        const parentCustomer = customerMap.get(parentId);
        
        // Skip if parent is blocked
        if (parentCustomer?.points_blocked) {
          currentCustomerId = parentId;
          continue;
        }

        const uplinePoints = pointsPerLevel;

        pointHistoryRecords.push({
          transaction_id: transaction.id,
          from_customer: transaction.customer_id,
          to_customer: parentId,
          level: level,
          points: uplinePoints,
          product_code: transaction.product_code
        });

        // Accumulate points for upline
        const currentUplinePoints = customerPointsAccumulator.get(parentId) || 0;
        customerPointsAccumulator.set(parentId, currentUplinePoints + uplinePoints);

        currentCustomerId = parentId;
      }
    }

    console.log(`Generated ${pointHistoryRecords.length} point history records`);

    // 5. Insert point_history in batches
    const BATCH_SIZE = 500;
    for (let i = 0; i < pointHistoryRecords.length; i += BATCH_SIZE) {
      const batch = pointHistoryRecords.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase.from('point_history').insert(batch);
      if (insertError) {
        console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError);
        throw insertError;
      }
      console.log(`Inserted batch ${i / BATCH_SIZE + 1} of ${Math.ceil(pointHistoryRecords.length / BATCH_SIZE)}`);
    }

    // 6. Update customer points
    console.log('Updating customer points...');
    let updatedCount = 0;
    for (const [customerId, totalPoints] of customerPointsAccumulator) {
      const { error: updateError } = await supabase
        .from('customers')
        .update({ points: totalPoints })
        .eq('id', customerId);
      
      if (updateError) {
        console.error(`Error updating customer ${customerId}:`, updateError);
      } else {
        updatedCount++;
      }
    }

    console.log(`Updated points for ${updatedCount} customers`);

    // 7. Return summary
    const summary = {
      success: true,
      transactions_processed: transactions?.length || 0,
      point_records_created: pointHistoryRecords.length,
      customers_updated: updatedCount,
      formula: '1% profit per level (0-10), max 11% total per transaction'
    };

    console.log('Point calculation completed:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in calculate-points:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
