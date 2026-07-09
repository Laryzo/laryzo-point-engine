import { useState, useRef, useEffect } from "react";
import { Send, X, MessageCircle, Loader2, ChevronRight } from "lucide-react";
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

// Enhanced fallback responses dengan informasi lebih lengkap
const FALLBACK_RESPONSES: { [key: string]: string } = {
  manfaat: `Multibeauty Soap memiliki 12 manfaat luar biasa untuk kulit Anda:

🌿 **Manfaat Utama:**
✨ Mencerahkan kulit kusam secara alami
🧴 Melembapkan kulit secara mendalam
🔥 Mengatasi jerawat dan bekas jerawat
💫 Memudarkan flek hitam dan noda di kulit
🛡️ Melindungi dari radikal bebas (antioksidan)

🌊 **Manfaat Tambahan:**
💪 Meningkatkan elastisitas kulit
🧖 Eksfoliasi lembut untuk kulit halus
⚡ Mempercepat penyembuhan luka ringan
🔄 Mendukung regenerasi sel kulit
😌 Mengurangi peradangan dan iritasi
🌸 Memberikan sensasi relaksasi
💨 Mengurangi bau badan

Semua manfaat ini bekerja sinergis berkat kombinasi Madu, Spirulina, dan Gamat!`,

  cara: `Cara menggunakan Multibeauty Soap untuk hasil optimal:

**Langkah-Langkah:**
1️⃣ Basahi area yang ingin dibersihkan dengan air
2️⃣ Ambil sabun dan buat busa dengan tangan atau spons
3️⃣ Usapkan ke wajah, rambut, atau tubuh secara merata
4️⃣ **Diamkan selama 1-2 menit** agar bahan aktif bekerja maksimal
5️⃣ Bilas hingga bersih dengan air mengalir

**Rekomendasi Penggunaan:**
• Gunakan 2x sehari (pagi & malam) untuk hasil optimal
• Cocok untuk semua jenis kulit
• Aman untuk ibu hamil dan menyusui
• Bisa digunakan untuk wajah, tubuh, dan rambut

**Tips:**
Jangan terburu-buru! Biarkan sabun bekerja selama 1-2 menit agar nutrisi meresap sempurna.`,

  harga: `Harga Multibeauty Soap:

💰 **Harga Satuan:**
Rp 75.000 per bar (60g)

💰 **Paket Hemat:**
Rp 450.000 untuk paket 6 pcs
(Hemat Rp 75.000 dibanding beli satuan!)

📦 **Keuntungan Paket 6 pcs:**
✓ Cukup untuk 6 bulan perawatan
✓ Lebih hemat per bar
✓ Stok terjamin
✓ Cocok untuk hadiah

Harga dapat berubah sesuai promosi. Tanyakan promo terbaru kami!`,

  bahan: `Bahan-bahan Utama Multibeauty Soap:

🍯 **MADU MURNI (Honey)**
• Pelembap alami yang kaya antioksidan
• Sifat antibakteri untuk mencegah jerawat
• Mempercepat penyembuhan luka
• Memberikan nutrisi mendalam pada kulit

🌿 **SPIRULINA**
• Detoksifikasi kulit dari dalam
• Melawan radikal bebas (anti-aging)
• Mencerahkan kulit secara alami
• Kaya nutrisi dan mineral

🌊 **GAMAT (Teripang/Sea Cucumber)**
• Kolagen tinggi untuk elastisitas kulit
• Cell Growth Factor (CGF) untuk regenerasi
• Menyembuhkan luka dan bekas jerawat
• Memperkuat struktur kulit

✅ **Sertifikasi & Keamanan:**
• Semua bahan 100% alami
• Tanpa kimia berbahaya
• Telah tersertifikasi BPOM
• Dermatologically tested
• Aman untuk semua jenis kulit`,

  pesan: `Cara Memesan Multibeauty Soap:

**Proses Pemesanan:**
1️⃣ Isi formulir pemesanan di bagian bawah halaman
2️⃣ Admin kami akan menghubungi via WhatsApp untuk konfirmasi
3️⃣ Lakukan pembayaran sesuai instruksi
4️⃣ Produk dikirim ke alamat Anda

⏱️ **Estimasi Pengiriman:**
• Proses cepat dan mudah
• Pengiriman ke seluruh Indonesia
• Kemasan aman dan rapi

💳 **Metode Pembayaran:**
• Transfer Bank
• E-wallet
• COD (untuk area tertentu)

📞 **Hubungi Kami:**
Klik tombol WhatsApp di bawah atau hubungi langsung untuk pertanyaan lebih lanjut!`,

  testimoni: `Testimoni Pelanggan Multibeauty Soap:

⭐⭐⭐⭐⭐ "Kulit saya jadi lebih cerah setelah 2 minggu pemakaian!"
- Siti, Jakarta

⭐⭐⭐⭐⭐ "Jerawat saya berkurang drastis, terima kasih Multibeauty!"
- Budi, Surabaya

⭐⭐⭐⭐⭐ "Luka bakar saya cepat sembuh berkat sabun ini!"
- Ibu Rina, Bandung

⭐⭐⭐⭐⭐ "Aman untuk kulit sensitif saya, sangat merekomendasikan!"
- Dewi, Medan

Ribuan pelanggan puas telah merasakan manfaatnya. Jadilah bagian dari komunitas Multibeauty!`,

  aman: `Keamanan & Sertifikasi Multibeauty Soap:

✅ **Sertifikasi Resmi:**
• BPOM (Badan Pengawas Obat dan Makanan)
• Dermatologically tested
• Hypoallergenic formula

✅ **Aman Untuk:**
• Semua jenis kulit
• Kulit sensitif
• Ibu hamil dan menyusui
• Bayi dan anak-anak (konsultasi dokter)

✅ **Tidak Mengandung:**
• Bahan kimia berbahaya
• Paraben
• Sulfat
• Pewarna sintetis

⚠️ **Catatan Penting:**
• Jika ada reaksi alergi, hentikan penggunaan
• Lakukan patch test terlebih dahulu jika kulit sangat sensitif
• Konsultasikan dengan dokter jika ada kondisi kulit khusus

Keamanan Anda adalah prioritas kami!`,

  default: `Maaf, saya tidak bisa menjawab pertanyaan itu dengan sempurna. 

Saya bisa membantu Anda dengan:
• **Manfaat** - Apa saja keuntungan Multibeauty Soap?
• **Cara Pakai** - Bagaimana cara menggunakan produk?
• **Harga** - Berapa harga dan paket yang tersedia?
• **Bahan** - Apa saja kandungan produk?
• **Pesan** - Bagaimana cara memesan?
• **Testimoni** - Apa kata pelanggan kami?
• **Aman** - Apakah produk aman?

Silakan tanyakan salah satu topik di atas atau hubungi kami melalui WhatsApp untuk bantuan lebih lanjut! 😊`
};

