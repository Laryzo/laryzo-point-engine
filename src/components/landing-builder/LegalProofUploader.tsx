import { useRef, useState, DragEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, X, FileText } from "lucide-react";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

export default function LegalProofUploader({
  value,
  fileType,
  onChange,
}: {
  value?: string;
  fileType?: "image" | "pdf";
  onChange: (patch: { image?: string; fileType?: "image" | "pdf" }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const validate = (file: File): string | null => {
    if (!ALLOWED.includes(file.type)) return "Format tidak didukung. Hanya JPG, PNG, atau PDF.";
    if (file.size > MAX_SIZE) return `Ukuran file melebihi 5MB (file ini ${(file.size / 1024 / 1024).toFixed(2)}MB).`;
    return null;
  };

  const upload = async (file: File) => {
    const err = validate(file);
    if (err) {
      toast({ title: "File ditolak", description: err, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || (file.type === "application/pdf" ? "pdf" : "png");
      const path = `legal/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("landing-assets")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: signed, error: signErr } = await supabase.storage
        .from("landing-assets")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !signed?.signedUrl) throw signErr || new Error("Gagal membuat URL");
      onChange({ image: signed.signedUrl, fileType: file.type === "application/pdf" ? "pdf" : "image" });
      toast({ title: "Bukti legalitas terupload" });
    } catch (e) {
      toast({ title: "Upload gagal", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium">Bukti legalitas (JPG, PNG, PDF, maks 5MB)</div>
      {value ? (
        <div className="relative group">
          {fileType === "pdf" ? (
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 p-3 rounded border bg-muted/40 hover:bg-muted transition text-xs"
            >
              <FileText className="w-5 h-5 text-red-600" /> Lihat PDF
            </a>
          ) : (
            <img src={value} alt="" className="w-full h-32 object-contain rounded border bg-muted/30" />
          )}
          <button
            type="button"
            onClick={() => onChange({ image: "", fileType: undefined })}
            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`w-full h-32 border-2 border-dashed rounded flex flex-col items-center justify-center text-xs cursor-pointer transition ${
            dragOver ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40"
          }`}
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 animate-spin mb-1" /> Mengupload...</>
          ) : (
            <>
              <Upload className="w-4 h-4 mb-1" />
              <div>Tarik file ke sini atau klik</div>
              <div className="text-[10px] opacity-70 mt-0.5">JPG, PNG, PDF · maks 5MB</div>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,application/pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      {value && (
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
          Ganti file
        </Button>
      )}
    </div>
  );
}
