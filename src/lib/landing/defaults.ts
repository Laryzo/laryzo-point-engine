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

const heroImage = bundledImages[0] || "";
const antsImage = bundledImages[2] || "";
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
  {
    id: uid(),
    type: "hero",
    visible: true,
    props: {
      badge: "🌿 100% Herbal · Bebas Bahan Kimia",
      title: "Transformasi Kulit:",
      titleAccent: "Cerah Alami & Bebas Masalah",
      subtitle:
        "Multibeauty Soap — Sabun kesehatan alami multifungsi untuk wajah, rambut & tubuh. Perpaduan dahsyat Madu, Spirulina, dan Gamat.",
      ctaPrimary: "Beli Sekarang",
      ctaPrimaryHref: "#order",
      ctaSecondary: "Lihat Testimoni",
      ctaSecondaryHref: "#testimoni",
      image: heroImage,
      bg: "linear-gradient(135deg, #fef3c7 0%, #fefce8 50%, #ecfdf5 100%)",
    },
  },
  {
    id: uid(),
    type: "text",
    visible: true,
    props: {
      title: "Lelah dengan Masalah Kulit yang Tak Kunjung Usai?",
      body: "Jerawat membandel, flek hitam, kulit kusam, gatal-gatal, luka bakar, atau rambut rontok. Anda sudah mencoba berbagai produk namun hasilnya kurang memuaskan bahkan menimbulkan efek samping. Saatnya beralih ke solusi alami yang efektif.",
      align: "center",
      bg: "#ffffff",
    },
  },
  {
    id: uid(),
    type: "features",
    visible: true,
    props: {
      title: "Kekuatan 3 Bahan Alami",
      subtitle: "Sinergi ampuh yang tidak dimiliki sabun biasa",
      columns: 3,
      bg: "linear-gradient(to bottom, #ecfdf5, #ffffff)",
      items: [
        { icon: "🍯", title: "Madu Murni", desc: "Antibakteri alami, melembapkan dan menutrisi kulit secara mendalam." },
        { icon: "🌱", title: "Spirulina", desc: "Superfood tinggi antioksidan, membantu detoksifikasi & meregenerasi sel kulit." },
        { icon: "🌊", title: "Ekstrak Gamat", desc: "Kaya kolagen laut, mempercepat penyembuhan luka, herpes, dan luka bakar." },
      ],
    },
  },
  {
    id: uid(),
    type: "checklist",
    visible: true,
    props: {
      title: "Satu Sabun, Segudang Manfaat",
      subtitle: "Solusi multi-guna untuk seluruh keluarga",
      columns: 4,
      bg: "#ffffff",
      items: [
        "Menghilangkan Jerawat",
        "Menyamarkan Flek Hitam",
        "Menyembuhkan Herpes",
        "Meredakan Luka Bakar",
        "Menumbuhkan Rambut",
        "Menghilangkan Bau Badan",
        "Menyembuhkan Luka",
        "Kulit Cerah & Sehat",
      ],
    },
  },
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
      bg: "#fffbeb",
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
      images: testimonials,
    },
  },
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
  {
    id: uid(),
    type: "checkout",
    visible: true,
    props: {
      title: "Pesan Sekarang",
      subtitle: "Isi formulir & dapatkan akun Laryzo otomatis + bonus poin jaringan",
      price: 75000,
      buttonText: "Kirim Pesanan",
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
