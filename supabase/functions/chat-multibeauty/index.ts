import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OpenAI } from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Fallback responses untuk ketika OpenAI tidak tersedia
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

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();

    // Validasi input
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cek apakah ada OpenAI API key
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.warn("OpenAI API key not configured, using fallback response");
      const keyword = getKeywordMatch(message);
      const fallbackMessage = keyword 
        ? FALLBACK_RESPONSES[keyword] 
        : FALLBACK_RESPONSES.default;
      
      return new Response(JSON.stringify({ message: fallbackMessage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const systemPrompt = `
      Anda adalah asisten AI resmi untuk Multibeauty Soap.
      Tugas Anda adalah membantu calon pembeli memahami produk dan melakukan pemesanan.

      INFORMASI PRODUK:
      - Nama: Multibeauty Soap
      - Kandungan Utama: Madu (Honey), Gamat (Teripang), Spirulina.
      - Manfaat: Mencerahkan kulit secara alami, mengatasi jerawat, memudarkan flek hitam, mengecilkan pori-pori, dan menutrisi kulit.
      - Cara Pakai: Basahi sabun, buat busa, usapkan ke wajah/tubuh, diamkan 1-2 menit, bilas hingga bersih.
      - Harga: Rp 75.000 per bar (sesuaikan dengan promosi di landing page).
      - Keunggulan: Alami, BPOM, aman untuk ibu hamil dan menyusui.

      GAYA KOMUNIKASI:
      - Ramah, sopan, dan membantu.
      - Gunakan bahasa Indonesia yang santai tapi profesional.
      - Berikan jawaban yang singkat dan jelas.
      - Jika pengguna ingin membeli, arahkan mereka untuk mengisi formulir pemesanan di bagian bawah halaman.

      BATASAN:
      - Jangan memberikan saran medis profesional.
      - Jangan menjanjikan hasil instan (hasil bervariasi).
      - Fokus hanya pada produk Multibeauty.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...(conversationHistory || []),
        { role: "user", content: message },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiMessage = response.choices[0].message.content;

    if (!aiMessage) {
      throw new Error("Empty response from OpenAI");
    }

    return new Response(JSON.stringify({ message: aiMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in chat function:", error);
    
    // Jika terjadi error, coba gunakan fallback response
    try {
      const { message } = await req.json();
      const keyword = getKeywordMatch(message);
      const fallbackMessage = keyword 
        ? FALLBACK_RESPONSES[keyword] 
        : FALLBACK_RESPONSES.default;
      
      return new Response(JSON.stringify({ message: fallbackMessage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (_) {
      return new Response(JSON.stringify({ 
        error: "Service temporarily unavailable. Please try again or contact us via WhatsApp." 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
});
