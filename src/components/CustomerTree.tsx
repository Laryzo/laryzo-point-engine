
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Mail, Phone, ZoomIn, ZoomOut, Maximize, Minimize } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  parent_id: string | null;
  position: string | null;
}

interface CustomerTreeProps {
  onStatsUpdate: () => void;
}

export const CustomerTree = ({ onStatsUpdate }: CustomerTreeProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rootCustomers, setRootCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setCustomers(data || []);
      setRootCustomers(data?.filter(c => !c.parent_id) || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const getChildren = (parentId: string) => {
    return customers.filter(c => c.parent_id === parentId);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 50));
  const handleFullscreen = () => setIsFullscreen(!isFullscreen);

  const CustomerNode = ({ customer }: { customer: Customer }) => {
    const children = getChildren(customer.id);
    const leftChild = children.find(c => c.position === 'left');
    const rightChild = children.find(c => c.position === 'right');

    return (
      <div className="flex flex-col items-center space-y-4">
        <Card 
          className="w-32 hover:shadow-md transition-shadow cursor-pointer hover:bg-accent"
          onClick={() => setSelectedCustomer(customer)}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-center">
              <h3 className="font-semibold text-sm text-center">{customer.name || 'Unnamed'}</h3>
            </div>
          </CardContent>
        </Card>

        {(leftChild || rightChild) && (
          <div className="flex space-x-6">
            <div className="flex flex-col items-center">
              {leftChild ? (
                <>
                  <div className="text-xs text-muted-foreground mb-2">L</div>
                  <CustomerNode customer={leftChild} />
                </>
              ) : (
                <div className="w-40 h-20 border-2 border-dashed border-muted rounded-lg flex items-center justify-center text-muted-foreground">
                  <span className="text-sm">Available</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center">
              {rightChild ? (
                <>
                  <div className="text-xs text-muted-foreground mb-2">R</div>
                  <CustomerNode customer={rightChild} />
                </>
              ) : (
                <div className="w-40 h-20 border-2 border-dashed border-muted rounded-lg flex items-center justify-center text-muted-foreground">
                  <span className="text-sm">Available</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (rootCustomers.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No customers yet</h3>
        <p className="text-muted-foreground">Add your first customer to start building the tree</p>
      </div>
    );
  }

  const TreeContent = () => (
    <div className="relative h-full">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button size="sm" variant="outline" onClick={handleZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="px-2 py-1 bg-background border rounded text-sm">{zoom}%</span>
        <Button size="sm" variant="outline" onClick={handleZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleFullscreen}>
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </Button>
      </div>

      {/* Scrollable Tree with fixed node sizes */}
      <ScrollArea className="h-full w-full">
        <div className="overflow-auto" style={{ minWidth: '100%', minHeight: '100%' }}>
          <div 
            className="inline-block p-8"
            style={{ 
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'center top',
              minWidth: '800px',
              minHeight: '600px'
            }}
          >
            <div className="space-y-16 flex flex-col items-center">
              {rootCustomers.map(customer => (
                <div key={customer.id} className="flex justify-center">
                  <CustomerNode customer={customer} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );

  if (isFullscreen) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-background">
          <TreeContent />
        </div>
        
        {/* Customer Detail Dialog */}
        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Customer Details</DialogTitle>
              <DialogDescription>
                Informasi detail customer yang dipilih
              </DialogDescription>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{selectedCustomer.name}</span>
                </div>
                {selectedCustomer.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedCustomer.email}</span>
                  </div>
                )}
                {selectedCustomer.whatsapp && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedCustomer.whatsapp}</span>
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  <p>Position: {selectedCustomer.position || 'Root'}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="h-[600px] w-full relative overflow-hidden">
      <TreeContent />
      
      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              Informasi detail customer yang dipilih
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="font-semibold">{selectedCustomer.name}</span>
              </div>
              {selectedCustomer.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedCustomer.email}</span>
                </div>
              )}
              {selectedCustomer.whatsapp && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedCustomer.whatsapp}</span>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                <p>Position: {selectedCustomer.position || 'Root'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
