import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";

export default function ImageUploader({
  value,
  onChange,
  label,
}: {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("landing-assets")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      // Bucket is private (workspace policy blocks public buckets) — use signed URL (10 years)
      const { data: signed, error: signErr } = await supabase.storage
        .from("landing-assets")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !signed?.signedUrl) throw signErr || new Error("Gagal membuat URL");
      onChange(signed.signedUrl);
      toast({ title: "Gambar terupload" });
    } catch (e) {
      toast({ title: "Upload gagal", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <div className="text-xs font-medium">{label}</div>}
      {value ? (
        <div className="relative group">
          <img src={value} alt="" className="w-full h-32 object-cover rounded border" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="w-full h-32 border-2 border-dashed rounded flex items-center justify-center text-xs text-muted-foreground">
          No image
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
        Upload / Ganti
      </Button>
    </div>
  );
}
