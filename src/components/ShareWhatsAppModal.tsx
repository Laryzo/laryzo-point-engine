import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  email?: string;
  whatsapp?: string;
  totalPoints?: number;
  plain_password?: string;
}

interface ShareWhatsAppModalProps {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
}

const DEFAULT_TEMPLATE = `Halo {nama}!

Berikut kredensial login Anda:
Email: {email}
Password: {password}

Total poin Anda saat ini: {points} poin.

Info lebih lanjut hubungi admin.`;

export const ShareWhatsAppModal: React.FC<ShareWhatsAppModalProps> = ({
  open,
  onClose,
  customers
}) => {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [previewCustomer, setPreviewCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  const validCustomers = customers.filter(c => c.whatsapp);
  const invalidCustomers = customers.filter(c => !c.whatsapp);

  const formatMessage = (customer: Customer): string => {
    return template
      .replace(/{nama}/g, customer.name || 'Customer')
      .replace(/{email}/g, customer.email || '-')
      .replace(/{points}/g, customer.totalPoints?.toFixed(2) || '0.00')
      .replace(/{whatsapp}/g, customer.whatsapp || '-')
      .replace(/{password}/g, customer.plain_password || '(belum di-generate)');
  };

  const generateWhatsAppLink = (phone: string, message: string): string => {
    // Clean phone number
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Add Indonesia country code if needed
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('62')) {
      cleanPhone = '62' + cleanPhone;
    }
    
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleSendSingle = (customer: Customer) => {
    if (!customer.whatsapp) return;
    
    const message = formatMessage(customer);
    const link = generateWhatsAppLink(customer.whatsapp, message);
    window.open(link, '_blank');
  };

  const handleSendAll = () => {
    if (validCustomers.length === 0) {
      toast({
        title: "Error",
        description: "Tidak ada customer dengan nomor WhatsApp",
        variant: "destructive",
      });
      return;
    }

    // Open each WhatsApp link in new tabs
    validCustomers.forEach((customer, index) => {
      setTimeout(() => {
        const message = formatMessage(customer);
        const link = generateWhatsAppLink(customer.whatsapp!, message);
        window.open(link, '_blank');
      }, index * 500); // 500ms delay between each to avoid popup blocking
    });

    toast({
      title: "Berhasil",
      description: `Membuka ${validCustomers.length} pesan WhatsApp`,
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            Share ke WhatsApp
          </DialogTitle>
          <DialogDescription>
            Kirim pesan ke customer yang dipilih via WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Template Section */}
          <div className="space-y-2">
            <Label htmlFor="template">Template Pesan</Label>
            <Textarea
              id="template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={5}
              placeholder="Masukkan template pesan..."
            />
            <p className="text-xs text-muted-foreground">
              Placeholder: <code className="bg-muted px-1 rounded">{'{nama}'}</code>{' '}
              <code className="bg-muted px-1 rounded">{'{email}'}</code>{' '}
              <code className="bg-muted px-1 rounded">{'{password}'}</code>{' '}
              <code className="bg-muted px-1 rounded">{'{points}'}</code>{' '}
              <code className="bg-muted px-1 rounded">{'{whatsapp}'}</code>
            </p>
          </div>

          {/* Preview Section */}
          {previewCustomer && (
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Preview untuk: {previewCustomer.name}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewCustomer(null)}
                >
                  Tutup
                </Button>
              </div>
              <div className="p-3 bg-background rounded border text-sm whitespace-pre-wrap">
                {formatMessage(previewCustomer)}
              </div>
            </div>
          )}

          {/* Customer List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Customer ({customers.length})</Label>
              <div className="flex gap-2">
                {validCustomers.length > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {validCustomers.length} valid
                  </Badge>
                )}
                {invalidCustomers.length > 0 && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {invalidCustomers.length} tanpa WA
                  </Badge>
                )}
              </div>
            </div>

            <ScrollArea className="h-[200px] border rounded-lg">
              <div className="p-2 space-y-2">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{customer.name}</span>
                      {customer.whatsapp ? (
                        <span className="text-sm text-muted-foreground">
                          {customer.whatsapp}
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-200">
                          Tidak ada WA
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewCustomer(customer)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {customer.whatsapp && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendSingle(customer)}
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
            disabled={validCustomers.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Kirim ke {validCustomers.length} Customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
