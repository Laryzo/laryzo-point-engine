import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ColumnMapping {
  excelColumn: string;
  dbField: string;
}

interface ImportTransactionsProps {
  onSuccess?: () => void;
}

// Field sesuai dengan TransactionForm: product_code, product_type, product_name, qty, harga_konsumen, harga_pokok
const transactionFields = [
  { value: 'product_code', label: 'Product Code *' },
  { value: 'product_type', label: 'Product Type' },
  { value: 'product_name', label: 'Product Name *' },
  { value: 'qty', label: 'Quantity *' },
  { value: 'harga_konsumen', label: 'Harga Konsumen (Rp) *' },
  { value: 'harga_pokok', label: 'Harga Pokok (Rp) *' },
  { value: 'customer_name', label: 'Customer (nama untuk matching)' },
  { value: 'customer_whatsapp', label: 'Customer (WhatsApp untuk matching)' },
  { value: 'skip', label: '-- Lewati --' },
];

export const ImportTransactions = ({ onSuccess }: ImportTransactionsProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'mapping' | 'result'>('mapping');
  const [importResult, setImportResult] = useState({ transactions: 0, errors: 0 });

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
        const autoMappings: ColumnMapping[] = columns.map(col => {
          const lowerCol = col.toLowerCase();
          let dbField = 'skip';
          if (lowerCol.includes('produk') && lowerCol.includes('nama') || lowerCol === 'product_name' || lowerCol === 'nama produk') dbField = 'product_name';
          else if (lowerCol.includes('kode') || lowerCol.includes('code')) dbField = 'product_code';
          else if (lowerCol.includes('tipe') || lowerCol.includes('type')) dbField = 'product_type';
          else if (lowerCol.includes('pokok') || lowerCol.includes('cost') || lowerCol.includes('modal')) dbField = 'harga_pokok';
          else if (lowerCol.includes('konsumen') || lowerCol.includes('jual') || lowerCol.includes('price') || lowerCol.includes('harga')) dbField = 'harga_konsumen';
          else if (lowerCol.includes('qty') || lowerCol.includes('jumlah') || lowerCol.includes('quantity')) dbField = 'qty';
          else if (lowerCol.includes('customer') && lowerCol.includes('nama') || lowerCol === 'nama customer') dbField = 'customer_name';
          else if (lowerCol.includes('whatsapp') || lowerCol.includes('wa') || lowerCol.includes('phone') || lowerCol.includes('hp')) dbField = 'customer_whatsapp';
          return { excelColumn: col, dbField };
        });

        setMappings(autoMappings);
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

  const updateMapping = (excelColumn: string, dbField: string) => {
    setMappings(prev => 
      prev.map(m => m.excelColumn === excelColumn ? { ...m, dbField } : m)
    );
  };

  const getMappedValue = (row: any, field: string): any => {
    const mapping = mappings.find(m => m.dbField === field);
    if (!mapping || mapping.dbField === 'skip') return null;
    return row[mapping.excelColumn];
  };

  const handleImport = async () => {
    setImporting(true);
    let transactionsCreated = 0;
    let errors = 0;

    try {
      for (const row of excelData) {
        const productName = getMappedValue(row, 'product_name');
        const productCode = getMappedValue(row, 'product_code');
        const productType = getMappedValue(row, 'product_type');
        const hargaPokok = getMappedValue(row, 'harga_pokok');
        const hargaKonsumen = getMappedValue(row, 'harga_konsumen');
        const qty = getMappedValue(row, 'qty');
        const customerName = getMappedValue(row, 'customer_name');
        const customerWhatsapp = getMappedValue(row, 'customer_whatsapp');

        // Try to find customer by whatsapp or name
        let customerId: string | null = null;
        if (customerWhatsapp) {
          const { data } = await supabase
            .from('customers')
            .select('id')
            .eq('whatsapp', String(customerWhatsapp))
            .maybeSingle();
          if (data) customerId = data.id;
        }
        if (!customerId && customerName) {
          const { data } = await supabase
            .from('customers')
            .select('id')
            .ilike('name', String(customerName))
            .maybeSingle();
          if (data) customerId = data.id;
        }

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

      setImportResult({ transactions: transactionsCreated, errors });
      setStep('result');
      
      if (transactionsCreated > 0) {
        toast({
          title: "Import berhasil!",
          description: `${transactionsCreated} transaksi diimport`,
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
    setMappings([]);
    setStep('mapping');
    setImportResult({ transactions: 0, errors: 0 });
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
        Import Transaksi dari Excel
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Import Data Transaksi
            </DialogTitle>
            <DialogDescription>
              {step === 'mapping' && 'Mapping kolom Excel ke field transaksi'}
              {step === 'result' && 'Hasil import'}
            </DialogDescription>
          </DialogHeader>

          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{excelData.length} baris</Badge>
                <Badge variant="secondary">{excelColumns.length} kolom</Badge>
              </div>

              {/* Transaction Mappings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Mapping Data Transaksi</CardTitle>
                  <CardDescription>Mapping kolom Excel ke field database transaksi</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mappings.map((mapping) => (
                    <div key={mapping.excelColumn} className="flex items-center gap-2">
                      <span className="text-sm font-medium w-1/2 truncate" title={mapping.excelColumn}>
                        {mapping.excelColumn}
                      </span>
                      <Select
                        value={mapping.dbField}
                        onValueChange={(value) => updateMapping(mapping.excelColumn, value)}
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
                      Import {excelData.length} Transaksi
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
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
        </DialogContent>
      </Dialog>
    </>
  );
};
