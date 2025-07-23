import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TransactionRequest {
  customer_data: {
    name: string;
    email?: string;
    whatsapp?: string;
    parent_id?: string;
    position?: string;
  };
  transaction_data: {
    product_code: string;
    product_name: string;
    product_type: string;
    qty: number;
    margin: number;
  };
}

interface SatelliteApiResponse {
  success: boolean;
  message: string;
  data?: {
    customer_id: string;
    transaction_id: string;
    total_customer_points: number;
    distributed_points: Array<{
      customer_id: string;
      customer_name: string;
      level: number;
      points: number;
    }>;
  };
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: TransactionRequest = await req.json();
    
    console.log('Received satellite API request:', requestData);

    // Validate request data
    if (!requestData.customer_data?.name || !requestData.transaction_data) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request data. customer_data.name and transaction_data are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if customer exists by name, if not create
    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('name', requestData.customer_data.name)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      console.log('Found existing customer:', customerId);
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
        .single();

      if (customerError) {
        console.error('Error creating customer:', customerError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create customer' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      customerId = newCustomer.id;
      console.log('Created new customer:', customerId);
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
      .single();

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created transaction:', transaction.id);

    // Distribute points (1% to customer, 1% to each upline up to 10 levels)
    const margin = requestData.transaction_data.margin;
    const pointPercentage = 0.01; // 1%
    const distributedPoints: Array<{
      customer_id: string;
      customer_name: string;
      level: number;
      points: number;
    }> = [];

    // Give 1% to the customer who made the transaction
    const customerPoints = margin * pointPercentage;
    
    await supabase.from('point_history').insert({
      transaction_id: transaction.id,
      from_customer: null,
      to_customer: customerId,
      level: 0,
      points: customerPoints,
      product_code: requestData.transaction_data.product_code,
    });

    distributedPoints.push({
      customer_id: customerId,
      customer_name: requestData.customer_data.name,
      level: 0,
      points: customerPoints,
    });

    console.log('Distributed points to customer:', customerPoints);

    // Get customer for upline distribution
    const { data: customer } = await supabase
      .from('customers')
      .select('parent_id, name')
      .eq('id', customerId)
      .single();

    if (customer?.parent_id) {
      let currentParentId = customer.parent_id;
      let level = 1;

      // Distribute 1% to each upline up to 10 levels
      while (currentParentId && level <= 10) {
        const { data: parentCustomer } = await supabase
          .from('customers')
          .select('id, name, parent_id')
          .eq('id', currentParentId)
          .single();

        if (parentCustomer) {
          const uplinePoints = margin * pointPercentage;
          
          await supabase.from('point_history').insert({
            transaction_id: transaction.id,
            from_customer: customerId,
            to_customer: parentCustomer.id,
            level: level,
            points: uplinePoints,
            product_code: requestData.transaction_data.product_code,
          });

          distributedPoints.push({
            customer_id: parentCustomer.id,
            customer_name: parentCustomer.name,
            level: level,
            points: uplinePoints,
          });

          console.log(`Distributed points to level ${level} upline:`, uplinePoints);

          currentParentId = parentCustomer.parent_id;
          level++;
        } else {
          break;
        }
      }
    }

    // Calculate total points for the customer
    const { data: totalPointsData } = await supabase
      .from('point_history')
      .select('points')
      .eq('to_customer', customerId);

    const totalCustomerPoints = totalPointsData?.reduce((sum, p) => sum + (Number(p.points) || 0), 0) || 0;

    const response: SatelliteApiResponse = {
      success: true,
      message: 'Transaction processed successfully',
      data: {
        customer_id: customerId,
        transaction_id: transaction.id,
        total_customer_points: totalCustomerPoints,
        distributed_points: distributedPoints,
      },
    };

    console.log('Satellite API response:', response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Satellite API error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});