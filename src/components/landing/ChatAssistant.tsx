import { useState, useRef, useEffect } from "react";
import { Send, X, MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatAssistantProps {
  primaryColor?: string;
  productName?: string;
  onClose?: () => void;
}

// Fallback responses untuk ketika AI tidak tersedia
const FALLBACK_RESPONSES: { [key: string]: string } = {
  manfaat: "Multibeauty Soap memiliki banyak manfaat luar biasa:\n\n🌿 Mengatasi jerawat dan bekas jerawat\n✨ Memudarkan flek hitam dan noda di kulit\n💫 Mencerahkan kulit kusam secara alami\n🧴 Menghaluskan kulit kasar dan kering\n🔥 Meredakan gatal-gatal dan masalah kulit lainnya\n⚡ Mempercepat penyembuhan luka ringan\n\nSabun ini mengandung Madu, Spirulina, dan Gamat yang bekerja sinergis untuk hasil maksimal.",
  cara: "Cara menggunakan Multibeauty Soap sangat mudah:\n\n1️⃣ Basahi area yang ingin dibersihkan dengan air\n2️⃣ Ambil sabun dan buat busa dengan tangan atau spons\n3️⃣ Usapkan ke wajah, rambut, atau tubuh secara merata\n4️⃣ Diamkan selama 1-2 menit agar bahan aktif bekerja\n5️⃣ Bilas hingga bersih dengan air mengalir\n\nGunakan 2x sehari untuk hasil optimal. Aman untuk semua jenis kulit dan dapat digunakan oleh ibu hamil dan menyusui.",
  harga: "Harga Multibeauty Soap:\n\n💰 Rp 75.000 per bar (satuan)\n💰 Rp 450.000 untuk paket hemat (6 pcs)\n\nDengan paket 6 pcs, Anda hanya membayar Rp 75.000 per bulan untuk perawatan lengkap selama 6 bulan. Sangat hemat dibanding membeli produk perawatan terpisah!",
  bahan: "Bahan-bahan utama Multibeauty Soap:\n\n🍯 Madu Murni - Pelembap alami, kaya antioksidan, antibakteri\n🌿 Spirulina - Detoksifikasi, melawan radikal bebas, mencerahkan\n🌊 Gamat (Teripang) - Kolagen tinggi, Cell Growth Factor, menyembuhkan luka\n\nSemua bahan alami, tanpa kimia berbahaya, dan telah tersertifikasi BPOM.",
  pesan: "Untuk memesan Multibeauty Soap, Anda dapat:\n\n1. Mengisi formulir pemesanan di bagian bawah halaman ini\n2. Admin kami akan menghubungi Anda via WhatsApp untuk konfirmasi\n3. Lakukan pembayaran sesuai instruksi\n4. Produk akan dikirim ke alamat Anda\n\nProses cepat dan mudah! Ada yang ingin ditanyakan lebih lanjut?",
  default: "Maaf, saya tidak bisa menjawab pertanyaan itu dengan sempurna. Silakan hubungi kami melalui WhatsApp untuk bantuan lebih lanjut atau tanyakan tentang manfaat, cara pakai, harga, atau cara memesan Multibeauty Soap."
};

function getKeywordMatch(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("manfaat") || lower.includes("keuntungan") || lower.includes("apa saja")) return "manfaat";
  if (lower.includes("cara") || lower.includes("pakai") || lower.includes("gunakan") || lower.includes("penggunaan")) return "cara";
  if (lower.includes("harga") || lower.includes("berapa") || lower.includes("biaya") || lower.includes("cost")) return "harga";
  if (lower.includes("bahan") || lower.includes("kandungan") || lower.includes("ingredient")) return "bahan";
  if (lower.includes("pesan") || lower.includes("order") || lower.includes("beli") || lower.includes("membeli")) return "pesan";
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
      content: `Halo! 👋 Saya adalah asisten AI untuk ${productName}. Ada yang bisa saya bantu? Tanyakan tentang manfaat produk, kandungan, harga, atau cara pemesanan.`,
      timestamp: new Date(),
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

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Tambahkan pesan user
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
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
        className="fixed bottom-6 right-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 p-4 z-40 text-white"
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
          <div
            key={message.id}
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
            onClick={handleSendMessage}
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
