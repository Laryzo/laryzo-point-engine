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
  props: { title?: string; body?: string; align?: "left" | "center"; bg?: string };
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
    items: { icon?: string; title: string }[];
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
  | CheckoutSection
  | FooterSection;

export type SectionType = Section["type"];

export type LandingPageRow = {
  id: string;
  slug: string;
  title: string;
  theme_draft: Theme;
  theme_published: Theme;
  sections_draft: Section[];
  sections_published: Section[];
};

export const SECTION_LIBRARY: { type: SectionType; label: string; icon: string }[] = [
  { type: "hero", label: "Hero", icon: "✨" },
  { type: "text", label: "Text Block", icon: "📝" },
  { type: "features", label: "Features / Cards", icon: "🎴" },
  { type: "checklist", label: "Checklist", icon: "✅" },
  { type: "imageText", label: "Image + Text", icon: "🖼️" },
  { type: "gallery", label: "Gallery", icon: "🎨" },
  { type: "legal", label: "Legality", icon: "🛡️" },
  { type: "checkout", label: "Checkout Form", icon: "🛒" },
  { type: "footer", label: "Footer", icon: "🔗" },
];
