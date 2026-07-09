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

// Quick reply suggestions yang lebih natural
const QUICK_REPLIES = [
  "Apa manfaatnya?",
  "Berapa harganya?",
  "Bagaimana cara pakai?",
  "Aman untuk kulit sensitif?",
  "Mau order sekarang",
  "Ada promo?",
];

// Versi alternatif quick replies untuk variasi
const QUICK_REPLIES_ALT = [
  "Bisa untuk jerawat?",
  "Ada paket hemat?",
  "Pengiriman ke mana?",
  "Apa saja bahannya?",
  "Testimoni pelanggan",
  "Hubungi WhatsApp",
];

// ============================================================
// NORMALISASI NOMOR — sama dengan pola Fallback PPOB
// ============================================================
function normalizePhoneNumber(raw: string): string {
  // Bersihkan semua karakter non-digit
  const cleaned = raw.replace(/[^0-9]/g, "");
  
  // Konversi format lokal (08xx) ke internasional (628xx)
  if (cleaned.startsWith("0")) {
    return "62" + cleaned.slice(1);
  }
  
  // Jika sudah 62, langsung return
  if (cleaned.startsWith("62")) {
    return cleaned;
  }
  
  // Fallback: tambahkan 62
  return "62" + cleaned;
}

// ============================================================
// BUILD WA LINK — menggunakan api.whatsapp.com/send
// agar langsung buka chat tanpa perlu simpan kontak
// ============================================================
function buildWaLink(phoneNumber: string, message?: string): string {
  const phone = normalizePhoneNumber(phoneNumber);
  const text = message || "Halo, saya tertarik dengan produk Anda. Bisa bantu saya?";
  // api.whatsapp.com/send langsung membuka chat tanpa perlu simpan nomor
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
}

// ============================================================
// OPEN WHATSAPP — menggunakan window.location untuk lebih reliable
// ============================================================
function openWhatsAppDirect(phoneNumber: string, message?: string): void {
  const link = buildWaLink(phoneNumber, message);
  
  // Coba dengan window.open terlebih dahulu (lebih kompatibel)
  const win = window.open(link, "_blank", "noopener,noreferrer");
  
  // Jika popup blocker mencegah window.open, fallback ke location.assign
  if (!win || win.closed || typeof win.closed === "undefined") {
    // Fallback: redirect langsung
    window.location.href = link;
  }
}

