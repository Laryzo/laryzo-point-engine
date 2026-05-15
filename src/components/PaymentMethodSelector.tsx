import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Wallet, Coins, Plus } from 'lucide-react';

export type PaymentMethod = 'wallet' | 'points' | 'mixed';

interface Props {
  totalPrice: number;
  walletBalance: number;
  pointsBalance: number;
  method: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  onCalculated: (calc: { walletUsed: number; pointsUsed: number; canPay: boolean; shortage: number }) => void;
}

// 1 point = Rp 1
export function calculatePayment(method: PaymentMethod, total: number, wallet: number, points: number) {
  let walletUsed = 0;
  let pointsUsed = 0;
  if (method === 'wallet') {
    walletUsed = Math.min(total, wallet);
  } else if (method === 'points') {
    pointsUsed = Math.min(total, points);
  } else {
    // mixed: poin dulu, sisanya saldo
    pointsUsed = Math.min(total, points);
    const remaining = total - pointsUsed;
    walletUsed = Math.min(remaining, wallet);
  }
  const paid = walletUsed + pointsUsed;
  const shortage = Math.max(0, total - paid);
  return { walletUsed, pointsUsed, canPay: shortage === 0, shortage };
}

const PaymentMethodSelector = ({ totalPrice, walletBalance, pointsBalance, method, onChange, onCalculated }: Props) => {
  const navigate = useNavigate();
  const calc = calculatePayment(method, totalPrice, walletBalance, pointsBalance);
  const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(Number(n || 0));

  // notify parent
  if (typeof onCalculated === 'function') {
    queueMicrotask(() => onCalculated(calc));
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <Label className="text-sm font-semibold">Metode Pembayaran</Label>
        <p className="text-xs text-muted-foreground">Total tagihan: <b>Rp {fmt(totalPrice)}</b></p>
      </div>
      <RadioGroup value={method} onValueChange={(v) => onChange(v as PaymentMethod)} className="space-y-2">
        <div className="flex items-start space-x-2 border p-3 rounded-lg">
          <RadioGroupItem value="wallet" id="m-wallet" className="mt-1" />
          <Label htmlFor="m-wallet" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" /> <span className="font-medium">Saldo</span>
            </div>
            <p className="text-xs text-muted-foreground">Tersedia: Rp {fmt(walletBalance)}</p>
          </Label>
        </div>
        <div className="flex items-start space-x-2 border p-3 rounded-lg">
          <RadioGroupItem value="points" id="m-points" className="mt-1" />
          <Label htmlFor="m-points" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4" /> <span className="font-medium">Poin</span>
            </div>
            <p className="text-xs text-muted-foreground">Tersedia: {fmt(pointsBalance)} poin (1 poin = Rp 1)</p>
          </Label>
        </div>
        <div className="flex items-start space-x-2 border p-3 rounded-lg">
          <RadioGroupItem value="mixed" id="m-mixed" className="mt-1" />
          <Label htmlFor="m-mixed" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4" /> + <Wallet className="h-4 w-4" /> <span className="font-medium">Campuran</span>
            </div>
            <p className="text-xs text-muted-foreground">Pakai poin dulu, sisanya saldo</p>
          </Label>
        </div>
      </RadioGroup>

      <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
        <div className="flex justify-between"><span>Pakai Poin:</span><b>{fmt(calc.pointsUsed)}</b></div>
        <div className="flex justify-between"><span>Pakai Saldo:</span><b>Rp {fmt(calc.walletUsed)}</b></div>
        {calc.shortage > 0 && (
          <div className="flex justify-between text-red-600 pt-1 border-t">
            <span>Kekurangan:</span><b>Rp {fmt(calc.shortage)}</b>
          </div>
        )}
      </div>

      {!calc.canPay && (
        <Button type="button" variant="default" className="w-full" onClick={() => navigate('/portal/wallet/topup')}>
          <Plus className="h-4 w-4 mr-2" /> TOP UP SALDO
        </Button>
      )}
    </Card>
  );
};

export default PaymentMethodSelector;
