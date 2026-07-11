import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, MessageCircle, Loader2, ChevronRight, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ChatbotSettings } from "@/lib/landing/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  quickReplies?: string[];
}

interface ChatAssistantProps {
  primaryColor?: string;
  productName?: string;
  onClose?: () => void;
  settings?: ChatbotSettings;
}

const QUICK_REPLIES = [
  "Apa manfaatnya?",
  "Berapa harganya?",
  "Bagaimana cara pakai?",
  "Aman untuk kulit sensitif?",
  "Mau order sekarang",
  "Ada promo?",
];

const QUICK_REPLIES_ALT = [
  "Bisa untuk jerawat?",
  "Ada paket hemat?",
  "Pengiriman ke mana?",
  "Apa saja bahannya?",
  "Testimoni pelanggan",
  "Hubungi WhatsApp",
];

function normalizePhoneNumber(raw: string): string {
  const cleaned = raw.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) return "62" + cleaned.slice(1);
  if (cleaned.startsWith("62")) return cleaned;
  return "62" + cleaned;
}

function buildWaLink(phoneNumber: string, message?: string): string {
  const phone = normalizePhoneNumber(phoneNumber);
  const text = message || "Halo, saya tertarik dengan produk Anda. Bisa bantu saya?";
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
}

function openWhatsAppDirect(phoneNumber: string, message?: string): void {
  const link = buildWaLink(phoneNumber, message);
  const win = window.open(link, "_blank", "noopener,noreferrer");
  if (!win || win.closed || typeof win.closed === "undefined") {
    window.location.href = link;
  }
}

// Read waNumber from landing_pages.settings_published.chatbot.waNumber
async function fetchWaNumberFromDB(): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("landing_pages")
      .select("settings_published")
      .eq("slug", "multibeauty")
      .maybeSingle();

    const waNumber = (data as any)?.settings_published?.chatbot?.waNumber;
    if (waNumber) {
      localStorage.setItem("chatbot_wa_number", waNumber);
      return waNumber;
    }
  } catch {
    // ignore
  }

  // Fallback: localStorage cache
  return localStorage.getItem("chatbot_wa_number");
}

