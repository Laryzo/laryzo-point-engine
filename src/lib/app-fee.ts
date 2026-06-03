import { supabase } from '@/integrations/supabase/client';

const DEFAULT_FEE_PERCENT = 5;
let cached: number | null = null;
let pending: Promise<number> | null = null;

export const getAppFeePercent = async (): Promise<number> => {
  if (cached != null) return cached;
  if (pending) return pending;
  pending = (async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'merchant_app_fee_percent')
        .maybeSingle();
      const v = Number(data?.value);
      cached = Number.isFinite(v) && v >= 0 && v < 100 ? v : DEFAULT_FEE_PERCENT;
    } catch {
      cached = DEFAULT_FEE_PERCENT;
    } finally {
      pending = null;
    }
    return cached!;
  })();
  return pending;
};

export const clearAppFeeCache = () => { cached = null; };

/** Compute customer-facing selling price from merchant cost using fee%. */
export const computeSellingPrice = (cost: number, feePercent: number): number => {
  if (!cost || cost <= 0) return 0;
  const divisor = (100 - feePercent) / 100;
  if (divisor <= 0) return 0;
  return Math.ceil((cost / divisor) / 500) * 500;
};

/** Inverse: estimate cost from selling price using fee%. */
export const estimateCostFromPrice = (price: number, feePercent: number): number => {
  const factor = (100 - feePercent) / 100;
  return Math.round((Number(price) || 0) * factor);
};
