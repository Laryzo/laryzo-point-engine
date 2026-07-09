import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, MessageCircle, Loader2, ChevronRight, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

async function fetchAdminWaNumber(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("get-landing-settings");
    if (error) throw error;
    if (data?.admin_ppob_wa_number) {
      const number = String(data.admin_ppob_wa_number).replace(/[^0-9]/g, "");
      localStorage.setItem("admin_whatsapp_number", number);
      return number;
    }
  } catch (err) {
    console.error("Error fetching WA number:", err);
  }
  return localStorage.getItem("admin_whatsapp_number");
}

export default function ChatAssistant({
  primaryColor = "#059669",
  productName = "Multibeauty Soap",
  onClose,
}: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Halo! 👋 Saya adalah asisten AI untuk ${productName}. Ada yang bisa saya bantu?\n\nTanyakan tentang manfaat, cara pakai, harga, bahan, keamanan, atau cara pemesanan!`,
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

  useEffect(() => {
    fetchAdminWaNumber().then(setAdminWaNumber);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
        },
      });

      if (error || !data?.message) throw new Error(error?.message || "No response");

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
      const waMessage = `Halo, saya tertarik dengan ${productName}. ${context ? `Saya ingin bertanya tentang: ${context}` : ""}`;
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
  }, [adminWaNumber, messages, productName]);

  const handleOpenChat = useCallback(() => {
    setIsOpen(true);
    fetchAdminWaNumber().then(setAdminWaNumber);
  }, []);

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-40">
        {adminWaNumber && (
          <button
            onClick={handleWhatsAppClick}
            className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300 p-4 bg-green-500 hover:bg-green-600 text-white animate-pulse hover:animate-none"
          >
            <Phone className="w-6 h-6" />
          </button>
        )}
        <button
          onClick={handleOpenChat}
          className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300 p-4 text-white animate-pulse hover:animate-none"
          style={{ backgroundColor: primaryColor }}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-24px)] rounded-2xl shadow-2xl flex flex-col bg-white z-50 overflow-hidden">
      <div className="p-4 text-white flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <div>
            <h3 className="font-semibold text-sm">{productName}</h3>
            <p className="text-xs opacity-90">AI Asisten</p>
          </div>
        </div>
        <button onClick={() => { setIsOpen(false); onClose?.(); }} className="hover:bg-white/20 p-1 rounded transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96 bg-gray-50">
        {messages.map((message) => (
          <div key={message.id}>
            <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs px-4 py-2 rounded-lg text-sm whitespace-pre-wrap ${message.role === "user" ? "text-white rounded-br-none" : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"}`}
                style={message.role === "user" ? { backgroundColor: primaryColor } : {}}
              >
                {message.content}
              </div>
            </div>
            {message.role === "assistant" && message.quickReplies && (
              <div className="flex flex-wrap gap-2 mt-2 ml-0">
                {message.quickReplies.map((reply, idx) => (
                  <button key={idx} onClick={() => handleSendMessage(reply)} disabled={isLoading} className="text-xs px-3 py-1 rounded-full border transition-all hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1" style={{ borderColor: primaryColor, color: primaryColor }}>
                    {reply} <ChevronRight className="w-3 h-3" />
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

      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2 mb-2">
          <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={handleKeyPress} placeholder="Tanya sesuatu..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-0" style={{ "--tw-ring-color": primaryColor } as any} disabled={isLoading} />
          <button onClick={() => handleSendMessage()} disabled={isLoading || !inputValue.trim()} className="p-2 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
            <Send className="w-5 h-5" />
          </button>
        </div>
        <button onClick={handleWhatsAppClick} disabled={!adminWaNumber} className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${adminWaNumber ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 cursor-not-allowed"}`}>
          <Phone className="w-4 h-4" /> {adminWaNumber ? "Hubungi via WhatsApp" : "WhatsApp belum tersedia"}
        </button>
      </div>
    </div>
  );
}

function generateSmartFallback(message: string): string {
  const lower = message.toLowerCase().trim();
  if (lower.match(/^(halo|hai|hi|hello|hey|assalamu|selamat|pagi|siang|sore|malam|permisi)/)) {
    return "Halo! 👋 Ada yang bisa saya bantu tentang Multibeauty Soap?";
  }
  if (lower.match(/(terima.?kasih|makasih|thanks|thank.*you)/)) {
    return "Sama-sama! 😊 Senang bisa membantu.";
  }
  return "Pertanyaan menarik! 😊 Silakan tanya tentang manfaat, harga, atau cara pesan Multibeauty Soap. Atau klik tombol WhatsApp di bawah untuk chat langsung dengan tim kami! 💬";
}
