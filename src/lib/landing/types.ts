export type Theme = {
  primary?: string;
  primaryDark?: string;
  accent?: string;
  bg?: string;
  text?: string;
  font?: string;
};

export type SectionBase = {
  id: string;
  visible: boolean;
};

export type HeroSection = SectionBase & {
  type: "hero";
  props: {
    badge?: string;
    title?: string;
    titleAccent?: string;
    subtitle?: string;
    ctaPrimary?: string;
    ctaPrimaryHref?: string;
    ctaSecondary?: string;
    ctaSecondaryHref?: string;
    image?: string;
    bg?: string;
  };
};

export type TextSection = SectionBase & {
  type: "text";
  props: { title?: string; subtitle?: string; body?: string; align?: "left" | "center"; bg?: string };
};

export type FeaturesSection = SectionBase & {
  type: "features";
  props: {
    title?: string;
    subtitle?: string;
    items: { icon?: string; title: string; desc: string }[];
    columns?: number;
    bg?: string;
  };
};

export type ChecklistSection = SectionBase & {
  type: "checklist";
  props: { title?: string; subtitle?: string; items: string[]; columns?: number; bg?: string };
};

export type ImageTextSection = SectionBase & {
  type: "imageText";
  props: {
    badge?: string;
    title?: string;
    body?: string;
    image?: string;
    imagePosition?: "left" | "right";
    bg?: string;
  };
};

export type GallerySection = SectionBase & {
  type: "gallery";
  props: { title?: string; subtitle?: string; images: string[]; columns?: number; bg?: string };
};

export type LegalSection = SectionBase & {
  type: "legal";
  props: {
    badge?: string;
    title?: string;
    body?: string;
    items: { icon?: string; title: string; image?: string; fileType?: "image" | "pdf"; description?: string }[];
    bg?: string;
  };
};

export type UsageSection = SectionBase & {
  type: "usage";
  props: {
    title?: string;
    subtitle?: string;
    items: { icon?: string; label: string }[];
    footer?: string;
    bg?: string;
  };
};

export type ComparisonSection = SectionBase & {
  type: "comparison";
  props: {
    title?: string;
    subtitle?: string;
    leftTitle?: string;
    leftSubtitle?: string;
    leftItems: { icon?: string; label: string; price: string }[];
    leftTotalLabel?: string;
    leftTotal?: string;
    rightTitle?: string;
    rightSubtitle?: string;
    rightImage?: string;
    rightPrice?: string;
    rightPriceLabel?: string;
    rightBenefits: string[];
    rightFooter?: string;
    bg?: string;
  };
};

export type BeforeAfterSection = SectionBase & {
  type: "beforeAfter";
  props: {
    title?: string;
    subtitle?: string;
    disclaimer?: string;
    items: { before: string; after: string; caption?: string; duration?: string }[];
    bg?: string;
  };
};

export type TestimonialsSection = SectionBase & {
  type: "testimonials";
  props: {
    title?: string;
    subtitle?: string;
    items: { photo?: string; quote: string; name: string; location?: string }[];
    columns?: number;
    bg?: string;
  };
};

export type CountdownSection = SectionBase & {
  type: "countdown";
  props: {
    title?: string;
    subtitle?: string;
    endsAt?: string; // ISO string
    ctaText?: string;
    ctaHref?: string;
    bonusText?: string;
    bg?: string;
  };
};

export type CheckoutSection = SectionBase & {
  type: "checkout";
  props: {
    title?: string;
    subtitle?: string;
    price?: number;
    buttonText?: string;
    bg?: string;
  };
};

export type FooterSection = SectionBase & {
  type: "footer";
  props: { brand?: string; text?: string; copyright?: string; bg?: string };
};

export type Section =
  | HeroSection
  | TextSection
  | FeaturesSection
  | ChecklistSection
  | ImageTextSection
  | GallerySection
  | LegalSection
  | UsageSection
  | ComparisonSection
  | BeforeAfterSection
  | TestimonialsSection
  | CountdownSection
  | CheckoutSection
  | FooterSection;

export type SectionType = Section["type"];

export type ChatbotSettings = {
  enabled?: boolean;
  welcomeMessage?: string;
  aiPrompt?: string;
  waNumber?: string;
  waMessage?: string;
};

export type LandingSettings = {
  chatbot?: ChatbotSettings;
  checkout?: {
    productId?: string;
    price?: number;
    successMessage?: string;
  };
};

export type LandingPageRow = {
  id: string;
  slug: string;
  title: string;
  theme_draft: Theme;
  theme_published: Theme;
  sections_draft: Section[];
  sections_published: Section[];
  settings_draft: LandingSettings;
  settings_published: LandingSettings;
};

export const SECTION_LIBRARY: { type: SectionType; label: string; icon: string }[] = [
  { type: "hero", label: "Hero", icon: "✨" },
  { type: "text", label: "Text Block", icon: "📝" },
  { type: "features", label: "Features / Cards", icon: "🎴" },
  { type: "checklist", label: "Checklist", icon: "✅" },
  { type: "imageText", label: "Image + Text", icon: "🖼️" },
  { type: "usage", label: "Usage / Multi-guna", icon: "🧼" },
  { type: "comparison", label: "Comparison", icon: "⚖️" },
  { type: "beforeAfter", label: "Before / After", icon: "🔄" },
  { type: "testimonials", label: "Testimonials", icon: "💬" },
  { type: "countdown", label: "Countdown", icon: "⏰" },
  { type: "gallery", label: "Gallery", icon: "🎨" },
  { type: "legal", label: "Legality", icon: "🛡️" },
  { type: "checkout", label: "Checkout Form", icon: "🛒" },
  { type: "footer", label: "Footer", icon: "🔗" },
];
