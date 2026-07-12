import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  MessageSquare,
  Phone,
  Bot,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Copy,
  Check,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import type { ChatbotSettings } from "@/lib/landing/types";
import ChatbotQAEditor from "./ChatbotQAEditor";

const PROMPT_TEMPLATES = [
  {
    label: "Jual Sabun (Default)",
    value: `Kamu adalah asisten AI ramah untuk Multibeauty Soap. Jawab pertanyaan pelanggan tentang produk, manfaat, harga, cara pakai, dan cara order dengan bahasa Indonesia yang santai dan natural. Gunakan emoji secukupnya. Arahkan ke formulir pemesanan atau WhatsApp admin jika pelanggan ingin membeli.`,
  },
  {
    label: "Fokus Penjualan",
    value: `Kamu adalah sales assistant Multibeauty Soap yang antusias. Tugasmu mendorong pelanggan untuk membeli. Selalu akhiri jawaban dengan ajakan untuk order atau hubungi WhatsApp. Tonjolkan manfaat produk, promo, dan testimoni positif.`,
  },
  {
    label: "Informatif & Edukatif",
    value: `Kamu adalah asisten edukasi kesehatan kulit yang merekomendasikan Multibeauty Soap. Jawab pertanyaan tentang masalah kulit, bahan alami, dan solusi perawatan dengan penjelasan yang detail dan ilmiah tapi tetap mudah dipahami. Rekomendasikan Multibeauty Soap sebagai solusi yang tepat.`,
  },
  {
    label: "Ramah & Santai",
    value: `Kamu adalah teman yang merekomendasikan Multibeauty Soap kepada sahabatnya. Gunakan bahasa gaul yang friendly, emoji banyak, dan cerita pengalaman positif. Buat percakapan terasa natural dan tidak terkesan menjual.`,
  },
];

const WELCOME_TEMPLATES = [
  "Halo! 👋 Ada yang bisa saya bantu tentang Multibeauty Soap?",
  "Selamat datang! 😊 Saya siap membantu kamu menemukan produk perawatan kulit terbaik!",
  "Halo Kak! 💕 Mau tanya-tanya dulu tentang Multibeauty Soap? Saya siap bantu!",
  "Hai! ✨ Ada pertanyaan tentang manfaat, harga, atau cara pesan Multibeauty Soap?",
];

const WA_MESSAGE_TEMPLATES = [
  "Halo, saya tertarik dengan Multibeauty Soap. Bisa bantu saya?",
  "Halo Admin, saya ingin tanya lebih lanjut tentang Multibeauty Soap 🙏",
  "Hai! Saya mau order Multibeauty Soap. Bagaimana caranya?",
];

interface Props {
  settings: ChatbotSettings;
  onChange: (patch: Partial<ChatbotSettings>) => void;
  primaryColor?: string;
}