export default function ChatAssistant({
  primaryColor = "#059669",
  productName = "Multibeauty Soap",
  onClose,
  settings,
}: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: settings?.welcomeMessage || `Halo! 👋 Saya adalah asisten AI untuk ${productName}. Ada yang bisa saya bantu?\n\nTanyakan tentang manfaat, cara pakai, harga, bahan, keamanan, atau cara pemesanan!`,
      timestamp: new Date(),
      quickReplies: QUICK_REPLIES,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [adminWaNumber, setAdminWaNumber] = useState<string | null>(null);
  const [quickReplyToggle, setQuickReplyToggle] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load WA number: settings prop first, then DB, then localStorage cache
  useEffect(() => {
    if (settings?.waNumber) {
      setAdminWaNumber(settings.waNumber);
      localStorage.setItem("chatbot_wa_number", settings.waNumber);
      return;
    }
    fetchWaNumberFromDB().then(setAdminWaNumber);
  }, [settings?.waNumber]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const userMessages = messages.filter(m => m.role === "user").length;
    setQuickReplyToggle(userMessages % 2);
  }, [messages]);

  const currentQuickReplies = quickReplyToggle === 0 ? QUICK_REPLIES : QUICK_REPLIES_ALT;

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue.trim();
    if (!textToSend) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-multibeauty", {
        body: {
          message: userMessage.content,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          whatsappNumber: adminWaNumber || null,
          customPrompt: settings?.aiPrompt,
        },
      });

      if (error || !data?.message) {
        throw new Error(error?.message || "No response from AI");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        quickReplies: currentQuickReplies,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const fallbackMessage = generateSmartFallback(userMessage.content);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fallbackMessage,
        timestamp: new Date(),
        quickReplies: currentQuickReplies,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleWhatsAppClick = useCallback(() => {
    if (adminWaNumber) {
      const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
      const context = lastUserMessage?.content || "";
      const waMessage = settings?.waMessage || `Halo, saya tertarik dengan ${productName}. ${context ? `Saya ingin bertanya tentang: ${context}` : ""}`;
      openWhatsAppDirect(adminWaNumber, waMessage);
    } else {
      const fallbackMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Nomor WhatsApp admin belum dikonfigurasi. Silakan hubungi kami langsung atau coba lagi nanti. 🙏`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    }
  }, [adminWaNumber, messages, productName, settings?.waMessage]);

  // Re-fetch WA number when chat is opened to catch admin updates
  const handleOpenChat = useCallback(() => {
    setIsOpen(true);
    if (!settings?.waNumber) {
      fetchWaNumberFromDB().then((num) => {
        if (num) setAdminWaNumber(num);
      });
    }
  }, [settings?.waNumber]);

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-40">
        {adminWaNumber && (
          <button
            onClick={handleWhatsAppClick}
            className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300 p-4 bg-green-500 hover:bg-green-600 text-white animate-pulse hover:animate-none"
            title="Hubungi via WhatsApp"
          >
            <Phone className="w-6 h-6" />
          </button>
        )}
        <button
          onClick={handleOpenChat}
          className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300 p-4 text-white animate-pulse hover:animate-none"
          style={{ backgroundColor: primaryColor }}
          title="Chat dengan AI Asisten"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-24px)] rounded-2xl shadow-2xl flex flex-col bg-white z-50 overflow-hidden">
      {/* Header */}
      <div
        className="p-4 text-white flex items-center justify-between"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <div>
            <h3 className="font-semibold text-sm">{productName}</h3>
            <p className="text-xs opacity-90">AI Asisten</p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
          }}
          className="hover:bg-white/20 p-1 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96 bg-gray-50">
        {messages.map((message) => (
          <div key={message.id}>
            <div
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                  message.role === "user"
                    ? "text-white rounded-br-none"
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
                }`}
                style={
                  message.role === "user"
                    ? { backgroundColor: primaryColor }
                    : {}
                }
              >
                {message.content}
              </div>
            </div>

            {/* Quick Replies */}
            {message.role === "assistant" && message.quickReplies && (
              <div className="flex flex-wrap gap-2 mt-2 ml-0">
                {message.quickReplies.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(reply)}
                    disabled={isLoading}
                    className="text-xs px-3 py-1 rounded-full border transition-all hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    {reply}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg rounded-bl-none flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: primaryColor }} />
              <span className="text-sm text-gray-600">Sedang mengetik...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input & WhatsApp Button */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2 mb-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tanya sesuatu..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
            style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputValue.trim()}
            className="p-2 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Tombol WhatsApp */}
        <button
          onClick={handleWhatsAppClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors bg-green-500 hover:bg-green-600"
          title="Klik untuk langsung chat via WhatsApp"
        >
          <Phone className="w-4 h-4" />
          Hubungi via WhatsApp
        </button>
      </div>
    </div>
  );
}

// ============================================================
// SMART FALLBACK RESPONSE GENERATOR (client-side)
// ============================================================
function generateSmartFallback(message: string): string {
  const lower = message.toLowerCase().trim();

  if (lower.match(/^(halo|hai|hi|hello|hey|assalamu|selamat|pagi|siang|sore|malam|permisi)/)) {
    const greetings = [
      "Halo! 👋 Senang kamu bertanya! Saya asisten AI untuk Multibeauty Soap. Ada yang bisa saya bantu?",
      "Hai! 😊 Selamat datang! Saya siap membantu kamu dengan pertanyaan seputar Multibeauty Soap.",
      "Hello! 👋 Senang berkenalan! Kalau ada pertanyaan tentang Multibeauty Soap, silakan tanya ya!",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  if (lower.match(/(terima.?kasih|makasih|thanks|thank.*you)/)) {
    const thanks = [
      "Sama-sama! 😊 Senang bisa membantu. Kalau ada pertanyaan lain, jangan ragu tanya ya!",
      "Dengan senang hati! 💕 Jangan lupa order Multibeauty Soap ya!",
      "Sama-sama! 🙏 Semoga Multibeauty Soap bisa membantu kulit kamu!",
    ];
    return thanks[Math.floor(Math.random() * thanks.length)];
  }

  if (lower.match(/(manfaat|keuntungan|bagus|fungsi|apa.*aja|unggul)/)) {
    return `Multibeauty Soap punya 12 manfaat luar biasa! ✨\n\nYang paling populer:\n• Mencerahkan kulit kusam secara alami\n• Mengatasi jerawat dan bekasnya\n• Melembapkan kulit sampai dalam\n• Memudarkan flek hitam & noda\n• Anti-aging & melindungi dari radikal bebas\n\nSemua dari bahan 100% alami — Madu, Spirulina, dan Gamat! 🌿\n\nAda yang ingin kamu ketahui lebih lanjut?`;
  }

  if (lower.match(/(harga|berapa.*biaya|murah|mahal|promo|diskon|paket|hemat)/)) {
    return `Harga Multibeauty Soap sangat terjangkau dengan kualitas premium! 💎\n\n• Eceran: Rp 20.000 - Rp 35.000 (tergantung promo)\n• Paket Hemat: Mulai dari Rp 100.000 untuk 5 bar\n\nKami sering ada promo kejutan lho! Kamu bisa klik tombol **Hubungi via WhatsApp** di bawah untuk cek harga promo hari ini. 💸`;
  }

  if (lower.match(/(pakai|cara|guna|aplikasi|berapa.*kali)/)) {
    return `Cara pakai Multibeauty Soap gampang banget: ✨\n\n1. Basahi sabun dan tangan\n2. Busakan sampai melimpah\n3. Usapkan lembut ke wajah/tubuh\n4. Diamkan 1-2 menit agar nutrisi meresap\n5. Bilas sampai bersih\n\nGunakan 2-3 kali sehari untuk hasil maksimal! Mau coba sekarang?`;
  }

  if (lower.match(/(aman|bpom|bahaya|kimia|efek|sensitif|bumil|busui)/)) {
    return `Tenang saja! Multibeauty Soap 100% AMAN. ✅\n\n• Sudah BPOM Certified\n• Bahan Alami (Madu, Spirulina, Gamat)\n• Tanpa merkuri atau bahan kimia berbahaya\n• Aman untuk ibu hamil & menyusui\n• Cocok untuk semua jenis kulit, termasuk kulit sensitif\n\nAda kekhawatiran khusus tentang kulit kamu?`;
  }

  if (lower.match(/(beli|order|pesan|gimana|toko|shopee|lazada|tokopedia|ongkir|kirim)/)) {
    return `Wah, pilihan bagus! 😍 Kamu bisa pesan langsung melalui admin kami agar dapat harga terbaik dan konsultasi gratis.\n\nSilakan klik tombol **Hubungi via WhatsApp** di bawah ini ya. Kami siap melayani pengiriman ke seluruh Indonesia! 🚚💨`;
  }

  return `Maaf, saya belum paham pertanyaan itu. 😅\n\nTapi jangan khawatir, tim admin kami siap membantu kamu secara langsung! Silakan klik tombol **Hubungi via WhatsApp** di bawah untuk bicara dengan manusia. 🙏`;
}
