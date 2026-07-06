import type { Section, Theme } from "./types";

// Auto-import bundled multibeauty images (used as default seed)
const imageModules = import.meta.glob("@/assets/multibeauty/*.{png,jpeg,jpg}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

export const bundledImages = Object.entries(imageModules)
  .sort(([a], [b]) => {
    const na = parseInt(a.match(/image(\d+)/)?.[1] || "0");
    const nb = parseInt(b.match(/image(\d+)/)?.[1] || "0");
    return na - nb;
  })
  .map(([, url]) => url);

const img = (i: number) => bundledImages[i] || bundledImages[0] || "";
const heroImage = img(0);
const productBox = img(1) || img(0);
const antsImage = img(2);
const testimonials = bundledImages.slice(3);

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const defaultTheme: Theme = {
  primary: "#059669",
  primaryDark: "#065f46",
  accent: "#f59e0b",
  bg: "#ffffff",
  text: "#0f172a",
  font: "'Inter', sans-serif",
};

export const defaultMultibeautySections: Section[] = [
  // 1. HERO
  {
    id: uid(),
    type: "hero",
    visible: true,
    props: {
      badge: "🌿 100% Herbal · Bebas Bahan Kimia",
      title: "Transformasi Kulit:",
      titleAccent: "Cerah Alami & Bebas Masalah",
      subtitle:
        "Multibeauty Soap: Sabun Kesehatan Alami Multifungsi untuk Wajah, Rambut & Tubuh. Solusi lengkap dengan kekuatan Madu, Spirulina, dan Gamat.",
      ctaPrimary: "Pesan Sekarang",
      ctaPrimaryHref: "#order",
      ctaSecondary: "Lihat Testimoni",
      ctaSecondaryHref: "#testimoni",
      image: heroImage,
      bg: "linear-gradient(135deg, #fef3c7 0%, #fefce8 50%, #ecfdf5 100%)",
    },
  },
  // 2. PROBLEM
  {
    id: uid(),
    type: "text",
    visible: true,
    props: {
      title: "Lelah dengan Masalah Kulit yang Tak Kunjung Usai?",
      body: "Apakah Anda sering merasa frustrasi menghadapi jerawat membandel, flek hitam yang mengganggu, kulit kusam yang membuat tidak percaya diri, atau gatal-gatal yang meresahkan? Mungkin Anda sudah mencoba berbagai produk namun hasilnya kurang memuaskan atau bahkan menimbulkan efek samping. Kami memahami betapa sulitnya menemukan solusi yang benar-benar bekerja dan aman untuk kulit Anda.",
      align: "center",
      bg: "#ffffff",
    },
  },
  // 3. SOLUTION INTRO
  {
    id: uid(),
    type: "text",
    visible: true,
    props: {
      subtitle: "Saatnya Beralih ke Solusi Alami yang Efektif: Multibeauty Soap!",
      body: "Multibeauty Soap hadir sebagai jawaban atas pencarian Anda. Dirancang dengan kekuatan alam yang terbukti, sabun multi-guna ini tidak hanya membersihkan, tetapi juga merawat dan membantu mengatasi berbagai masalah kulit dari ujung rambut hingga kaki, memberikan Anda kulit yang sehat, cerah, dan bebas masalah secara alami.",
      align: "center",
      bg: "linear-gradient(to bottom, #ffffff, #f0fdf4)",
    },
  },
  // 4. WHY CHOOSE
  {
    id: uid(),
    type: "features",
    visible: true,
    props: {
      title: "Mengapa Memilih Multibeauty Soap?",
      columns: 3,
      bg: "#ffffff",
      items: [
        { icon: "🌿", title: "Formula Alami Terbaik", desc: "Gabungan unik madu, Spirulina, dan Gamat menghasilkan sinergi ampuh untuk berbagai masalah kulit tanpa bahan kimia berbahaya." },
        { icon: "✨", title: "Solusi Multi-guna", desc: "Satu sabun untuk semua: wajah, rambut, dan tubuh. Praktis, hemat, dan efektif untuk seluruh keluarga." },
        { icon: "🏆", title: "Terbukti Berkhasiat", desc: "Telah membantu ribuan orang mengatasi jerawat, flek, gatal, dan mendapatkan kulit sehat alami kembali." },
      ],
    },
  },
  // 5. INGREDIENTS
  {
    id: uid(),
    type: "features",
    visible: true,
    props: {
      title: "Kekuatan Unik Alam dalam Setiap Sabun",
      subtitle: "Sinergi 3 bahan alami premium yang tidak dimiliki sabun biasa",
      columns: 3,
      bg: "linear-gradient(to bottom, #ecfdf5, #ffffff)",
      items: [
        { icon: "🍯", title: "Madu Murni", desc: "Pelembap alami kaya antioksidan dan antibakteri. Menenangkan kulit, mengurangi peradangan, melembapkan mendalam, dan memberikan kilau alami." },
        { icon: "🌿", title: "Spirulina", desc: "Ganggang biru-hijau superfood penuh vitamin, mineral, dan protein. Detoksifikasi kulit, melawan radikal bebas, mencerahkan, dan regenerasi sel." },
        { icon: "🌊", title: "Gamat (Teripang)", desc: "Kaya kolagen dan Cell Growth Factor. Sangat efektif mempercepat penyembuhan luka, mengurangi bekas, meredakan gatal, dan meremajakan kulit." },
      ],
    },
  },
  // 6. BENEFITS CHECKLIST
  {
    id: uid(),
    type: "checklist",
    visible: true,
    props: {
      title: "Manfaat Luas Multibeauty Soap untuk Kulit & Tubuh Anda",
      columns: 2,
      bg: "#ffffff",
      items: [
        "Mengatasi Jerawat & Bekas Jerawat",
        "Memudarkan Flek Hitam & Noda di Kulit",
        "Mencerahkan Kulit Kusam Secara Alami",
        "Menghaluskan Kulit Kasar & Kering",
        "Meredakan Gatal-gatal & Masalah Kulit Lainnya",
        "Mempercepat Penyembuhan Luka Ringan",
      ],
    },
  },
  // 7. USAGE (4 fungsi)
  {
    id: uid(),
    type: "usage",
    visible: true,
    props: {
      title: "Satu Sabun, Segala Kebutuhan Perawatan!",
      subtitle: "Hemat, praktis, dan efektif. Multibeauty Soap dapat digunakan sebagai:",
      bg: "#fffbeb",
      items: [
        { icon: "🧼", label: "Sabun Wajah" },
        { icon: "🚿", label: "Sabun Mandi" },
        { icon: "🧴", label: "Shampo" },
        { icon: "🦷", label: "Pasta Gigi" },
      ],
      footer: "Rasakan kemudahan perawatan lengkap dari ujung rambut hingga kaki hanya dengan satu produk alami!",
    },
  },
  // 8. NATURAL PROOF (semut)
  {
    id: uid(),
    type: "imageText",
    visible: true,
    props: {
      badge: "BUKTI 100% ALAMI",
      title: "Dikerubungi Semut = Bebas Bahan Kimia",
      body: "Semut adalah detektor alami. Mereka hanya menghampiri bahan yang benar-benar alami dan mengandung nutrisi asli. Multibeauty Soap terbukti bebas dari bahan kimia berbahaya.",
      image: antsImage,
      imagePosition: "left",
      bg: "#ffffff",
    },
  },
  // 9. COMPARISON
  {
    id: uid(),
    type: "comparison",
    visible: true,
    props: {
      title: "Stop Membuang Uang untuk Perawatan yang Rumit!",
      subtitle: "Lihat perbandingan cerdas antara membeli puluhan produk dengan satu solusi praktis yang menghemat waktu, ruang, dan terutama anggaran Anda.",
      bg: "linear-gradient(to bottom, #ffffff, #fef2f2)",
      leftTitle: "Cara Lama: Ribet & Boros",
      leftSubtitle: "Estimasi pengeluaran untuk berbagai produk terpisah:",
      leftItems: [
        { icon: "🧴", label: "Shampo Khusus", price: "Rp 75.000" },
        { icon: "💧", label: "Sabun Wajah (Jerawat)", price: "Rp 90.000" },
        { icon: "🚿", label: "Sabun Mandi (Gatal)", price: "Rp 45.000" },
        { icon: "💊", label: "Obat Totol Jerawat", price: "Rp 80.000" },
        { icon: "🩹", label: "Salep Gatal & Herpes", price: "Rp 65.000" },
        { icon: "🦷", label: "Pasta Gigi Khusus", price: "Rp 35.000" },
        { icon: "👄", label: "Obat Sariawan", price: "Rp 25.000" },
      ],
      leftTotalLabel: "Total Pengeluaran Tiap 1-2 Bulan:",
      leftTotal: "Rp 415.000++",
      rightTitle: "Solusi Cerdas: Multibeauty",
      rightSubtitle: "Hanya dengan 1 Paket, semua masalah teratasi:",
      rightImage: productBox,
      rightPriceLabel: "Hanya",
      rightPrice: "Rp 450.000",
      rightBenefits: [
        "Isi 6 Pcs untuk Pemakaian Hingga 6 Bulan!",
        "Jauh Lebih Hemat & Sangat Praktis",
        "Mengatasi Semua Masalah Di Atas",
      ],
      rightFooter: "Hanya Rp 75.000 per bulan untuk perawatan lengkap dari ujung rambut hingga kaki.",
    },
  },
  // 10. BEFORE AFTER
  {
    id: uid(),
    type: "beforeAfter",
    visible: true,
    props: {
      title: "Transformasi Nyata: Lihat Hasilnya!",
      subtitle: "Kami memahami Anda ingin bukti. Inilah beberapa cerita sukses nyata dari pelanggan kami.",
      bg: "#ffffff",
      disclaimer: "*Hasil dapat bervariasi pada setiap individu.",
      items: [
        { before: bundledImages[3] || heroImage, after: bundledImages[4] || heroImage, caption: "Jerawat dan kemerahan berkurang drastis.", duration: "Setelah 3 minggu pemakaian rutin" },
        { before: bundledImages[5] || heroImage, after: bundledImages[6] || heroImage, caption: "Flek hitam memudar, kulit tampak lebih cerah.", duration: "Setelah 8 minggu pemakaian" },
        { before: bundledImages[7] || heroImage, after: bundledImages[8] || heroImage, caption: "Kulit kepala pulih & rambut tumbuh kembali.", duration: "Dalam 3 bulan pemakaian" },
        { before: bundledImages[9] || heroImage, after: bundledImages[10] || heroImage, caption: "Luka bakar cepat pulih dan bekasnya memudar.", duration: "Hasil dari fungsi Gamat!" },
      ],
    },
  },
  // 11. TESTIMONIALS
  {
    id: uid(),
    type: "testimonials",
    visible: true,
    props: {
      title: "Apa Kata Pelanggan Kami?",
      subtitle: "Mereka telah merasakan langsung manfaat Multibeauty Soap. Simak pengalaman jujur mereka.",
      bg: "linear-gradient(to bottom, #f0fdf4, #ffffff)",
      columns: 2,
      items: [
        { photo: bundledImages[11], quote: "Awalnya ragu, tapi setelah pakai rutin selama sebulan, jerawat di punggung saya jauh berkurang! Kulit juga jadi lebih halus. Nyesel baru tahu sabun ini sekarang!", name: "Sari L.", location: "Jakarta" },
        { photo: bundledImages[12], quote: "Flek di pipi mulai memudar perlahan setelah pakai Multibeauty Soap sebagai sabun muka. Rasanya alami dan tidak bikin kulit kering. Seneng banget sama hasilnya!", name: "Rina S.", location: "Bandung" },
        { photo: bundledImages[13], quote: "Suami saya punya masalah gatal di kulit, pakai sabun biasa malah makin parah. Coba Multibeauty Soap, alhamdulillah gatalnya mereda dan kulitnya jadi lebih sehat.", name: "Ibu Ani", location: "Surabaya" },
        { photo: bundledImages[14], quote: "Anak saya jatuh dan lututnya luka, saya coba cuci pakai sabun ini. Bersih, tidak perih, dan lukanya cepat sekali mengeringnya. Amazing! Selalu sedia di rumah sekarang.", name: "Nisa W.", location: "Yogyakarta" },
      ],
    },
  },
  // 12. GALLERY (all testimonial screenshots)
  {
    id: uid(),
    type: "gallery",
    visible: true,
    props: {
      title: "Bukti Nyata Pengguna",
      subtitle: "Ribuan testimoni dari pengguna yang telah merasakan manfaatnya",
      columns: 5,
      bg: "#ffffff",
      images: testimonials,
    },
  },
  // 13. LEGAL
  {
    id: uid(),
    type: "legal",
    visible: true,
    props: {
      badge: "LEGALITAS RESMI",
      title: "Diproduksi oleh Perusahaan Resmi",
      body: "Multibeauty Soap diproduksi dan didistribusikan oleh PT. Angkasa Wijaya Internasional, perusahaan terdaftar resmi dengan standar produksi yang terjamin.",
      bg: "linear-gradient(to bottom, #ffffff, #ecfdf5)",
      items: [
        { icon: "🛡️", title: "Perusahaan Legal" },
        { icon: "🏅", title: "Formula Terjamin" },
        { icon: "✨", title: "Bahan Alami" },
      ],
    },
  },
  // 14. COUNTDOWN
  {
    id: uid(),
    type: "countdown",
    visible: true,
    props: {
      title: "Penawaran Spesial Terbatas!",
      subtitle: "Jangan lewatkan kesempatan emas untuk mendapatkan kulit sehat alami impian Anda.",
      endsAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      bonusText: "🎁 Beli Hari Ini & Dapatkan Sabun GRATIS Setiap Bulan!",
      ctaText: "Pesan Sekarang",
      ctaHref: "#order",
      bg: "linear-gradient(135deg, #065f46, #047857)",
    },
  },
  // 15. CHECKOUT
  {
    id: uid(),
    type: "checkout",
    visible: true,
    props: {
      title: "Satu Langkah Lagi Menuju Kulit Sehat",
      subtitle: "Lengkapi data di bawah, tim kami akan segera menghubungi Anda via WhatsApp untuk konfirmasi pesanan.",
      price: 75000,
      buttonText: "Kirim Pesanan Sekarang",
      bg: "linear-gradient(135deg, #059669, #065f46)",
    },
  },
  // 16. FOOTER
  {
    id: uid(),
    type: "footer",
    visible: true,
    props: {
      brand: "Multibeauty Soap",
      text: "Diproduksi oleh PT. Angkasa Wijaya Internasional",
      copyright: "© {year} Multibeauty. Distribusi via Laryzo.",
      bg: "#052e16",
    },
  },
];
