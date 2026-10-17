import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Check, Trash2 } from "lucide-react";

type Row = { id: string; name: string; whatsapp: string; package: string; pay_date: string; status: string; followed_up_at: string | null; created_at: string };

const fmt = (d: string) => new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export default function AdminPromoReservations() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("promo_reservations").select("*").order("pay_date", { ascending: true });
    if (error) toast({ title: "Gagal memuat", description: error.message, variant: "destructive" });
    setRows((data as Row[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Row>) => {
    const { error } = await supabase.from("promo_reservations").update(patch as any).eq("id", id);
    if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Hapus data ini?")) return;
    const { error } = await supabase.from("promo_reservations").delete().eq("id", id);
    if (error) return toast({ title: "Gagal", description: error.message, variant: "destructive" });
    load();
  };

  const followUp = (r: Row) => {
    const msg = `Halo Kak ${r.name}, mengingatkan slot promo Sabun Multibeauty (${r.package}) yang Kakak kunci untuk tanggal ${fmt(r.pay_date)} masih kami amankan nih. Mau kami proses pesanannya hari ini? 😊`;
    window.open(`https://api.whatsapp.com/send?phone=${r.whatsapp}&text=${encodeURIComponent(msg)}`, "_blank");
    if (r.status === "waiting") update(r.id, { status: "followed_up", followed_up_at: new Date().toISOString() });
  };

  const today = new Date().toISOString().slice(0, 10);
  const badge = (r: Row) => {
    if (r.status === "closed") return <Badge>Sudah Checkout</Badge>;
    if (r.status === "followed_up") return <Badge variant="secondary">Sudah Difollow-up</Badge>;
    if (r.status === "cancelled") return <Badge variant="outline">Batal</Badge>;
    return r.pay_date <= today
      ? <Badge className="bg-primary text-primary-foreground">Siap Difollow-up</Badge>
      : <Badge variant="outline">Menunggu Tanggal</Badge>;
  };
  const ready = rows.filter((r) => r.status === "waiting" && r.pay_date <= today).length;

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Kunci Promo Multibeauty {ready > 0 && <Badge className="ml-2">{ready} siap difollow-up</Badge>}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <p className="text-sm text-muted-foreground">Memuat...</p> : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada pengunjung yang mengunci promo.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Nama</TableHead><TableHead>WhatsApp</TableHead><TableHead>Paket</TableHead>
                <TableHead>Tgl Kunci</TableHead><TableHead>Rencana Bayar</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.whatsapp}</TableCell>
                    <TableCell>{r.package}</TableCell>
                    <TableCell>{fmt(r.created_at)}</TableCell>
                    <TableCell>{fmt(r.pay_date)}</TableCell>
                    <TableCell>{badge(r)}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" onClick={() => followUp(r)}><MessageCircle className="h-4 w-4 mr-1" />Follow-up</Button>
                      {r.status !== "closed" && <Button size="sm" variant="outline" title="Tandai sudah checkout" onClick={() => update(r.id, { status: "closed" })}><Check className="h-4 w-4" /></Button>}
                      <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
