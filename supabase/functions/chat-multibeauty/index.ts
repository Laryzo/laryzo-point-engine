import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OpenAI } from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory } = await req.json();

    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY"),
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
      model: "gpt-3.5-turbo", // Atau gpt-4 jika tersedia
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: message },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiMessage = response.choices[0].message.content;

    return new Response(JSON.stringify({ message: aiMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in chat function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
