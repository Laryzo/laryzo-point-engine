import type { Section, Theme, QACategory } from "./types";

// Optional bundled fallbacks
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

const CDN = "https://driplab.b-cdn.net/tapsite-ai/assets";
const STORAGE = "https://storage.tapsite.ai/media/assets";

const HERO = `${CDN}/1000008947-019bb.webp`;
const PRODUCT_BOX = `${CDN}/1000011496-019bb.webp`;

const BA = [
  { before: `${CDN}/1000011463-019bb.webp`, after: `${CDN}/1000011462-019bb.webp` },
  { before: `${CDN}/1000011479-019bb.webp`, after: `${CDN}/1000011480-019bb.webp` },
  { before: `${CDN}/1000011473-019bb.webp`, after: `${CDN}/1000011474-019bb.webp` },
  { before: `${CDN}/1000011476-019bb.webp`, after: `${CDN}/1000011477-019bb.webp` },
];

const GALLERY = [
  "019f3b58-8f45-7-a842-2f5271389fe04195",
  "019f3b68-ceb0-7-9767-2189ea2c3278b5a6",
  "019f3b6d-9855-7-896e-864385d966e5fae0",
  "019f3b6d-93b2-7-94fd-a7f18c38439adb1f",
  "019f3b6d-a085-7-bcb2-37de5e3cc9c5a167",
  "019f3b6d-a3f5-7-9547-6e4c8ff5b2a78120",
  "019f3b6d-ac23-7-b3b7-23b75ff3fd57b985",
  "019f3b6d-aee9-7-8079-b74dff245a1d3f23",
  "019f3b6d-b766-7-89d3-f9ffc964569b29a5",
  "019f3b6d-badd-7-bc35-277ddb56263dd44a",
  "019f3b6d-bfbc-7-ad3c-39ccae6c868442fe",
  "019f3b6d-c3b3-7-8e6c-e1781298feac94f1",
  "019f3b9f-e50c-7-b5e3-082998255fbf32be",
  "019f3b9f-dec4-7-9d90-728a22487376a385",
  "019f3b9f-d5b5-7-ae5f-f413ecf52e43ea7a",
  "019f3b9f-cfb0-7-881a-867008d45b5da29c",
  "019f3b9f-cc2e-7-a64c-8267135153ca8aac",
  "019f3b9f-c866-7-9d3e-6f5a5d37401bfc7f",
  "019f3b9f-baa2-7-82c3-40ac5df6d33e2ec5",
  "019f3b9f-b4c8-7-b80d-9d7d89e3805fb088",
  "019f3b9f-9c27-7-855b-5173ae106eadabe3",
  "019f3b9f-8fec-7-8b73-10fefcb174a2b3b7",
  "019f3b9f-86f9-7-83a9-19059fe2f2acb7f8",
  "019f3b9f-80b8-7-92c5-d0bd6c10f979b655",
  "019f3b9f-73f0-7-ad4a-e77119893895a627",
  "019f3b9f-6d9c-7-ab4f-84a2206623e3e88a",
].map((id) => `${CDN}/${id}.webp`);

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
  {
    id: uid(),
    type: "hero",
    visible: true,
    props: {
      title: "Transformasi Kulit:",
      titleAccent: "Cerah Alami| & Bebas Masalah",
      subtitle:
        "Multibeauty Soap: Sabun Kesehatan Alami Multifungsi untuk Wajah, Rambut & Tubuh. Solusi lengkap dengan kekuatan Madu, Spirulina, dan Gamat.",
      ctaPrimary: "Pesan Sekarang",
      ctaPrimaryHref: "#order",
      image: HERO,
      bg: "#ffffff",
    },
  },
  {
    id: uid(),
    type: "text",
    visible: true,
    props: {
      title: "Lelah dengan Masalah Kulit yang Tak Kunjung Usai?",
      body:
        "Apakah Anda sering merasa frustrasi menghadapi jerawat membandel, flek hitam yang mengganggu, kulit kusam yang membuat tidak percaya diri, atau gatal-gatal yang meresahkan? Mungkin Anda sudah mencoba berbagai produk namun hasilnya kurang memuaskan atau bahkan menimbulkan efek samping. Kami memahami betapa sulitnya menemukan solusi yang benar-benar bekerja dan aman untuk kulit Anda.",
      align: "center",
      bg: "#f8fafc",
    },
  },
  {
    id: uid(),
    type: "text",
    visible: true,
    props: {
      subtitle: "Saatnya Beralih ke Solusi Alami yang Efektif: Multibeauty Soap!",
      body:
        "Multibeauty Soap hadir sebagai jawaban atas pencarian Anda. Dirancang dengan kekuatan alam yang terbukti, sabun multi-guna ini tidak hanya membersihkan, tetapi juga merawat dan membantu mengatasi berbagai masalah kulit dari ujung rambut hingga kaki, memberikan Anda kulit yang sehat, cerah, dan bebas masalah secara alami.",
      align: "center",
      bg: "#ffffff",
    },
  },
  {
    id: uid(),
    type: "features",
    visible: true,
    props: {
      title: "Mengapa Memilih Multibeauty Soap?",
      columns: 3,
      bg: "#f9fafb",
      items: [
        {
          icon: "🌿",
          title: "Formula Alami Terbaik",
          desc: "Gabungan unik madu, Spirulina, dan Gamat menghasilkan sinergi ampuh untuk berbagai masalah kulit tanpa bahan kimia berbahaya.",
        },
        {
          icon: "✨",
          title: "Solusi Multi-guna",
          desc: "Satu sabun untuk semua: wajah, rambut, dan tubuh. Praktis, hemat, dan efektif untuk seluruh keluarga.",
        },
        {
          icon: "🏆",
          title: "Terbukti Berkhasiat",
          desc: "Telah membantu ribuan orang mengatasi jerawat, flek, gatal, dan mendapatkan kulit sehat alami kembali.",
        },
      ],
    },
  },
  {
    id: uid(),
    type: "features",
    visible: true,
    props: {
      title: "Kekuatan Unik Alam dalam Setiap Sabun",
      columns: 3,
      bg: "#ffffff",
      items: [
        {
          icon: "🍯",
          title: "Madu Murni",
          desc: "Dikenal sebagai pelembap alami, madu kaya akan antioksidan dan memiliki sifat antibakteri. Membantu menenangkan kulit, mengurangi peradangan, melembapkan secara mendalam, dan memberikan kilau alami.",
        },
        {
          icon: "🌿",
          title: "Spirulina",
          desc: "Ganggang biru-hijau superfood ini penuh vitamin, mineral, dan protein. Detoksifikasi kulit, melawan radikal bebas, mencerahkan, dan membantu regenerasi sel kulit untuk tampilan lebih muda.",
        },
        {
          icon: "🌊",
          title: "Gamat (Teripang)",
          desc: "Mengandung kolagen tinggi dan Cell Growth Factor. Sangat efektif dalam mempercepat penyembuhan luka, mengurangi bekas luka, meredakan gatal, dan meremajakan tekstur kulit.",
        },
      ],
    },
  },
  {
    id: uid(),
    type: "checklist",
    visible: true,
    props: {
      title: "Manfaat Luas Multibeauty Soap untuk Kulit & Tubuh Anda",
      columns: 2,
      bg: "#f9fafb",
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
      footer:
        "Rasakan kemudahan perawatan lengkap dari ujung rambut hingga kaki hanya dengan satu produk alami!",
    },
  },
  {
    id: uid(),
    type: "comparison",
    visible: true,
    props: {
      title: "Stop Membuang Uang untuk Perawatan yang Rumit!",
      subtitle:
        "Lihat perbandingan cerdas antara membeli puluhan produk dengan satu solusi praktis yang menghemat waktu, ruang, dan terutama anggaran Anda.",
      bg: "#ffffff",
      leftTitle: "Cara Lama: Ribet & Boros",
      leftSubtitle: "Estimasi pengeluaran untuk berbagai produk terpisah:",
      leftItems: [
        { icon: "🧴", label: "Shampo Khusus", price: "Rp 75.000" },
        { icon: "💧", label: "Sabun Wajah (Jerawat)", price: "Rp 90.000" },
        { icon: "🚿", label: "Sabun Mandi (Gatal)", price: "Rp 45.000" },
        { icon: "💊", label: "Obat Totol Jerawat", price: "Rp 80.000" },
        { icon: "💊", label: "Obat Luka", price: "Rp 12.000" },
        { icon: "💊", label: "Obat Luka Bakar", price: "Rp 100.000" },
        { icon: "🩹", label: "Salep Gatal & Herpes", price: "Rp 65.000" },
        { icon: "🦷", label: "Pasta Gigi Khusus", price: "Rp 35.000" },
        { icon: "🦷", label: "Obat Sakit Gigi", price: "Rp 50.000" },
        { icon: "👄", label: "Obat Sariawan", price: "Rp 25.000" },
        { icon: "➕", label: "… dan banyak lagi!", price: "…" },
      ],
      leftTotalLabel: "Total Pengeluaran Tiap 1-2 Bulan:",
      leftTotal: "Rp 415.000++",
      rightTitle: "Solusi Cerdas: Multibeauty",
      rightSubtitle: "Hanya dengan 1 Paket:",
      rightImage: PRODUCT_BOX,
      rightPriceLabel: "Hanya",
      rightPrice: "Rp 450.000",
      rightBenefits: [
        "Isi 6 Pcs untuk Pemakaian Hingga 6 Bulan!",
        "Jauh Lebih Hemat & Sangat Praktis",
        "Mengatasi Semua Masalah Di Atas",
      ],
      rightFooter:
        "Penghematan Luar Biasa! Dengan 1 paket Multibeauty, Anda hanya mengeluarkan Rp 75.000 per bulan untuk perawatan lengkap dari ujung rambut hingga kaki.",
    },
  },
  {
    id: uid(),
    type: "beforeAfter",
    visible: true,
    props: {
      title: "Transformasi Nyata: Lihat Hasilnya!",
      subtitle: "Kami memahami Anda ingin bukti. Inilah beberapa cerita sukses nyata dari pelanggan kami:",
      bg: "#ffffff",
      disclaimer: "*Hasil dapat bervariasi pada setiap individu.",
      items: [
        { before: BA[0].before, after: BA[0].after, caption: "Siti Aminah — jerawat berkurang, kulit lebih kencang & bersih.", duration: "Setelah 3 bulan pemakaian" },
        { before: BA[1].before, after: BA[1].after, caption: "Budi Santoso — kulit kepala sembuh setelah beragam produk gagal.", duration: "Setelah 3 bulan pemakaian" },
        { before: BA[2].before, after: BA[2].after, caption: "Sri Wahyuni — kulit lebih cerah dan flek hitam berkurang.", duration: "Setelah 4 bulan pemakaian rutin" },
        { before: BA[3].before, after: BA[3].after, caption: "Arianto — kulit terbakar air panas mulai membaik.", duration: "Setelah 38 hari pemakaian" },
      ],
    },
  },
  {
    id: uid(),
    type: "testimonials",
    visible: true,
    props: {
      title: "Apa Kata Pelanggan Kami?",
      subtitle: "Mereka telah merasakan langsung manfaat Multibeauty Soap. Simak pengalaman jujur mereka:",
      bg: "#f9fafb",
      columns: 2,
      items: [
        {
          photo: `${STORAGE}/019793cd-482d-7-b9ba-e39f1874803c9e0f.webp`,
          quote:
            "Awalnya ragu, tapi setelah pakai rutin selama sebulan, jerawat di punggung saya jauh berkurang! Kulit juga jadi lebih halus. Nyesel baru tahu sabun ini sekarang!",
          name: "Sari L.",
          location: "Jakarta",
        },
        {
          photo: `${CDN}/1000011474-019bb.webp`,
          quote:
            "Flek di pipi mulai memudar perlahan setelah pakai Multibeauty Soap sebagai sabun muka. Rasanya alami dan tidak bikin kulit kering. Seneng banget sama hasilnya!",
          name: "Sri Wahyuni",
          location: "Bandung",
        },
        {
          photo: `${STORAGE}/019793ca-69dd-7-88bf-f97a0144239ce232.webp`,
          quote:
            "Suami saya punya masalah gatal di kulit, pakai sabun biasa malah makin parah. Coba Multibeauty Soap, alhamdulillah gatalnya mereda dan kulitnya jadi lebih sehat. Benar-benar multifungsi!",
          name: "Ibu Ani",
          location: "Surabaya",
        },
        {
          photo: `${STORAGE}/019793ca-107c-7-a8ce-2d765be106c2c0ed.webp`,
          quote:
            "Anak saya jatuh dan lututnya luka, saya coba cuci pakai sabun ini. Bersih, tidak perih, dan lukanya cepat sekali mengeringnya. Amazing! Selalu sedia di rumah sekarang.",
          name: "Nisa W.",
          location: "Yogyakarta",
        },
      ],
    },
  },
  {
    id: uid(),
    type: "text",
    visible: true,
    props: {
      subtitle: "Anda Terinspirasi?",
      body: "Bergabunglah dengan ratusan pelanggan puas lainnya dan rasakan sendiri keajaiban Multibeauty Soap.",
      align: "center",
      bg: "#ffffff",
    },
  },
  {
    id: uid(),
    type: "gallery",
    visible: true,
    props: {
      title: "Bukti Nyata Pengguna",
      subtitle: "Ribuan testimoni dari pengguna yang telah merasakan manfaatnya",
      columns: 5,
      bg: "#ffffff",
      images: GALLERY,
    },
  },
  {
    id: uid(),
    type: "legal",
    visible: true,
    props: {
      badge: "LEGALITAS RESMI",
      title: "Diproduksi oleh Perusahaan Resmi",
      body:
        "Multibeauty Soap diproduksi dan didistribusikan oleh PT. Angkasa Wijaya Internasional, perusahaan terdaftar resmi dengan standar produksi yang terjamin.",
      bg: "linear-gradient(to bottom, #ffffff, #ecfdf5)",
      items: [
        { icon: "🛡️", title: "Perusahaan Legal" },
        { icon: "🏅", title: "Formula Terjamin" },
        { icon: "✨", title: "Bahan Alami" },
      ],
    },
  },
  {
    id: uid(),
    type: "countdown",
    visible: true,
    props: {
      title: "Penawaran Spesial Terbatas!",
      subtitle: "Jangan lewatkan kesempatan emas untuk mendapatkan kulit sehat alami impian Anda.",
      endsAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      bonusText: "🎁 Beli Multibeauty Soap Hari Ini & Dapatkan Sabun GRATIS Setiap Bulan!",
      ctaText: "Pesan Sekarang",
      ctaHref: "#order",
      bg: "linear-gradient(135deg, #065f46, #047857)",
    },
  },
  {
    id: uid(),
    type: "checkout",
    visible: true,
    props: {
      title: "Satu Langkah Lagi Menuju Kulit Sehat",
      subtitle:
        "Lengkapi data di bawah ini, dan tim kami akan segera menghubungi Anda via WhatsApp untuk konfirmasi pesanan dan pembayaran.",
      price: 450000,
      buttonText: "Kirim Pesanan Sekarang",
      bg: "linear-gradient(135deg, #059669, #065f46)",
    },
  },
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
// ============================================================
// DEFAULT Q&A TEMPLATE — muncul otomatis di Landing Page Builder
// ============================================================
export const defaultQAItems: QACategory[] = [
  {
    id: "manfaat",
    name: "Manfaat Produk",
    keywords: ["manfaat", "keuntungan", "bagus untuk apa", "fungsi", "unggul", "cocok untuk"],
    answers: [
      "Multibeauty Soap punya 12 manfaat luar biasa! Yang paling populer: Mencerahkan kulit kusam secara alami, mengatasi jerawat dan bekasnya, melembapkan kulit sampai dalam, memudarkan flek hitam & noda, anti-aging & melindungi dari radikal bebas. Semua dari bahan 100% alami — Madu, Spirulina, dan Gamat! 🌿",
      "Wah, Multibeauty Soap ini all-in-one banget! Dari mencerahkan, melembapkan, mengatasi jerawat, sampai meredakan gatal-gatal. Semua manfaat ini berasal dari bahan alami tanpa kimia berbahaya. 🌟",
    ],
  },
  {
    id: "harga",
    name: "Harga & Promo",
    keywords: ["harga", "berapa", "murah", "mahal", "promo", "diskon", "paket", "hemat", "biaya"],
    answers: [
      "Harga Multibeauty Soap sangat terjangkau! Eceran: Rp 75.000 per bar (60g). Paket Hemat 6 pcs: Rp 450.000 (hemat Rp 75.000!). Dengan paket 6 pcs, cukup untuk 6 bulan perawatan. 🎉",
      "Untuk harga: 1 bar = Rp 75.000, paket 6 pcs = Rp 450.000. Kalau beli paket 6 pcs, per bar hanya Rp 75.000 tapi dapat gratis 1 bar! Cocok buat stok atau bagi-bagi ke keluarga. 😊",
    ],
  },
  {
    id: "cara_pakai",
    name: "Cara Pakai",
    keywords: ["cara pakai", "bagaimana menggunakan", "pemakaian", "berapa kali", "dosis", "cara guna"],
    answers: [
      "Cara pakainya gampang banget! 1. Basahi area yang mau dibersihkan 2. Buat busa 3. Usapkan ke wajah/tubuh 4. ⚡ Diamkan 1-2 menit agar bahan aktif bekerja 5. Bilas sampai bersih. Gunakan 2x sehari (pagi & malam) untuk hasil optimal! ✨",
      "Basahi sabun dan tangan → Buat busa sampai melimpah → Usapkan lembut ke wajah/tubuh → Diamkan 1-2 menit agar nutrisi meresap → Bilas sampai bersih. Gunakan 2-3 kali sehari untuk hasil maksimal! 💫",
    ],
  },
  {
    id: "bahan",
    name: "Bahan & Kandungan",
    keywords: ["bahan", "kandungan", "komposisi", "terbuat dari", "isi", "madu", "spirulina", "gamat", "ingredient"],
    answers: [
      "Multibeauty Soap mengandung 3 bahan alami premium: 🍯 Madu Murni (pelembap alami kaya antioksidan, antibakteri), 🌱 Spirulina (detoksifikasi kulit, anti-aging, mencerahkan), 🌊 Gamat/Teripang (kolagen tinggi, CGF untuk regenerasi sel). Semua 100% alami tanpa paraben, sulfat, atau pewarna sintetis! ✅",
      "Komposisinya simpel tapi powerful! Madu Murni → melembapkan & antibakteri, Spirulina → detoks & anti-aging, Gamat (Teripang) → regenerasi sel & kolagen. Tiga bahan ini saling melengkapi untuk kulit yang lebih sehat, cerah, dan kenyal! 🌟",
    ],
  },
  {
    id: "keamanan",
    name: "Keamanan & Sertifikasi",
    keywords: ["aman", "efek samping", "bahaya", "bpom", "sertifikat", "alergi", "hamil", "ibu hamil", "sensitif"],
    answers: [
      "Tenang saja! Multibeauty Soap 100% AMAN. Sudah BPOM Certified, Dermatologically tested, Hypoallergenic formula. Aman untuk semua jenis kulit termasuk kulit sensitif, ibu hamil & menyusui. Tanpa merkuri atau bahan kimia berbahaya sama sekali! 🛡️",
      "Keamanan produk kami terjamin! Tersertifikasi BPOM, dermatologically tested, 100% bahan alami — tanpa paraben, sulfat, pewarna sintetis. Cocok untuk semua jenis kulit termasuk kulit sensitif. Jika ada reaksi alergi, hentikan pemakaian dan konsultasikan ke dokter ya. 🙏",
    ],
  },
  {
    id: "order",
    name: "Cara Order",
    keywords: ["pesan", "order", "beli", "mau beli", "cara pesan", "checkout", "keranjang", "toko", "ongkir", "kirim"],
    answers: [
      "Cara pesan mudah banget! Isi formulir pemesanan di bagian bawah halaman ini → Admin akan menghubungi via WhatsApp untuk konfirmasi → Lakukan pembayaran (Transfer, E-wallet, atau COD) → Produk dikirim ke alamat kamu! Pengiriman ke seluruh Indonesia. 📦",
      "Kamu bisa langsung klik tombol 'Pesan Sekarang' di bagian bawah halaman ini, isi data lengkap, dan admin kami akan menghubungi via WhatsApp untuk konfirmasi pesanan. Kami juga punya paket hemat 6 pcs (Rp 450.000) kalau mau stok jangka panjang! 🛒",
    ],
  },
  {
    id: "testimoni",
    name: "Testimoni & Review",
    keywords: ["testimoni", "review", "ulasan", "pengalaman", "kata orang", "hasil nyata", "efek"],
    answers: [
      "Ribuan pelanggan sudah merasakan manfaatnya! Kebanyakan mulai ngerasain perubahan dalam 1-2 minggu pemakaian rutin. Dari jerawat berkurang, kulit lebih cerah, sampai luka cepat sembuh — semua testimoni nyata dari pelanggan kami. ⭐",
      "Ini beberapa testimoni nyata: 'Kulit saya jadi lebih cerah setelah 2 minggu!' — Siti, Jakarta. 'Jerawat saya berkurang drastis!' — Budi, Surabaya. 'Luka bakar cepat sembuh berkat sabun ini!' — Ibu Rina, Bandung. Mau coba sendiri? 😊",
    ],
  },
  {
    id: "pengiriman",
    name: "Pengiriman",
    keywords: ["kirim", "pengiriman", "ongkir", "lama kirim", "resi", "tracking", "sampai mana"],
    answers: [
      "Pengiriman kami ke seluruh Indonesia! Estimasi 2-7 hari kerja tergantung wilayah. Kemasan aman dan rapi, resi akan dikirimkan setelah produk diproses. Metode pembayaran: Transfer Bank, E-wallet, dan COD (area tertentu). 📦",
    ],
  },
];
