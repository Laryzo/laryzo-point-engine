import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseCustomerNotificationsProps {
  customerId: string | null;
  onPointsUpdate?: () => void;
  onOrderUpdate?: () => void;
}

export const useCustomerNotifications = ({
  customerId,
  onPointsUpdate,
  onOrderUpdate,
}: UseCustomerNotificationsProps) => {
  const { toast } = useToast();
  const prevPointsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!customerId) return;

    // Subscribe to customer points updates
    const customerChannel = supabase
      .channel(`customer-${customerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customers',
          filter: `id=eq.${customerId}`,
        },
        (payload) => {
          const newPoints = Number(payload.new.points);
          const oldPoints = prevPointsRef.current;
          
          if (oldPoints !== null && newPoints > oldPoints) {
            const diff = newPoints - oldPoints;
            toast({
              title: '🎉 Poin Masuk!',
              description: `Anda menerima +${diff.toLocaleString()} poin dari Laryzo`,
            });
          }
          
          prevPointsRef.current = newPoints;
          onPointsUpdate?.();
        }
      )
      .subscribe();

    // Subscribe to order updates
    const orderChannel = supabase
      .channel(`orders-${customerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${customerId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          const oldStatus = payload.old?.status;
          
          if (newStatus !== oldStatus) {
            let title = 'Status Pesanan Berubah';
            let description = '';
            
            if (newStatus === 'success' || newStatus === 'completed') {
              title = '✅ Pesanan Selesai!';
              description = 'Pesanan Anda telah berhasil diproses.';
              if (payload.new.digiflazz_sn) {
                description += ` SN: ${payload.new.digiflazz_sn}`;
              }
            } else if (newStatus === 'processing') {
              title = '⏳ Pesanan Diproses';
              description = 'Pesanan Anda sedang diproses.';
            } else if (newStatus === 'failed') {
              title = '❌ Pesanan Gagal';
              description = payload.new.digiflazz_message || 'Pesanan tidak dapat diproses.';
            } else if (newStatus === 'shipped') {
              title = '📦 Pesanan Dikirim';
              description = payload.new.tracking_number 
                ? `Resi: ${payload.new.tracking_number}` 
                : 'Pesanan Anda sedang dalam pengiriman.';
            }
            
            toast({
              title,
              description,
              variant: newStatus === 'failed' ? 'destructive' : 'default',
            });
          }
          
          onOrderUpdate?.();
        }
      )
      .subscribe();

    // Subscribe to new point history entries
    const pointHistoryChannel = supabase
      .channel(`point-history-${customerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'point_history',
          filter: `to_customer=eq.${customerId}`,
        },
        (payload) => {
          const points = Number(payload.new.points);
          if (points > 0) {
            toast({
              title: '🎁 Poin Diterima!',
              description: `+${points.toLocaleString()} poin dari Laryzo`,
            });
            onPointsUpdate?.();
          }
        }
      )
      .subscribe();

    // Get initial points value
    supabase
      .from('customers')
      .select('points')
      .eq('id', customerId)
      .single()
      .then(({ data }) => {
        if (data) {
          prevPointsRef.current = Number(data.points);
        }
      });

    return () => {
      supabase.removeChannel(customerChannel);
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(pointHistoryChannel);
    };
  }, [customerId, toast, onPointsUpdate, onOrderUpdate]);
};
