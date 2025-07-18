
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Mail, Phone } from 'lucide-react';

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

  const CustomerNode = ({ customer }: { customer: Customer }) => {
    const children = getChildren(customer.id);
    const leftChild = children.find(c => c.position === 'left');
    const rightChild = children.find(c => c.position === 'right');

    return (
      <div className="flex flex-col items-center space-y-4">
        <Card className="w-64 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">{customer.name || 'Unnamed'}</h3>
            </div>
            {customer.email && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-1">
                <Mail className="w-3 h-3" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.whatsapp && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Phone className="w-3 h-3" />
                <span>{customer.whatsapp}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {(leftChild || rightChild) && (
          <div className="flex space-x-8">
            <div className="flex flex-col items-center">
              {leftChild ? (
                <>
                  <div className="text-xs text-muted-foreground mb-2">LEFT</div>
                  <CustomerNode customer={leftChild} />
                </>
              ) : (
                <div className="w-64 h-24 border-2 border-dashed border-muted rounded-lg flex items-center justify-center text-muted-foreground">
                  <span className="text-sm">Available Slot</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center">
              {rightChild ? (
                <>
                  <div className="text-xs text-muted-foreground mb-2">RIGHT</div>
                  <CustomerNode customer={rightChild} />
                </>
              ) : (
                <div className="w-64 h-24 border-2 border-dashed border-muted rounded-lg flex items-center justify-center text-muted-foreground">
                  <span className="text-sm">Available Slot</span>
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

  return (
    <div className="overflow-auto p-4">
      <div className="space-y-8">
        {rootCustomers.map(customer => (
          <CustomerNode key={customer.id} customer={customer} />
        ))}
      </div>
    </div>
  );
};
