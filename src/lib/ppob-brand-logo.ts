import { canonicalizePpobBrand, getPpobBrandFromProductName } from './ppob-brand';

/**
 * Brand visual identity for PPOB products.
 * `slug` is used against simple-icons CDN (https://cdn.simpleicons.org/<slug>/<hex>).
 * `color` is the brand color (hex, no '#'). Used both for the logo tint and the
 * fallback initial badge when no logo slug is available.
 */
type BrandMeta = { slug?: string; color: string };

const BRAND_META: Record<string, BrandMeta> = {
  TELKOMSEL: { color: 'E60012' },
  INDOSAT: { color: 'FFD200' },
  XL: { color: '00AEEF' },
  AXIS: { color: '7B2D8E' },
  SMARTFREN: { color: 'E2231A' },
  TRI: { color: 'F58220' },
  PLN: { color: '003F87' },
  GOPAY: { slug: 'gopay', color: '00AED6' },
  OVO: { slug: 'ovo', color: '4C2A86' },
  DANA: { slug: 'dana', color: '118EEA' },
  LINKAJA: { color: 'E11931' },
  SHOPEEPAY: { slug: 'shopee', color: 'EE4D2D' },
  GRAB: { slug: 'grab', color: '00B14F' },
  MAXIM: { color: 'FFD400' },
};

export function getBrandMeta(brand: string): BrandMeta {
  const key = canonicalizePpobBrand(brand);
  return BRAND_META[key] ?? { color: '64748B' };
}

export function getBrandLogoUrl(brand: string): string | null {
  const meta = getBrandMeta(brand);
  if (!meta.slug) return null;
  return `https://cdn.simpleicons.org/${meta.slug}/${meta.color}`;
}

export function getBrandLogoUrlFromProductName(productName: string): string | null {
  return getBrandLogoUrl(getPpobBrandFromProductName(productName));
}

export function getBrandColorFromProductName(productName: string): string {
  return getBrandMeta(getPpobBrandFromProductName(productName)).color;
}
