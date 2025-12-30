import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, Check, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ColumnMapping {
  excelColumn: string;
  dbField: string;
}

interface ImportExcelProps {
  onSuccess?: () => void;
}

const customerFields = [
  { value: 'name', label: 'Nama Customer' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'Nomor WhatsApp' },
  { value: 'skip', label: '-- Lewati --' },
];

const transactionFields = [
  { value: 'product_name', label: 'Nama Produk' },
  { value: 'product_code', label: 'Kode Produk' },
  { value: 'product_type', label: 'Tipe Produk' },
  { value: 'harga_pokok', label: 'Harga Pokok' },
  { value: 'harga_konsumen', label: 'Harga Konsumen' },
  { value: 'qty', label: 'Quantity' },
  { value: 'skip', label: '-- Lewati --' },
];

export const ImportExcel = ({ onSuccess }: ImportExcelProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [customerMappings, setCustomerMappings] = useState<ColumnMapping[]>([]);
  const [transactionMappings, setTransactionMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'result'>('upload');
  const [importResult, setImportResult] = useState({ customers: 0, transactions: 0, errors: 0 });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          toast({
            title: "File kosong",
            description: "File Excel tidak memiliki data",
            variant: "destructive",
          });
          return;
        }

        const columns = Object.keys(jsonData[0] as object);
        setExcelColumns(columns);
        setExcelData(jsonData);
        
        // Initialize mappings with auto-detect
        const autoCustomerMappings: ColumnMapping[] = columns.map(col => {
          const lowerCol = col.toLowerCase();
          let dbField = 'skip';
          if (lowerCol.includes('nama') || lowerCol.includes('name')) dbField = 'name';
          else if (lowerCol.includes('email')) dbField = 'email';
          else if (lowerCol.includes('whatsapp') || lowerCol.includes('wa') || lowerCol.includes('phone') || lowerCol.includes('hp') || lowerCol.includes('telp')) dbField = 'whatsapp';
          return { excelColumn: col, dbField };
        });
        
        const autoTransactionMappings: ColumnMapping[] = columns.map(col => {
          const lowerCol = col.toLowerCase();
          let dbField = 'skip';
          if (lowerCol.includes('produk') && lowerCol.includes('nama') || lowerCol === 'product_name') dbField = 'product_name';
          else if (lowerCol.includes('kode') || lowerCol.includes('code')) dbField = 'product_code';
          else if (lowerCol.includes('tipe') || lowerCol.includes('type')) dbField = 'product_type';
          else if (lowerCol.includes('pokok') || lowerCol.includes('cost')) dbField = 'harga_pokok';
          else if (lowerCol.includes('konsumen') || lowerCol.includes('jual') || lowerCol.includes('price')) dbField = 'harga_konsumen';
          else if (lowerCol.includes('qty') || lowerCol.includes('jumlah') || lowerCol.includes('quantity')) dbField = 'qty';
          return { excelColumn: col, dbField };
        });

        setCustomerMappings(autoCustomerMappings);
        setTransactionMappings(autoTransactionMappings);
        setStep('mapping');
        setIsOpen(true);
      } catch (error) {
        console.error('Error reading Excel file:', error);
        toast({
          title: "Error membaca file",
          description: "Pastikan file adalah format Excel yang valid (.xlsx, .xls)",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const updateCustomerMapping = (excelColumn: string, dbField: string) => {
    setCustomerMappings(prev => 
      prev.map(m => m.excelColumn === excelColumn ? { ...m, dbField } : m)
    );
  };

  const updateTransactionMapping = (excelColumn: string, dbField: string) => {
    setTransactionMappings(prev => 
      prev.map(m => m.excelColumn === excelColumn ? { ...m, dbField } : m)
    );
  };

  const getMappedValue = (row: any, mappings: ColumnMapping[], field: string): any => {
    const mapping = mappings.find(m => m.dbField === field);
    if (!mapping || mapping.dbField === 'skip') return null;
    return row[mapping.excelColumn];
  };

  const handleImport = async () => {
    setImporting(true);
    let customersCreated = 0;
    let transactionsCreated = 0;
    let errors = 0;

    try {
      for (const row of excelData) {
        // Check if row has customer data
        const customerName = getMappedValue(row, customerMappings, 'name');
        const customerEmail = getMappedValue(row, customerMappings, 'email');
        const customerWhatsapp = getMappedValue(row, customerMappings, 'whatsapp');

        let customerId: string | null = null;

        // Create customer if name exists
        if (customerName) {
          // Check if customer already exists by whatsapp or email
          let existingCustomer = null;
          if (customerWhatsapp) {
            const { data } = await supabase
              .from('customers')
              .select('id')
              .eq('whatsapp', String(customerWhatsapp))
              .maybeSingle();
            existingCustomer = data;
          }
          if (!existingCustomer && customerEmail) {
            const { data } = await supabase
              .from('customers')
              .select('id')
              .eq('email', String(customerEmail))
              .maybeSingle();
            existingCustomer = data;
          }

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            const { data: newCustomer, error: customerError } = await supabase
              .from('customers')
              .insert({
                name: String(customerName),
                email: customerEmail ? String(customerEmail) : null,
                whatsapp: customerWhatsapp ? String(customerWhatsapp) : null,
              })
              .select('id')
              .single();

            if (customerError) {
              console.error('Error creating customer:', customerError);
              errors++;
            } else {
              customerId = newCustomer.id;
              customersCreated++;
            }
          }
        }

        // Create transaction if product data exists
        const productName = getMappedValue(row, transactionMappings, 'product_name');
        const productCode = getMappedValue(row, transactionMappings, 'product_code');
        const productType = getMappedValue(row, transactionMappings, 'product_type');
        const hargaPokok = getMappedValue(row, transactionMappings, 'harga_pokok');
        const hargaKonsumen = getMappedValue(row, transactionMappings, 'harga_konsumen');
        const qty = getMappedValue(row, transactionMappings, 'qty');

        if (productName || productCode) {
          const hargaPokokNum = hargaPokok ? Number(String(hargaPokok).replace(/[^\d]/g, '')) : 0;
          const hargaKonsumenNum = hargaKonsumen ? Number(String(hargaKonsumen).replace(/[^\d]/g, '')) : 0;
          const profit = hargaKonsumenNum - hargaPokokNum;

          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              customer_id: customerId,
              product_name: productName ? String(productName) : null,
              product_code: productCode ? String(productCode) : null,
              product_type: productType ? String(productType) : null,
              harga_pokok: hargaPokokNum,
              harga_konsumen: hargaKonsumenNum,
              margin: profit,
              qty: qty ? Number(qty) : 1,
            });

          if (transactionError) {
            console.error('Error creating transaction:', transactionError);
            errors++;
          } else {
            transactionsCreated++;
          }
        }
      }

      setImportResult({ customers: customersCreated, transactions: transactionsCreated, errors });
      setStep('result');
      
      if (customersCreated > 0 || transactionsCreated > 0) {
        toast({
          title: "Import berhasil!",
          description: `${customersCreated} customer dan ${transactionsCreated} transaksi diimport`,
        });
        onSuccess?.();
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Error saat import",
        description: "Terjadi kesalahan saat mengimport data",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setExcelData([]);
    setExcelColumns([]);
    setCustomerMappings([]);
    setTransactionMappings([]);
    setStep('upload');
    setImportResult({ customers: 0, transactions: 0, errors: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    resetImport();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      <Button onClick={() => fileInputRef.current?.click()} variant="outline">
        <Upload className="w-4 h-4 mr-2" />
        Import Excel
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Import Data dari Excel
            </DialogTitle>
            <DialogDescription>
              {step === 'mapping' && 'Mapping kolom Excel ke field database'}
              {step === 'preview' && 'Preview data yang akan diimport'}
              {step === 'result' && 'Hasil import'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{excelData.length} baris</Badge>
                <Badge variant="secondary">{excelColumns.length} kolom</Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Customer Mappings */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Data Customer</CardTitle>
                    <CardDescription>Mapping ke tabel customers</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {customerMappings.map((mapping) => (
                      <div key={mapping.excelColumn} className="flex items-center gap-2">
                        <span className="text-sm font-medium w-1/2 truncate" title={mapping.excelColumn}>
                          {mapping.excelColumn}
                        </span>
                        <Select
                          value={mapping.dbField}
                          onValueChange={(value) => updateCustomerMapping(mapping.excelColumn, value)}
                        >
                          <SelectTrigger className="w-1/2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {customerFields.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Transaction Mappings */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Data Transaksi</CardTitle>
                    <CardDescription>Mapping ke tabel transactions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {transactionMappings.map((mapping) => (
                      <div key={mapping.excelColumn} className="flex items-center gap-2">
                        <span className="text-sm font-medium w-1/2 truncate" title={mapping.excelColumn}>
                          {mapping.excelColumn}
                        </span>
                        <Select
                          value={mapping.dbField}
                          onValueChange={(value) => updateTransactionMapping(mapping.excelColumn, value)}
                        >
                          <SelectTrigger className="w-1/2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {transactionFields.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Preview Data */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Preview Data (5 baris pertama)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {excelColumns.map((col) => (
                            <TableHead key={col} className="whitespace-nowrap">{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {excelData.slice(0, 5).map((row, idx) => (
                          <TableRow key={idx}>
                            {excelColumns.map((col) => (
                              <TableCell key={col} className="whitespace-nowrap">
                                {String(row[col] ?? '')}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Batal
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mengimport...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Import {excelData.length} Data
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-green-600">{importResult.customers}</div>
                    <p className="text-sm text-muted-foreground">Customer baru</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-blue-600">{importResult.transactions}</div>
                    <p className="text-sm text-muted-foreground">Transaksi baru</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-3xl font-bold text-red-600">{importResult.errors}</div>
                    <p className="text-sm text-muted-foreground">Error</p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Tutup
                </Button>
                <Button onClick={resetImport}>
                  Import Lagi
                </Button>
              </div>
            </div>
          )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
