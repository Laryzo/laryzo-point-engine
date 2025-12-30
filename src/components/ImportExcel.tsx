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

interface ImportExcelProps {
  onSuccess?: () => void;
}

// Field sesuai dengan CustomerForm: name, email, whatsapp
const customerFields = [
  { value: 'name', label: 'Nama *' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'skip', label: '-- Lewati --' },
];

export const ImportExcel = ({ onSuccess }: ImportExcelProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'mapping' | 'result'>('mapping');
  const [importResult, setImportResult] = useState({ customers: 0, errors: 0 });

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
          if (lowerCol.includes('nama') || lowerCol.includes('name')) dbField = 'name';
          else if (lowerCol.includes('email')) dbField = 'email';
          else if (lowerCol.includes('whatsapp') || lowerCol.includes('wa') || lowerCol.includes('phone') || lowerCol.includes('hp') || lowerCol.includes('telp')) dbField = 'whatsapp';
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

  // Find available slot in binary tree (same logic as CustomerForm)
  const findAvailableSlot = async () => {
    try {
      const { data: allCustomers, error } = await supabase
        .from('customers')
        .select('id, name, parent_id')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!allCustomers || allCustomers.length === 0) {
        return { parent_id: null, position: null };
      }

      // Binary tree placement logic - find first available slot in order
      // Start from root nodes, then go level by level (breadth-first)
      const queue = allCustomers.filter(c => !c.parent_id);
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        
        const { data: children, error: childError } = await supabase
          .from('customers')
          .select('position')
          .eq('parent_id', current.id);

        if (childError) continue;

        const hasLeft = children?.some(c => c.position === 'left') || false;
        const hasRight = children?.some(c => c.position === 'right') || false;

        if (!hasLeft) {
          return { parent_id: current.id, position: 'left' as const };
        } else if (!hasRight) {
          return { parent_id: current.id, position: 'right' as const };
        } else {
          // Both slots filled, add children to queue for next level
          const currentChildren = allCustomers.filter(c => c.parent_id === current.id);
          queue.push(...currentChildren);
        }
      }

      // If no slots found, create new root
      return { parent_id: null, position: null };
    } catch (error) {
      console.error('Error finding available slot:', error);
      return { parent_id: null, position: null };
    }
  };

  const handleImport = async () => {
    setImporting(true);
    let customersCreated = 0;
    let errors = 0;

    try {
      // Original order: first row becomes parent (top), last row becomes child (bottom)
      for (const row of excelData) {
        const customerName = getMappedValue(row, 'name');
        const customerEmail = getMappedValue(row, 'email');
        const customerWhatsapp = getMappedValue(row, 'whatsapp');

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
            // Skip duplicate customer
            continue;
          } else {
            // Find available slot in binary tree
            const { parent_id, position } = await findAvailableSlot();

            const { error: customerError } = await supabase
              .from('customers')
              .insert({
                name: String(customerName),
                email: customerEmail ? String(customerEmail) : null,
                whatsapp: customerWhatsapp ? String(customerWhatsapp) : null,
                parent_id,
                position,
              });

            if (customerError) {
              console.error('Error creating customer:', customerError);
              errors++;
            } else {
              customersCreated++;
            }
          }
        }
      }

      setImportResult({ customers: customersCreated, errors });
      setStep('result');
      
      if (customersCreated > 0) {
        toast({
          title: "Import berhasil!",
          description: `${customersCreated} customer diimport`,
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
    setImportResult({ customers: 0, errors: 0 });
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
        Import Customer dari Excel
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Import Data Customer
            </DialogTitle>
            <DialogDescription>
              {step === 'mapping' && 'Mapping kolom Excel ke field customer'}
              {step === 'result' && 'Hasil import'}
            </DialogDescription>
          </DialogHeader>

          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{excelData.length} baris</Badge>
                <Badge variant="secondary">{excelColumns.length} kolom</Badge>
              </div>

              {/* Customer Mappings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Mapping Data Customer</CardTitle>
                  <CardDescription>Mapping kolom Excel ke field database customer (Nama, Email, WhatsApp)</CardDescription>
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
                      Import {excelData.length} Customer
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
                    <div className="text-3xl font-bold text-green-600">{importResult.customers}</div>
                    <p className="text-sm text-muted-foreground">Customer baru</p>
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