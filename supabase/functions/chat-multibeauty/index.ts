import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OpenAI } from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
      Anda adalah asisten AI resmi untuk Multibeauty Soap - produk perawatan kulit premium alami.
      Tugas Anda adalah membantu calon pembeli memahami produk dengan detail dan mendorong pemesanan.

      INFORMASI PRODUK LENGKAP:
      - Nama: Multibeauty Soap
      - Ukuran: 60g per bar
      - Kandungan Utama: Madu Murni, Gamat (Teripang), Spirulina
      
      MANFAAT (12 Manfaat Utama):
      1. Mencerahkan kulit kusam secara alami
      2. Melembapkan kulit secara mendalam
      3. Mengatasi jerawat dan bekas jerawat
      4. Memudarkan flek hitam dan noda di kulit
      5. Melindungi dari radikal bebas (antioksidan)
      6. Meningkatkan elastisitas kulit
      7. Eksfoliasi lembut untuk kulit halus
      8. Mempercepat penyembuhan luka ringan
      9. Mendukung regenerasi sel kulit
      10. Mengurangi peradangan dan iritasi
      11. Memberikan sensasi relaksasi
      12. Mengurangi bau badan
      
      CARA PAKAI:
      1. Basahi area yang ingin dibersihkan
      2. Buat busa dengan tangan atau spons
      3. Usapkan ke wajah, rambut, atau tubuh
      4. Diamkan 1-2 menit agar bahan aktif bekerja
      5. Bilas hingga bersih
      Gunakan 2x sehari untuk hasil optimal.
      
      HARGA:
      - Satuan: Rp 75.000 per bar
      - Paket 6 pcs: Rp 450.000 (lebih hemat)
      
      KEAMANAN & SERTIFIKASI:
      - BPOM tersertifikasi
      - Dermatologically tested
      - Aman untuk semua jenis kulit
      - Aman untuk ibu hamil dan menyusui
      - 100% bahan alami, tanpa kimia berbahaya

      GAYA KOMUNIKASI:
      - Ramah, sopan, dan sangat membantu
      - Gunakan bahasa Indonesia santai tapi profesional
      - Berikan jawaban yang singkat, jelas, dan informatif
      - Gunakan emoji untuk membuat percakapan lebih menarik
      - Jika pengguna ingin membeli, arahkan mereka untuk mengisi formulir pemesanan
      - Berikan rekomendasi berdasarkan pertanyaan mereka
      - Jangan ragu untuk menyarankan paket hemat jika relevan

      BATASAN:
      - Jangan memberikan saran medis profesional
      - Jangan menjanjikan hasil instan (hasil bervariasi antar individu)
      - Fokus hanya pada produk Multibeauty Soap
      - Jika ada pertanyaan di luar scope, arahkan ke WhatsApp customer service

      STRATEGI PENJUALAN:
      - Dengarkan kebutuhan pelanggan dengan baik
      - Rekomendasikan manfaat yang paling relevan dengan masalah kulit mereka
      - Highlight keamanan dan sertifikasi BPOM
      - Tawarkan paket hemat untuk pembelian dalam jumlah besar
      - Akhiri dengan ajakan untuk memesan atau hubungi via WhatsApp
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...(conversationHistory || []),
        { role: "user", content: message },
      ],
      max_tokens: 600,
      temperature: 0.8,
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