// Enhanced keyword matching dengan lebih banyak variasi
function getKeywordMatch(text: string): string | null {
  const lower = text.toLowerCase();
  
  // Manfaat
  if (lower.includes("manfaat") || lower.includes("keuntungan") || lower.includes("apa saja") || 
      lower.includes("bagus") || lower.includes("fungsi") || lower.includes("guna")) return "manfaat";
  
  // Cara pakai
  if (lower.includes("cara") || lower.includes("pakai") || lower.includes("gunakan") || 
      lower.includes("penggunaan") || lower.includes("bagaimana") || lower.includes("pemakaian")) return "cara";
  
  // Harga
  if (lower.includes("harga") || lower.includes("berapa") || lower.includes("biaya") || 
      lower.includes("cost") || lower.includes("paket") || lower.includes("promo")) return "harga";
  
  // Bahan
  if (lower.includes("bahan") || lower.includes("kandungan") || lower.includes("ingredient") || 
      lower.includes("komposisi") || lower.includes("apa isi")) return "bahan";
  
  // Pemesanan
  if (lower.includes("pesan") || lower.includes("order") || lower.includes("beli") || 
      lower.includes("membeli") || lower.includes("bagaimana pesan") || lower.includes("mau beli")) return "pesan";
  
  // Testimoni
  if (lower.includes("testimoni") || lower.includes("review") || lower.includes("ulasan") || 
      lower.includes("pengalaman") || lower.includes("kata") || lower.includes("hasil")) return "testimoni";
  
  // Keamanan
  if (lower.includes("aman") || lower.includes("efek samping") || lower.includes("bahaya") || 
      lower.includes("sertifikat") || lower.includes("bpom") || lower.includes("alergi")) return "aman";
  
  return null;
}

// Quick reply suggestions
const QUICK_REPLIES = [
  "Apa manfaatnya?",
  "Berapa harganya?",
  "Bagaimana cara pakai?",
  "Apa saja bahannya?",
  "Mau pesan sekarang"
];

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
      content: `Halo! 👋 Saya adalah asisten AI untuk ${productName}. Ada yang bisa saya bantu?\n\nTanyakan tentang manfaat, cara pakai, harga, bahan, atau cara pemesanan!`,
      timestamp: new Date(),
      quickReplies: QUICK_REPLIES,
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      // Coba panggil Edge Function untuk mendapatkan respons AI
      const { data, error } = await supabase.functions.invoke("chat-multibeauty", {
        body: {
          message: userMessage.content,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (error || !data?.message) {
        // Jika ada error atau tidak ada response, gunakan fallback
        throw new Error(error?.message || "No response from AI");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        quickReplies: QUICK_REPLIES,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      
      // Gunakan fallback response berdasarkan keyword
      const keyword = getKeywordMatch(userMessage.content);
      const fallbackResponse = keyword 
        ? FALLBACK_RESPONSES[keyword] 
        : FALLBACK_RESPONSES.default;

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fallbackResponse,
        timestamp: new Date(),
        quickReplies: QUICK_REPLIES,
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 p-4 z-40 text-white animate-pulse hover:animate-none"
        style={{ backgroundColor: primaryColor }}
        title="Chat dengan AI Asisten"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
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

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
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
      </div>
    </div>
  );
}
