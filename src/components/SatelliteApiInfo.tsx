import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Code, Globe, Zap } from 'lucide-react';

const SatelliteApiInfo = () => {
  const apiUrl = "https://dtgfbqxwapmwjqkmseru.supabase.co/functions/v1/satellite-api";
  
  const exampleRequest = {
    customer_data: {
      name: "John Doe",
      email: "john@example.com",
      whatsapp: "+628123456789",
      parent_id: "parent-customer-uuid", // optional
      position: "left" // optional: "left" or "right"
    },
    transaction_data: {
      product_code: "PROD001",
      product_name: "Sample Product",
      product_type: "Type A",
      qty: 2,
      margin: 10000
    }
  };

  const exampleResponse = {
    success: true,
    message: "Transaction processed successfully",
    data: {
      customer_id: "customer-uuid",
      transaction_id: "transaction-uuid",
      total_customer_points: 150.5,
      distributed_points: [
        {
          customer_id: "customer-uuid",
          customer_name: "John Doe",
          level: 0,
          points: 100
        },
        {
          customer_id: "parent-uuid",
          customer_name: "Parent Customer",
          level: 1,
          points: 100
        }
      ]
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Zap className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Laryzo Point Engine - Satellite API</CardTitle>
              <CardDescription>
                API untuk aplikasi satelit yang ingin terhubung dengan sistem point engine
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API Overview */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              API Overview
            </h3>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm mb-2">
                <strong>Endpoint:</strong> <code className="bg-background px-2 py-1 rounded text-primary">{apiUrl}</code>
              </p>
              <p className="text-sm mb-2">
                <strong>Method:</strong> <Badge variant="secondary">POST</Badge>
              </p>
              <p className="text-sm mb-2">
                <strong>Content-Type:</strong> <code>application/json</code>
              </p>
              <p className="text-sm mb-2">
                <strong>Authorization:</strong> <code>x-api-key header required</code>
              </p>
              <div className="mt-3">
                <p className="text-sm font-medium mb-1">Demo API Keys:</p>
                <div className="bg-background p-2 rounded text-xs font-mono space-y-1">
                  <div>Development: <code>sat_key_demo_12345</code></div>
                  <div>Production: <code>sat_key_production_67890</code></div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* How it works */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Cara Kerja</h3>
            <div className="space-y-2 text-sm">
              <p>1. Aplikasi satelit mengirim data customer dan transaksi ke API</p>
              <p>2. Laryzo Point Engine memproses transaksi dan mendistribusikan poin:</p>
              <ul className="ml-6 list-disc space-y-1">
                <li>Customer yang transaksi mendapat 1% dari margin profit</li>
                <li>Setiap upline hingga 10 level mendapat 1% dari margin profit</li>
              </ul>
              <p>3. API mengembalikan total poin customer dan detail distribusi poin</p>
            </div>
          </div>

          <Separator />

          {/* Request Format */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Code className="h-5 w-5 mr-2" />
              Format Request
            </h3>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs overflow-auto">
{JSON.stringify(exampleRequest, null, 2)}
              </pre>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              <p><strong>Catatan:</strong></p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Jika customer sudah ada (berdasarkan nama), akan menggunakan data yang sudah ada</li>
                <li>Jika customer belum ada, akan dibuat customer baru</li>
                <li><code>parent_id</code> dan <code>position</code> bersifat opsional</li>
              </ul>
            </div>
          </div>

          <Separator />

          {/* Response Format */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Format Response</h3>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs overflow-auto">
{JSON.stringify(exampleResponse, null, 2)}
              </pre>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              <p><strong>Response Fields:</strong></p>
              <ul className="list-disc ml-4 space-y-1">
                <li><code>success</code>: Boolean status operasi</li>
                <li><code>total_customer_points</code>: Total akumulasi poin customer</li>
                <li><code>distributed_points</code>: Detail distribusi poin per level</li>
              </ul>
            </div>
          </div>

          <Separator />

          {/* Example Usage */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Contoh Penggunaan</h3>
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs overflow-auto">
{`curl -X POST ${apiUrl} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: sat_key_demo_12345" \\
  -d '${JSON.stringify(exampleRequest, null, 2)}'`}
              </pre>
            </div>
          </div>

          <Separator />

          {/* Error Handling */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Error Handling</h3>
            <div className="space-y-2 text-sm">
              <p><strong>HTTP Status Codes:</strong></p>
              <ul className="list-disc ml-4 space-y-1">
                <li><Badge variant="secondary">200</Badge> - Success</li>
                <li><Badge variant="destructive">400</Badge> - Bad Request (data tidak valid)</li>
                <li><Badge variant="destructive">401</Badge> - Unauthorized (API key tidak valid)</li>
                <li><Badge variant="destructive">405</Badge> - Method Not Allowed</li>
                <li><Badge variant="destructive">500</Badge> - Internal Server Error</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SatelliteApiInfo;