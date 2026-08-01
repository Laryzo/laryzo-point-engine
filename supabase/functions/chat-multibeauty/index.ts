import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// PRODUK DATA — sumber kebenaran untuk jawaban AI
// ============================================================
const PRODUCT_DATA = {
  name: "Multibeauty Soap",
  size: "60g per bar",
  price: { single: 75000, package6: 450000 },
  ingredients: {
    madu: "Madu Murni — pelembap alami kaya antioksidan, antibakteri, mempercepat penyembuhan luka",
    spirulina: "Spirulina — detoksifikasi kulit, anti-aging, mencerahkan, kaya mineral",
    gamat: "Gamat (Teripang) — kolagen tinggi, CGF untuk regenerasi, menyembuhkan luka dan bekas jerawat",
  },
  benefits: [
    "Mencerahkan kulit kusam secara alami",
    "Melembapkan kulit secara mendalam",
    "Mengatasi jerawat dan bekas jerawat",
    "Memudarkan flek hitam dan noda",
    "Melindungi dari radikal bebas (antioksidan)",
    "Meningkatkan elastisitas kulit",
    "Eksfoliasi lembut untuk kulit halus",
    "Mempercepat penyembuhan luka ringan",
    "Mendukung regenerasi sel kulit",
    "Mengurangi peradangan dan iritasi",
    "Memberikan sensasi relaksasi",
    "Mengurangi bau badan",
  ],
  howToUse: `Basahi area yang ingin dibersihkan → Buat busa → Usapkan ke wajah/tubuh → Diamkan 1-2 menit → Bilas. Gunakan 2x sehari (pagi & malam).`,
  certification: "BPOM tersertifikasi, Dermatologically tested, Hypoallergenic, 100% bahan alami, tanpa paraben/sulfat/pewarna sintetis",
  safeFor: "Semua jenis kulit termasuk kulit sensitif, ibu hamil & menyusui (konsultasi dokter untuk bayi/anak)",
  paymentMethods: "Transfer Bank, E-wallet, COD (area tertentu)",
  shipping: "Pengiriman ke seluruh Indonesia, kemasan aman dan rapi",
  testimonials: [
    "Kulit saya jadi lebih cerah setelah 2 minggu pemakaian! — Siti, Jakarta",
    "Jerawat saya berkurang drastis, terima kasih Multibeauty! — Budi, Surabaya",
    "Luka bakar saya cepat sembuh berkat sabun ini! — Ibu Rina, Bandung",
    "Aman untuk kulit sensitif saya, sangat merekomendasikan! — Dewi, Medan",
  ],
};

// ============================================================
// SYSTEM PROMPT — dibuat sangat detail agar AI natural
// ============================================================
function buildSystemPrompt(): string {
  return `
Kamu adalah asisten AI ramah dan informatif untuk ${PRODUCT_DATA.name}. 
Kamu adalah AI asisten virtual yang bisa menjawab pertanyaan apa saja tentang produk ini dengan gaya percakapan natural seperti manusia.

INFORMASI PRODUK LENGKAP:
- Nama: ${PRODUCT_DATA.name}
- Ukuran: ${PRODUCT_DATA.size}
- Harga: Rp ${PRODUCT_DATA.price.single.toLocaleString('id-ID')} per bar, Paket 6 pcs Rp ${PRODUCT_DATA.price.package6.toLocaleString('id-ID')}
- Kandungan: ${Object.entries(PRODUCT_DATA.ingredients).map(([k, v]) => `${k}: ${v}`).join('; ')}
- 12 Manfaat: ${PRODUCT_DATA.benefits.join('; ')}
- Cara Pakai: ${PRODUCT_DATA.howToUse}
- Sertifikasi: ${PRODUCT_DATA.certification}
- Aman untuk: ${PRODUCT_DATA.safeFor}
- Pembayaran: ${PRODUCT_DATA.paymentMethods}
- Pengiriman: ${PRODUCT_DATA.shipping}
- Testimoni: ${PRODUCT_DATA.testimonials.join('; ')}

GAYA KOMUNIKASI:
- Jawab dengan bahasa Indonesia yang santai, ramah, dan natural seperti chatting dengan teman
- Gunakan emoji secukupnya untuk membuat percakapan hangat
- Beri jawaban yang jelas, informatif, dan tidak terlalu panjang
- Jika pertanyaan tidak terkait produk, tetap jawab dengan ramah dan arahkan ke topik produk
- Bisa memberikan rekomendasi berdasarkan kebutuhan pelanggan
- Gunakan variasi jawaban, jangan kaku atau repetitif
- Jika pelanggan ingin membeli, arahkan ke formulir pemesanan atau WhatsApp

BATASAN:
- Jangan memberikan saran medis profesional
- Jangan menjanjikan hasil instan
- Fokus pada produk ${PRODUCT_DATA.name}
`;
}

