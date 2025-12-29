import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  product_name: string;
  product_code: string;
  product_type: string;
  margin: number;
  harga_konsumen?: number;
  harga_pokok?: number;
  qty: number;
  customer_id: string;
  created_at: string;
  customers?: {
    id: string;
    name: string;
    whatsapp?: string;
  };
}

interface ShareWhatsAppTransactionModalProps {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

const DEFAULT_TEMPLATE = `Halo {customer}!

Detail Transaksi Anda:
📦 Produk: {produk}
🔖 Kode: {kode}
📊 Qty: {qty}
💰 Harga: Rp {harga}
💵 Total: Rp {total}
📅 Tanggal: {tanggal}

Terima kasih atas transaksi Anda!`;

export const ShareWhatsAppTransactionModal: React.FC<ShareWhatsAppTransactionModalProps> = ({
  open,
  onClose,
  transactions
}) => {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [previewTransaction, setPreviewTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();

  const validTransactions = transactions.filter(t => t.customers?.whatsapp);
  const invalidTransactions = transactions.filter(t => !t.customers?.whatsapp);

  const formatMessage = (transaction: Transaction): string => {
    const hargaKonsumen = transaction.harga_konsumen || 0;
    const total = hargaKonsumen * (transaction.qty || 0);
    return template
      .replace(/{customer}/g, transaction.customers?.name || 'Customer')
      .replace(/{produk}/g, transaction.product_name || '-')
      .replace(/{kode}/g, transaction.product_code || '-')
      .replace(/{jenis}/g, transaction.product_type || '-')
      .replace(/{harga}/g, hargaKonsumen.toLocaleString())
      .replace(/{qty}/g, String(transaction.qty || 0))
      .replace(/{total}/g, total.toLocaleString())
      .replace(/{tanggal}/g, new Date(transaction.created_at).toLocaleDateString('id-ID'));
  };

  const generateWhatsAppLink = (phone: string, message: string): string => {
    let cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('62')) {
      cleanPhone = '62' + cleanPhone;
    }
    
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleSendSingle = (transaction: Transaction) => {
    if (!transaction.customers?.whatsapp) return;
    
    const message = formatMessage(transaction);
    const link = generateWhatsAppLink(transaction.customers.whatsapp, message);
    window.open(link, '_blank');
  };

  const handleSendAll = () => {
    if (validTransactions.length === 0) {
      toast({
        title: "Error",
        description: "Tidak ada transaksi dengan nomor WhatsApp customer",
        variant: "destructive",
      });
      return;
    }

    validTransactions.forEach((transaction, index) => {
      setTimeout(() => {
        const message = formatMessage(transaction);
        const link = generateWhatsAppLink(transaction.customers!.whatsapp!, message);
        window.open(link, '_blank');
      }, index * 500);
    });

    toast({
      title: "Berhasil",
      description: `Membuka ${validTransactions.length} pesan WhatsApp`,
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Share Transaksi ke WhatsApp
          </DialogTitle>
          <DialogDescription>
            Kirim detail transaksi ke customer via WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="template">Template Pesan</Label>
            <Textarea
              id="template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={6}
              placeholder="Masukkan template pesan..."
            />
            <p className="text-xs text-muted-foreground">
              Placeholder: <code className="bg-muted px-1 rounded">{'{customer}'}</code>{' '}
              <code className="bg-muted px-1 rounded">{'{produk}'}</code>{' '}
              <code className="bg-muted px-1 rounded">{'{kode}'}</code>{' '}
              <code className="bg-muted px-1 rounded">{'{qty}'}</code>{' '}
              <code className="bg-muted px-1 rounded">{'{harga}'}</code>{' '}
              <code className="bg-muted px-1 rounded">{'{total}'}</code>{' '}
              <code className="bg-muted px-1 rounded">{'{tanggal}'}</code>
            </p>
          </div>

          {previewTransaction && (
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Preview: {previewTransaction.product_name}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewTransaction(null)}
                >
                  Tutup
                </Button>
              </div>
              <div className="p-3 bg-background rounded border text-sm whitespace-pre-wrap">
                {formatMessage(previewTransaction)}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Transaksi ({transactions.length})</Label>
              <div className="flex gap-2">
                {validTransactions.length > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {validTransactions.length} valid
                  </Badge>
                )}
                {invalidTransactions.length > 0 && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {invalidTransactions.length} tanpa WA
                  </Badge>
                )}
              </div>
            </div>

            <ScrollArea className="h-[200px] border rounded-lg">
              <div className="p-2 space-y-2">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{transaction.product_name}</span>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{transaction.customers?.name || '-'}</span>
                        {transaction.customers?.whatsapp ? (
                          <span>• {transaction.customers.whatsapp}</span>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                            Tidak ada WA
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewTransaction(transaction)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {transaction.customers?.whatsapp && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendSingle(transaction)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={handleSendAll}
            disabled={validTransactions.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Kirim ke {validTransactions.length} Customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