export default function ChatbotSettingsPanel({ settings, onChange, primaryColor = "#059669" }: Props) {
  const [copied, setCopied] = useState(false);
  const [showPromptTemplates, setShowPromptTemplates] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const enabled = settings?.enabled !== false;

  return (
    <div className="space-y-4">
      {/* Enable/Disable Toggle */}
      <div
        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
          enabled ? "border-emerald-300 bg-emerald-50/50" : "border-gray-200 bg-gray-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <Bot className={`w-5 h-5 ${enabled ? "text-emerald-600" : "text-gray-400"}`} />
          <div>
            <div className="text-sm font-medium">Chatbot AI</div>
            <div className="text-xs text-muted-foreground">
              {enabled ? "Aktif — tampil di landing page" : "Nonaktif — disembunyikan"}
            </div>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => onChange({ enabled: v })}
        />
      </div>

      {enabled && (
        <>
          {/* Welcome Message */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Pesan Selamat Datang
            </Label>
            <Textarea
              className="bg-white text-xs min-h-[80px] resize-none"
              value={settings?.welcomeMessage || ""}
              onChange={(e) => onChange({ welcomeMessage: e.target.value })}
              placeholder="Halo! 👋 Ada yang bisa saya bantu tentang Multibeauty Soap?"
            />
            <div className="flex flex-wrap gap-1">
              {WELCOME_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChange({ welcomeMessage: t })}
                  className="text-[10px] px-2 py-1 rounded-full border hover:bg-accent transition-colors text-left"
                  title={t}
                >
                  Template {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* WhatsApp Number */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <Phone className="w-3 h-3" /> Nomor WhatsApp Admin
            </Label>
            <Input
              className="bg-white text-xs"
              value={settings?.waNumber || ""}
              onChange={(e) => onChange({ waNumber: e.target.value })}
              placeholder="628xxxxxxxxxx"
            />
            <p className="text-[10px] text-muted-foreground">
              Format internasional, tanpa + (contoh: 6281234567890).
              Kosongkan untuk pakai nomor dari System Settings.
            </p>
          </div>

          {/* WhatsApp Message Template */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Pesan WA Awal
            </Label>
            <Textarea
              className="bg-white text-xs min-h-[60px] resize-none"
              value={settings?.waMessage || ""}
              onChange={(e) => onChange({ waMessage: e.target.value })}
              placeholder="Halo, saya tertarik dengan Multibeauty Soap. Bisa bantu saya?"
            />
            <div className="flex flex-wrap gap-1">
              {WA_MESSAGE_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChange({ waMessage: t })}
                  className="text-[10px] px-2 py-1 rounded-full border hover:bg-accent transition-colors"
                >
                  Template {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* AI System Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI System Prompt
              </Label>
              <button
                type="button"
                onClick={() => setShowPromptTemplates(!showPromptTemplates)}
                className="text-[10px] text-primary flex items-center gap-1 hover:underline"
              >
                Template {showPromptTemplates ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            </div>

            {showPromptTemplates && (
              <div className="grid gap-1.5 p-2 bg-muted/40 rounded-md border">
                {PROMPT_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onChange({ aiPrompt: tpl.value });
                      setShowPromptTemplates(false);
                    }}
                    className="text-left p-2 rounded hover:bg-background border border-transparent hover:border-border transition-all"
                  >
                    <div className="text-xs font-medium">{tpl.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{tpl.value.substring(0, 80)}...</div>
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <Textarea
                className="bg-white text-xs min-h-[120px] resize-y pr-8"
                value={settings?.aiPrompt || ""}
                onChange={(e) => onChange({ aiPrompt: e.target.value })}
                placeholder="Kamu adalah asisten AI untuk Multibeauty Soap. Jawab pertanyaan dengan ramah dan informatif dalam bahasa Indonesia..."
              />
              {settings?.aiPrompt && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings.aiPrompt || "")}
                  className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors"
                  title="Copy prompt"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>

            <div className="flex items-start gap-1.5 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <Info className="w-3 h-3 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-[10px] text-blue-800 leading-relaxed">
                System prompt menentukan kepribadian dan gaya AI. Kosongkan untuk menggunakan prompt bawaan yang sudah dioptimasi untuk Multibeauty Soap.
              </p>
            </div>
          </div>

          {/* Q&A Fallback Editor */}
          <div className="space-y-2 border-t pt-3">
            <ChatbotQAEditor
              qaItems={settings?.qaItems || []}
              onChange={(qaItems) => onChange({ qaItems })}
            />
          </div>

          {/* Advanced / Stats */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground py-1"
              >
                <span>Pengaturan Lanjutan</span>
                {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="p-3 bg-muted/40 rounded-md space-y-2 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">Status Integrasi</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${settings?.waNumber ? "bg-green-500" : "bg-yellow-500"}`} />
                  <span>WhatsApp: {settings?.waNumber ? `${settings.waNumber.slice(0, 6)}...${settings.waNumber.slice(-3)}` : "Pakai System Settings"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${settings?.aiPrompt ? "bg-green-500" : "bg-blue-400"}`} />
                  <span>AI Prompt: {settings?.aiPrompt ? `Custom (${settings.aiPrompt.length} karakter)` : "Default Multibeauty"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${settings?.welcomeMessage ? "bg-green-500" : "bg-blue-400"}`} />
                  <span>Pesan Sambutan: {settings?.welcomeMessage ? "Custom" : "Default"}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-[10px] text-amber-800 space-y-1">
                <div className="font-medium">Catatan OpenAI API</div>
                <p>Chatbot AI memerlukan konfigurasi OPENAI_API_KEY di Supabase Edge Function Secrets. Tanpa key, chatbot akan menggunakan smart fallback responses berbasis keyword matching.</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  );
}