// ============================================================
// QA FALLBACK MATCHER — cocokkan dengan qaItems dari landing settings
// ============================================================
function matchQACategory(message: string, qaItems: any[] = []): string | null {
  const lower = message.toLowerCase();
  
  for (const category of qaItems) {
    if (!category.keywords || category.keywords.length === 0) continue;
    
    for (const keyword of category.keywords) {
      if (!keyword) continue;
      // Split by comma and check each keyword variant
      const keywordVariants = keyword.split(',').map((k) => k.trim().toLowerCase());
      for (const variant of keywordVariants) {
        if (variant && lower.includes(variant)) {
          return category.id;
        }
      }
    }
  }
  
  return null;
}

function getRandomAnswer(categoryId: string, qaItems: any[] = []): string | null {
  const category = qaItems.find((cat) => cat.id === categoryId);
  if (!category || !category.answers || category.answers.length === 0) {
    return null;
  }
  return category.answers[Math.floor(Math.random() * category.answers.length)];
}

// ============================================================
// FALLBACK RESPONSE GENERATOR — lebih natural dan dinamis
// ============================================================
function generateFallbackResponse(message: string, qaItems: any[] = []): string {
  // Try to match with QA categories first
  const matchedCategoryId = matchQACategory(message, qaItems);
  if (matchedCategoryId) {
    const answer = getRandomAnswer(matchedCategoryId, qaItems);
    if (answer) {
      return answer;
    }
  }

  const lower = message.toLowerCase();

  // --- Topik: Manfaat / kebaikan produk ---
  if (lower.match(/(manfaat|keuntungan|bagus|fungsi|manfaat.*kulit|apa.*aja|siapa.*yang.*cocok|rekomendasi)/)) {
    const style = Math.random();
    if (style < 0.33) {
      return `Wah, Multibeauty Soap punya banyak banget manfaat yang bikin kulit kamu makin sehat dan glowing! ✨

Yang paling populer itu:
• Mencerahkan kulit kusam secara alami
• Mengatasi jerawat dan bekasnya
• Melembapkan kulit sampai dalam

Dan masih ada 9 manfaat lainnya termasuk eksfoliasi lembut, anti-aging, dan melindungi dari radikal bebas. Semua ini dari bahan alami ya — Madu, Spirulina, dan Gamat! 🌿

Mau tahu detail salah satunya?`;
    } else if (style < 0.66) {
      return `Multibeauty Soap ini bisa dibilang all-in-one sih! 😊 Ada 12 manfaat yang bisa kamu rasakan:

Dari yang dasar kayak melembapkan & mencerahkan, sampai yang spesifik kayak mengatasi jerawat, memudarkan flek hitam, dan bahkan mengurangi bau badan.

Yang paling keren, semua manfaat ini berasal dari bahan 100% alami tanpa kimia berbahaya. Kulit kamu bakal terasa perbedaannya dalam 1-2 minggu pemakaian rutin! 💫

Ada yang ingin kamu ketahui lebih lanjut?`;
    } else {
      return `Oke, ini nih kenapa Multibeauty Soap jadi favorit banyak orang! 💕

12 manfaat utamanya meliputi:
🌟 Mencerahkan & melembapkan kulit
🌟 Mengatasi jerawat & bekasnya
🌟 Memudarkan flek hitam
🌟 Anti-aging & eksfoliasi lembut
🌟 Meningkatkan elastisitas kulit
🌟 Mempercepat penyembuhan luka
🌟 Mengurangi peradangan & iritasi
🌟 Memberikan sensasi relaksasi
🌟 Mengurangi bau badan

Semua dari Madu, Spirulina, dan Gamat — tanpa paraben, sulfat, atau pewarna sintetis! 🍯🌿🌊

Kamu punya masalah kulit tertentu? Saya bisa rekomendasiin yang paling cocok untuk kamu.`;
    }
  }

  // --- Topik: Harga / biaya ---
  if (lower.match(/(harga|berapa.*biaya|harga.*berapa|cost|murah|mahal|promo|diskon|paket|hemat)/)) {
    const style = Math.random();
    if (style < 0.33) {
      return `Untuk harga Multibeauty Soap:

📦 Satuan: Rp 75.000 per bar (60g)
📦 Paket 6 pcs: Rp 450.000

Kalau beli paket 6 pcs, kamu hemat Rp 75.000 dibanding beli satuan! Plus cukup buat 6 bulan perawatan. 🎉

Harga bisa berubah sesuai promo ya. Ada promo menarik yang sedang berlangsung, mau tahu?`;
    } else if (style < 0.66) {
      return `Harganya terjangkau banget untuk kualitas premium! 💰

• 1 bar (60g): Rp 75.000
• Paket 6 pcs: Rp 450.000 (hemat Rp 75.000!)

Saran saya: ambil paket 6 pcs karena lebih hemat per bar, cukup untuk 6 bulan, dan bisa jadi hadiah juga. Tapi kalau mau coba dulu, beli 1 bar dulu juga boleh kok! 😊

Lagi ada promo menarik nih, mau saya jelaskan?`;
    } else {
      return `Harga Multibeauty Soap:

1 pcs = Rp 75.000
6 pcs = Rp 450.000 (save Rp 75.000! 🎁)

Kalau kamu beli paket 6 pcs, artinya per bar hanya Rp 75.000 tapi dapat gratis 1 bar! Cocok banget buat yang mau stok atau bagi-bagi ke keluarga. 👨‍👩‍👧‍👦

Metode pembayaran ada Transfer Bank, E-wallet, dan COD. Mau order sekarang?`;
    }
  }

  // --- Topik: Cara pakai ---
  if (lower.match(/(cara.*pakai|bagaimana.*menggunakan|cara.*guna|pemakaian|pakai.*berapa.*kali|dosis)/)) {
    return `Cara pakainya gampang banget! 😊

1. Basahi area yang mau dibersihkan
2. Buat busa dengan tangan atau spons
3. Usapkan ke wajah, rambut, atau tubuh
4. ⚡ **Diamkan 1-2 menit** — ini penting biar bahan aktifnya bekerja maksimal!
5. Bilas sampai bersih

Gunakan 2x sehari (pagi & malam) untuk hasil optimal. Setelah 1-2 minggu pemakaian rutin, kamu bakal ngerasain perbedaannya! 💫

Tips: Jangan buru-buru bilas, biarkan sabun meresap 1-2 menit ya. Ini yang bikin hasilnya lebih maksimal! ✨`;
  }

  // --- Topik: Bahan / komposisi ---
  if (lower.match(/(bahan|kandungan|komposisi|ingredient|terbuat.*dari|apa.*isi|madu|spirulina|gamat)/)) {
    const style = Math.random();
    if (style < 0.5) {
      return `Multibeauty Soap mengandung 3 bahan alami premium: 🌿

🍯 **Madu Murni** — pelembap alami kaya antioksidan, antibakteri, dan mempercepat penyembuhan luka
🌱 **Spirulina** — detoksifikasi kulit, anti-aging, mencerahkan, dan kaya nutrisi
🌊 **Gamat (Teripang)** — kolagen tinggi untuk elastisitas, CGF untuk regenerasi sel, dan menyembuhkan luka

Semua bahan 100% alami, tanpa paraben, sulfat, atau pewarna sintetis. Sudah tersertifikasi BPOM dan dermatologically tested! ✅

Ada bahan tertentu yang kamu ingin ketahui lebih lanjut?`;
    } else {
      return `Komposisinya simpel tapi powerful! 💪

Gabungan dari:
• Madu Murni → melembapkan & antibakteri
• Spirulina → detoks & anti-aging
• Gamat (Teripang) → regenerasi sel & kolagen

Tiga bahan ini saling melengkapi — madu melembapkan, spirulina mendetoks, dan gamat meregenerasi kulit. Hasilnya? Kulit yang lebih sehat, cerah, dan kenyal! 🌟

100% alami, tanpa kimia berbahaya. Sudah BPOM certified! 🏅`;
    }
  }

  // --- Topik: Pemesanan / beli / order ---
  if (lower.match(/(pesan|order|beli|mau.*beli|bagaimana.*pesan|cara.*pesan|checkout|keranjang)/)) {
    return `Cara pesan Multibeauty Soap mudah banget! 🛒

1. Isi formulir pemesanan di bagian bawah halaman ini
2. Admin kami akan menghubungi via WhatsApp untuk konfirmasi
3. Lakukan pembayaran (Transfer, E-wallet, atau COD)
4. Produk dikirim ke alamat kamu! 📦

Pengiriman ke seluruh Indonesia, dan kami juga punya paket hemat 6 pcs (Rp 450.000) kalau mau stok jangka panjang.

Kalau kamu punya pertanyaan lain sebelum order, silakan tanya ya! Atau langsung klik tombol WhatsApp untuk order cepat. 💬`;
  }

  // --- Topik: Testimoni / review ---
  if (lower.match(/(testimoni|review|ulasan|pengalaman|kata.*orang|hasil.*nyata|efek)/)) {
    return `Ini beberapa testimoni dari pelanggan kami! ⭐

"Kulit saya jadi lebih cerah setelah 2 minggu pemakaian!" — Siti, Jakarta

"Jerawat saya berkurang drastis, terima kasih Multibeauty!" — Budi, Surabaya

"Luka bakar saya cepat sembuh berkat sabun ini!" — Ibu Rina, Bandung

"Aman untuk kulit sensitif saya, sangat merekomendasikan!" — Dewi, Medan

Ribuan pelanggan sudah merasakan manfaatnya. Kebanyakan mulai ngerasain perubahan dalam 1-2 minggu pemakaian rutin. 💫

Mau coba sendiri? Silakan order langsung ya! 😊`;
  }

  // --- Topik: Keamanan / BPOM / efek samping ---
  if (lower.match(/(aman|efek.*samping|bahaya|sertifikat|bpom|alergi|dokter|hamil|ibu.*hamil)/)) {
    return `Keamanan produk kami terjamin! ✅

• Tersertifikasi BPOM
• Dermatologically tested
• Hypoallergenic formula
• 100% bahan alami — tanpa paraben, sulfat, pewarna sintetis

Aman untuk:
• Semua jenis kulit termasuk kulit sensitif
• Ibu hamil dan menyusui
• Anak-anak (dengan konsultasi dokter)

Tidak mengandung bahan kimia berbahaya sama sekali! 🌿

Catatan: Kalau ada reaksi alergi, hentikan pemakaian dan konsultasikan ke dokter. Sebaiknya lakukan patch test dulu jika kulit kamu sangat sensitif.

Ada pertanyaan lain soal keamanan?`;
  }

  // --- Topik: Pengiriman / shipping ---
  if (lower.match(/(kirim|pengiriman|ongkir|lama.*kirim|resi|tracking)/)) {
    return `Pengiriman kami ke seluruh Indonesia! 📦

• Kemasan aman dan rapi
• Estimasi pengiriman 2-7 hari kerja tergantung wilayah
• Resi akan dikirimkan setelah produk diproses

Untuk metode pembayaran tersedia Transfer Bank, E-wallet, dan COD (untuk area tertentu).

Kalau ada pertanyaan soal pengiriman, silakan hubungi kami via WhatsApp ya! 💬`;
  }

  // --- Topik: Greeting / salam ---
  if (lower.match(/^(halo|hai|hi|hello|hey|assalamu|selamat|pagi|siang|sore|malam|permisi)/)) {
    const greetings = [
      `Halo! 👋 Senang kamu bertanya! Saya asisten AI untuk Multibeauty Soap. Ada yang bisa saya bantu tentang produk kami? Kamu bisa tanya tentang manfaat, harga, cara pakai, bahan, atau cara order! 😊`,
      `Hai! 😊 Selamat datang! Saya siap membantu kamu dengan pertanyaan seputar Multibeauty Soap. Mau tahu apa saja tentang produk kami?`,
      `Hello! 👋 Senang berkenalan dengan kamu! Kalau ada pertanyaan tentang Multibeauty Soap, silakan tanya ya. Saya siap bantu! ✨`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // --- Topik: Terima kasih ---
  if (lower.match(/(terima.?kasih|makasih|thanks|thank.*you|nuhun)/)) {
    const thanks = [
      `Sama-sama! 😊 Senang bisa membantu. Kalau ada pertanyaan lain, jangan ragu tanya ya. Semoga hari kamu menyenangkan! 🌟`,
      `Dengan senang hati! 💕 Jangan lupa order Multibeauty Soap ya kalau sudah yakin. Kami tunggu pesanan kamu! 😊`,
      `Sama-sama! 🙏 Semoga Multibeauty Soap bisa membantu kulit kamu. Kalau butuh bantuan lagi, saya selalu ada di sini! ✨`,
    ];
    return thanks[Math.floor(Math.random() * thanks.length)];
  }

  // --- Topik: Selamat tinggal ---
  if (lower.match(/(bye|dadah|sampai.?jumpa|selamat.?tinggal|goodbye)/)) {
    return `Dadah! 👋 Semoga hari kamu menyenangkan! Jangan lupa order Multibeauty Soap ya kalau sudah siap. Saya selalu ada di sini kalau kamu butuh bantuan lagi! 😊✨`;
  }

  // --- Topik: Kulit berminyak / jerawat ---
  if (lower.match(/(kulit.*berminyak|jerawat|bruntusan|komedo|kemerahan|jerawat.*pasien|pimple)/)) {
    return `Untuk masalah kulit berminyak dan jerawat, Multibeauty Soap sangat cocok! 🌿

Bahan Madu dan Spirulina punya sifat antibakteri yang bisa:
• Mengurangi produksi minyak berlebih
• Mencegah pertumbuhan bakteri penyebab jerawat
• Memudarkan bekas jerawat secara alami
• Membersihkan pori-pori tanpa mengeringkan kulit

Coba gunakan 2x sehari dan diamkan 1-2 menit sebelum dibilas. Banyak pelanggan kami mulai lihat hasil dalam 1-2 minggu! 💫

Ada pertanyaan lain tentang cocok tidaknya untuk jenis kulit kamu?`;
  }

  // --- Topik: Kulit kering / kusam ---
  if (lower.match(/(kulit.*kering|kusam|tidak.*merata|gelap|flek.*hitam|noda|spot)/)) {
    return `Untuk kulit kering atau kusam, Multibeauty Soap adalah solusi yang tepat! 💕

Madu murni di dalamnya bertindak sebagai pelembap alami yang meresap sampai ke dalam kulit, sementara Spirulina membantu mencerahkan dan mendetoksifikasi. Hasilnya:

✨ Kulit lebih lembap dan kenyal
✨ Warna kulit lebih merata
✨ Flek hitam dan noda memudar
✨ Kulit terasa lebih lembut dan halus

Coba gunakan 2x sehari ya. Banyak pelanggan kami yang awalnya punya kulit kusam sekarang jadi lebih cerah dan glowing! 🌟

Mau order sekarang?`;
  }

  // --- Topik: Usia / anti-aging ---
  if (lower.match(/(usia|anti.?aging|kerutan|keriput|tua|young|pemuda|kencang|elastis)/)) {
    return `Multibeauty Soap cocok untuk semua usia! 🌟

Terutama untuk yang mulai khawatir dengan kerutan dan elastisitas kulit. Gamat di dalamnya kaya akan kolagen dan CGF yang membantu:

• Mengurangi kerutan dan garis halus
• Meningkatkan elastisitas kulit
• Membuat kulit lebih kencang dan kenyal
• Merangsang regenerasi sel kulit

Spirulina juga punya sifat anti-aging yang kuat untuk melawan radikal bebas. Hasilnya, kulit kamu bakal terlihat lebih muda dan bercahaya! ✨

Mulai perawatan anti-aging sekarang juga, jangan tunda lagi! 😊`;
  }

  // --- Default fallback ---
  return `Hmm, pertanyaan yang menarik! 🤔 

Saya mungkin belum punya jawaban spesifik untuk itu, tapi saya tahu kalau Multibeauty Soap punya banyak manfaat untuk kulit kamu!

Kamu bisa tanya tentang:
• Manfaat dan keunggulan produk
• Harga dan paket hemat
• Cara pakai yang benar
• Bahan-bahan alami
• Keamanan dan sertifikasi
• Cara pesan

Atau kalau kamu punya pertanyaan lain, hubungi kami langsung via WhatsApp ya! 💬 Kami siap membantu! 😊`;
}

// ============================================================
// SEMANTIC CATEGORY DETECTOR
// ============================================================
function getSemanticCategory(message: string): string | null {
  const lower = message.toLowerCase();

  // Manfaat
  if (lower.match(/(manfaat|keuntungan|bagus|fungsi|manfaat.*kulit|apa.*aja|siapa.*yang.*cocok|rekomendasi)/)) return "manfaat";

  // Harga
  if (lower.match(/(harga|berapa.*biaya|harga.*berapa|cost|murah|mahal|promo|diskon|paket|hemat)/)) return "harga";

  // Cara pakai
  if (lower.match(/(cara.*pakai|bagaimana.*menggunakan|cara.*guna|pemakaian|pakai.*berapa.*kali|dosis)/)) return "cara_pakai";

  // Bahan
  if (lower.match(/(bahan|kandungan|komposisi|ingredient|terbuat.*dari|apa.*isi|madu|spirulina|gamat)/)) return "bahan";

  // Pesan/order
  if (lower.match(/(pesan|order|beli|mau.*beli|bagaimana.*pesan|cara.*pesan|checkout|keranjang)/)) return "order";

  // Testimoni
  if (lower.match(/(testimoni|review|ulasan|pengalaman|kata.*orang|hasil.*nyata|efek)/)) return "testimoni";

  // Keamanan
  if (lower.match(/(aman|efek.*samping|bahaya|sertifikat|bpom|alergi|dokter|hamil|ibu.*hamil)/)) return "keamanan";

  // Pengiriman
  if (lower.match(/(kirim|pengiriman|ongkir|lama.*kirim|resi|tracking)/)) return "pengiriman";

  // Greeting
  if (lower.match(/^(halo|hai|hi|hello|hey|assalamu|selamat|pagi|siang|sore|malam|permisi)/)) return "greeting";

  // Terima kasih
  if (lower.match(/(terima.?kasih|makasih|thanks|thank.*you|nuhun)/)) return "terima_kasih";

  // Selamat tinggal
  if (lower.match(/(bye|dadah|sampai.*jumpa|selamat.*tinggal|goodbye)/)) return "selamat_tinggal";

  // Kulit berminyak / jerawat
  if (lower.match(/(kulit.*berminyak|jerawat|bruntusan|komedo|kemerahan|pimple)/)) return "jerawat";

  // Kulit kering / kusam
  if (lower.match(/(kulit.*kering|kusam|tidak.*merata|gelap|flek.*hitam|noda|spot)/)) return "kusam";

  // Anti-aging
  if (lower.match(/(usia|anti.*aging|kerutan|keriput|tua|kencang|elastis)/)) return "anti_aging";

  // Terima kasih
  if (lower.match(/(terima.*kasih|makasih|thanks|thank.*you|nuhun)/)) return "terima_kasih";

  // Selamat tinggal
  if (lower.match(/(bye|dadah|sampai.*jumpa|selamat.*tinggal|goodbye)/)) return "selamat_tinggal";

  return null;
}

// ============================================================
// SUPABASE CLIENT
// ============================================================
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// ============================================================
// MAIN HANDLER
// ============================================================
serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let body: any = {};
  try {
    body = await req.json();
    // SECURITY: customPrompt is intentionally NOT read from the request body.
    // Accepting it would let any visitor replace the system prompt and use this
    // endpoint as a free, unrestricted LLM proxy on our AI bill.
    const { message, conversationHistory, whatsappNumber, landingSlug = "multibeauty" } = body;

    // Check for required fields + basic input validation
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message.length > 1000) {
      return new Response(JSON.stringify({ error: "Message too long (max 1000 characters)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof landingSlug !== "string" || landingSlug.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid landing slug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch landing page settings to get qaItems and the admin-configured prompt
    let qaItems: any[] = [];
    let storedPrompt = "";
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: landingData } = await supabase
          .from("landing_pages")
          .select("settings_published, settings_draft")
          .eq("slug", landingSlug)
          .maybeSingle();

        if (landingData) {
          const settings = landingData.settings_draft || landingData.settings_published;
          qaItems = settings?.chatbot?.qaItems || [];
          const p = settings?.chatbot?.aiPrompt;
          if (typeof p === "string" && p.trim().length > 0) storedPrompt = p.slice(0, 8000);
        }
      } catch (err) {
        console.warn("Failed to fetch landing settings:", err);
      }
    }

    // System prompt always comes from the server: the admin-stored prompt if set,
    // otherwise the built-in product prompt.
    const systemPrompt = storedPrompt || buildSystemPrompt();


    // Cek apakah ada OpenAI API key
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.warn("OpenAI API key not configured, using smart fallback");
      const fallbackMessage = generateFallbackResponse(message, qaItems);

      return new Response(JSON.stringify({
        message: fallbackMessage,
        category: getSemanticCategory(message),
        whatsappNumber: whatsappNumber || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build conversation context dengan informasi produk yang lengkap
    const messages = [
      { role: "system", content: systemPrompt },
    ];

    // Tambahkan conversation history (sanitized — only user/assistant turns)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory
        .slice(-10)
        .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 1000) }));
      messages.push(...recentHistory);
    }


    messages.push({ role: "user", content: message });

    // Panggil OpenAI dengan model terbaru
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 800,
        temperature: 0.85,
        top_p: 0.9,
        presence_penalty: 0.3,
        frequency_penalty: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content;

    if (!aiMessage) {
      throw new Error("Empty response from OpenAI");
    }

    return new Response(JSON.stringify({
      message: aiMessage,
      category: getSemanticCategory(message),
      whatsappNumber: whatsappNumber || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in chat function:", error);

    // Fallback ke smart response generator
    try {
      const { message, landingSlug = "multibeauty" } = body;

      // Fetch landing page settings for qaItems
      let qaItems: any[] = [];
      if (supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data: landingData } = await supabase
            .from("landing_pages")
            .select("settings_published, settings_draft")
            .eq("slug", landingSlug)
            .maybeSingle();

          if (landingData) {
            const settings = landingData.settings_draft || landingData.settings_published;
            qaItems = settings?.chatbot?.qaItems || [];
          }
        } catch (err) {
          console.warn("Failed to fetch landing settings in fallback:", err);
        }
      }

      const fallbackMessage = generateFallbackResponse(message || "", qaItems);

      return new Response(JSON.stringify({
        message: fallbackMessage,
        category: getSemanticCategory(message || ""),
        whatsappNumber: body.whatsappNumber || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (_) {
      return new Response(JSON.stringify({
        message: `Maaf, ada gangguan teknis. Silakan hubungi kami langsung via WhatsApp ya! 💬

Atau kamu bisa tanyakan tentang:
• Manfaat Multibeauty Soap
• Harga dan promo
• Cara pakai
• Bahan-bahan alami
• Keamanan produk
• Cara pesan

Kami siap membantu! 😊`,
        whatsappNumber: null,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
});