// ============================================================
// FETCH WA NUMBER — menggunakan Edge Function untuk bypass RLS
// ============================================================
async function fetchAdminWaNumber(): Promise<string | null> {
  try {
    // Panggil Edge Function yang menggunakan service role
    const { data, error } = await supabase.functions.invoke("get-landing-settings", {
      method: "GET",
    });

    if (error) throw error;
    
    if (data?.admin_ppob_wa_number) {
      const number = String(data.admin_ppob_wa_number).replace(/[^0-9]/g, "");
      // Simpan ke localStorage untuk cache
      localStorage.setItem("admin_whatsapp_number", number);
      return number;
    }
  } catch (err) {
    console.error("Error fetching WA number from Edge Function:", err);
  }
  
  // Fallback: coba dari localStorage
  const stored = localStorage.getItem("admin_whatsapp_number");
  if (stored) return stored;
  
  return null;
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

  // Ambil nomor WhatsApp admin — mengikuti pola Fallback PPOB
  useEffect(() => {
    fetchAdminWaNumber().then(setAdminWaNumber);
  }, []);

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

  // Toggle quick replies setiap 2 conversation turn untuk variasi
  useEffect(() => {
    const userMessages = messages.filter(m => m.role === "user").length;
    setQuickReplyToggle(userMessages % 2);
  }, [messages]);

  const currentQuickReplies = quickReplyToggle === 0 ? QUICK_REPLIES : QUICK_REPLIES_ALT;

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue.trim();
    if (!textToSend) return;

    // Tambahkan pesan user
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
      // Panggil Edge Function untuk mendapatkan respons AI
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
      
      // Fallback: gunakan smart local response
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

  // Tombol WhatsApp handler — langsung buka chat ke admin
  const handleWhatsAppClick = useCallback(() => {
    if (adminWaNumber) {
      const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
      const context = lastUserMessage?.content || "";
      const waMessage = `Halo, saya tertarik dengan ${productName}. ${context ? `Saya ingin bertanya tentang: ${context}` : ""}`;
      
      openWhatsAppDirect(adminWaNumber, waMessage);
    } else {
      // Jika nomor belum tersedia, tampilkan pesan di chat
      const fallbackMsg: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Nomor WhatsApp admin belum dikonfigurasi. Silakan hubungi kami langsung atau coba lagi nanti. 🙏\n\nNomor WhatsApp akan aktif setelah admin mengkonfigurasi di halaman System Settings → "Fallback PPOB ke WhatsApp Admin".`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    }
  }, [adminWaNumber, messages, productName]);

  // Re-fetch nomor WA ketika chat dibuka (untuk catch update dari admin)
  const handleOpenChat = useCallback(() => {
    setIsOpen(true);
    fetchAdminWaNumber().then(setAdminWaNumber);
  }, []);

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-40">
        {/* Tombol WhatsApp Floating - selalu terlihat */}
        {adminWaNumber && (
          <button
            onClick={handleWhatsAppClick}
            className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300 p-4 bg-green-500 hover:bg-green-600 text-white animate-pulse hover:animate-none"
            title="Hubungi via WhatsApp"
          >
            <Phone className="w-6 h-6" />
          </button>
        )}

        {/* Tombol Chat AI */}
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
            onClose?.();
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
          disabled={!adminWaNumber}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
            adminWaNumber 
              ? "bg-green-500 hover:bg-green-600" 
              : "bg-gray-400 cursor-not-allowed"
          }`}
          title={adminWaNumber ? "Klik untuk langsung chat via WhatsApp" : "Nomor WhatsApp belum dikonfigurasi"}
        >
          <Phone className="w-4 h-4" />
          {adminWaNumber ? "Hubungi via WhatsApp" : "WhatsApp belum tersedia"}
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

  // Greeting
  if (lower.match(/^(halo|hai|hi|hello|hey|assalamu|selamat|pagi|siang|sore|malam|permisi)/)) {
    const greetings = [
      "Halo! 👋 Senang kamu bertanya! Saya asisten AI untuk Multibeauty Soap. Ada yang bisa saya bantu?",
      "Hai! 😊 Selamat datang! Saya siap membantu kamu dengan pertanyaan seputar Multibeauty Soap.",
      "Hello! 👋 Senang berkenalan! Kalau ada pertanyaan tentang Multibeauty Soap, silakan tanya ya!",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Terima kasih
  if (lower.match(/(terima.?kasih|makasih|thanks|thank.*you)/)) {
    const thanks = [
      "Sama-sama! 😊 Senang bisa membantu. Kalau ada pertanyaan lain, jangan ragu tanya ya!",
      "Dengan senang hati! 💕 Jangan lupa order Multibeauty Soap ya!",
      "Sama-sama! 🙏 Semoga Multibeauty Soap bisa membantu kulit kamu!",
    ];
    return thanks[Math.floor(Math.random() * thanks.length)];
  }

  // Manfaat
  if (lower.match(/(manfaat|keuntungan|bagus|fungsi|apa.*aja|unggul)/)) {
    return `Multibeauty Soap punya 12 manfaat luar biasa! ✨

Yang paling populer:
• Mencerahkan kulit kusam secara alami
• Mengatasi jerawat dan bekasnya
• Melembapkan kulit sampai dalam
• Memudarkan flek hitam & noda
• Anti-aging & melindungi dari radikal bebas

Semua dari bahan 100% alami — Madu, Spirulina, dan Gamat! 🌿

Ada yang ingin kamu ketahui lebih lanjut?`;
  }

  // Harga
  if (lower.match(/(harga|berapa.*biaya|murah|mahal|promo|diskon|paket|hemat)/)) {
    return `Harga Multibeauty Soap:

📦 Satuan: Rp 75.000 per bar (60g)
📦 Paket 6 pcs: Rp 450.000 (hemat Rp 75.000!)

Saran saya: ambil paket 6 pcs karena lebih hemat dan cukup buat 6 bulan. Tapi kalau mau coba dulu, beli 1 bar juga boleh kok! 😊

Mau order sekarang?`;
  }

  // Cara pakai
  if (lower.match(/(cara.*pakai|bagaimana.*guna|pemakaian|pakai.*berapa|dosis)/)) {
    return `Cara pakainya gampang banget! 😊

1. Basahi area yang mau dibersihkan
2. Buat busa dengan tangan atau spons
3. Usapkan ke wajah, rambut, atau tubuh
4. ⚡ **Diamkan 1-2 menit** — ini penting biar bahan aktifnya bekerja!
5. Bilas sampai bersih

Gunakan 2x sehari untuk hasil optimal. Setelah 1-2 minggu pemakaian rutin, kamu bakal ngerasain perbedaannya! 💫`;
  }

  // Bahan
  if (lower.match(/(bahan|kandungan|komposisi|ingredient|terbuat|madu|spirulina|gamat)/)) {
    return `Multibeauty Soap mengandung 3 bahan alami premium: 🌿

🍯 **Madu Murni** — pelembap alami kaya antioksidan
🌱 **Spirulina** — detoksifikasi kulit & anti-aging
🌊 **Gamat (Teripang)** — kolagen tinggi untuk regenerasi

Semua 100% alami, tanpa paraben, sulfat, atau pewarna sintetis. Sudah tersertifikasi BPOM! ✅`;
  }

  // Keamanan / BPOM
  if (lower.match(/(aman|efek.*samping|bahaya|bpom|alergi|hamil|ibu.*hamil)/)) {
    return `Keamanan produk kami terjamin! ✅

• Tersertifikasi BPOM
• Dermatologically tested
• 100% bahan alami — tanpa paraben, sulfat, pewarna sintetis

Aman untuk semua jenis kulit termasuk kulit sensitif, ibu hamil dan menyusui! 🌿`;
  }

  // Pemesanan
  if (lower.match(/(pesan|order|beli|mau.*beli|cara.*pesan|checkout)/)) {
    return `Cara pesan mudah banget! 🛒

1. Isi formulir pemesanan di bagian bawah halaman
2. Admin akan menghubungi via WhatsApp untuk konfirmasi
3. Lakukan pembayaran (Transfer, E-wallet, COD)
4. Produk dikirim ke alamat kamu! 📦

Pengiriman ke seluruh Indonesia. Mau order sekarang?`;
  }

  // Jerawat
  if (lower.match(/(jerawat|bruntusan|komedo|kulit.*berminyak)/)) {
    return `Untuk jerawat, Multibeauty Soap sangat cocok! 🌿

Bahan Madu dan Spirulina punya sifat antibakteri yang bisa mengurangi jerawat, memudarkan bekasnya, dan mencegah tumbuhnya jerawat baru. Coba gunakan 2x sehari dan diamkan 1-2 menit sebelum dibilas. Banyak pelanggan mulai lihat hasil dalam 1-2 minggu! 💫`;
  }

  // Kusam / flek
  if (lower.match(/(kusam|gelap|flek.*hitam|noda|tidak.*merata)/)) {
    return `Untuk kulit kusam atau flek hitam, Multibeauty Soap adalah solusi yang tepat! 💕

Madu murni melembapkan alami, sementara Spirulina membantu mencerahkan dan mendetoksifikasi. Hasilnya kulit lebih cerah dan merata! Coba gunakan 2x sehari ya. ✨`;
  }

  // Anti-aging
  if (lower.match(/(usia|anti.*aging|kerutan|keriput|kencang)/)) {
    return `Multibeauty Soap cocok untuk semua usia! 👨‍👩‍👧‍👦

Untuk anti-aging, bahan Gamat (Teripang) mengandung kolagen tinggi dan CGF yang membantu meningkatkan elastisitas kulit, mengurangi tanda penuaan, dan meregenerasi sel kulit. ✨`;
  }

  // Bye
  if (lower.match(/(bye|dadah|sampai.*jumpa|goodbye)/)) {
    return `Dadah! 👋 Semoga hari kamu menyenangkan! Jangan lupa order Multibeauty Soap ya! 😊✨`;
  }

  // Default natural response
  return `Pertanyaan menarik! 😊 Saya spesialis di Multibeauty Soap, jadi saya bisa bantu kamu dengan informasi seputar:

• **Manfaat produk** — 12 manfaat untuk kulit sehat
• **Harga & promo** — termasuk paket hemat
• **Cara pakai** — langkah-langkah mudah
• **Bahan** — komposisi alami yang aman
• **Keamanan** — BPOM certified
• **Cara pesan** — proses mudah via WhatsApp

Mau tahu lebih detail tentang salah satu topik di atas? Atau kamu bisa langsung klik tombol **Hubungi via WhatsApp** di bawah untuk chat langsung dengan tim kami! 💬`;
}
