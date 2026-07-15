import { canonicalizePpobBrand, getPpobBrandFromProductName } from './ppob-brand';

/**
 * Brand visual identity for PPOB products.
 *
 * `logoUrl` – direct URL to the brand's real logo image (Wikimedia Commons).
 * `color`   – brand color (hex, no '#'). Used for the logo background tint and
 *             the fallback initial badge when no logoUrl exists.
 */
type BrandMeta = { logoUrl?: string; color: string };

const BRAND_META: Record<string, BrandMeta> = {
  TELKOMSEL: { logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Telkomsel_2021_icon.svg?width=200', color: 'E60012' },
  INDOSAT:   { logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Indosat_Ooredoo_logo_(2019).svg?width=200', color: 'FFD200' },
  XL:        { logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/XL_Axiata_2014.svg?width=200', color: '00AEEF' },
  AXIS:      { logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Axis_logo_2015.svg?width=200', color: '7B2D8E' },
  SMARTFREN: { logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Smartfren_logo.svg?width=200', color: 'E2231A' },
  TRI:       { logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Three_logo.svg?width=200', color: 'F58220' },
  PLN:       { logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Logo_PLN.svg?width=200', color: '003F87' },
  GOPAY:     { logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Gopay_logo.svg?width=200', color: '00AED6' },
  OVO:       { logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Logo_ovo_purple.svg?width=200', color: '4C2A86' },
  DANA:      { logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Logo_dana_blue.svg?width=200', color: '118EEA' },
  LINKAJA:   { logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/LinkAja.svg?width=200', color: 'E11931' },
  SHOPEEPAY: { logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Shopee.svg?width=200', color: 'EE4D2D' },
  GRAB:      { logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Grab_Logo.svg?width=200', color: '00B14F' },
  MAXIM:     { logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Maxim-Logo.svg?width=200', color: 'FFD400' },
};

export function getBrandMeta(brand: string): BrandMeta {
  const key = canonicalizePpobBrand(brand);
  return BRAND_META[key] ?? { color: '64748B' };
}

export function getBrandLogoUrl(brand: string): string | null {
  const meta = getBrandMeta(brand);
  return meta.logoUrl ?? null;
}

export function getBrandLogoUrlFromProductName(productName: string): string | null {
  return getBrandLogoUrl(getPpobBrandFromProductName(productName));
}

export function getBrandColorFromProductName(productName: string): string {
  return getBrandMeta(getPpobBrandFromProductName(productName)).color;
}
