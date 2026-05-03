/**
 * PPOB brand/provider normalization.
 *
 * We don't store provider explicitly on `products`, so the UI infers it from `products.name`.
 * This helper keeps the logic consistent across Admin + Customer portal.
 */

export function canonicalizePpobBrand(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

export function getPpobBrandFromProductName(productName: string): string {
  const n = ` ${canonicalizePpobBrand(productName)
    .replace(/[_\-]+/g, ' ')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')} `;

  // Pulsa providers
  if (n.includes(' TELKOMSEL ') || n.startsWith(' TELKOMSEL ')) return 'TELKOMSEL';
  if (n.includes(' INDOSAT ') || n.startsWith(' INDOSAT ')) return 'INDOSAT';
  if (n.includes(' SMARTFREN ') || n.startsWith(' SMARTFREN ')) return 'SMARTFREN';
  if (n.includes(' AXIS ') || n.startsWith(' AXIS ')) return 'AXIS';
  if (n.includes(' XL ') || n.startsWith(' XL ')) return 'XL';

  // TRI is often written as "Three" in Digiflazz names
  if (n.includes(' TRI ') || n.startsWith(' TRI ') || n.includes(' THREE ') || n.startsWith(' THREE ')) return 'TRI';

  // E-wallet providers (common variants)
  // GoPay: split into Customer (penumpang/customer) vs Driver (driver/mitra)
  const isGopay = n.includes(' GOPAY ') || n.includes(' GO PAY ');
  if (isGopay) {
    if (n.includes(' DRIVER ') || n.includes(' MITRA ')) return 'GOPAY DRIVER';
    if (n.includes(' CUSTOMER ') || n.includes(' PENUMPANG ') || n.includes(' PELANGGAN ')) return 'GOPAY CUSTOMER';
    return 'GOPAY CUSTOMER';
  }
  if (n.includes(' OVO ') || n.startsWith(' OVO ')) return 'OVO';
  if (n.includes(' DANA ') || n.startsWith(' DANA ')) return 'DANA';
  if (n.includes(' LINKAJA ') || n.startsWith(' LINKAJA ')) return 'LINKAJA';
  if (n.includes(' SHOPEE ') || n.includes(' SHOPEEPAY ') || n.includes(' SHOPEE PAY ') || n.startsWith(' SHOPEE ')) return 'SHOPEEPAY';

  // Grab: split into Customer (penumpang/customer) vs Driver
  if (n.includes(' GRAB ') || n.startsWith(' GRAB ')) {
    if (n.includes(' DRIVER ') || n.includes(' MITRA ')) return 'GRAB DRIVER';
    if (n.includes(' CUSTOMER ') || n.includes(' PENUMPANG ') || n.includes(' PELANGGAN ')) return 'GRAB CUSTOMER';
    return 'GRAB CUSTOMER';
  }

  // Maxim: split into Customer vs Driver
  if (n.includes(' MAXIM ') || n.startsWith(' MAXIM ')) {
    if (n.includes(' DRIVER ') || n.includes(' MITRA ')) return 'MAXIM DRIVER';
    if (n.includes(' CUSTOMER ') || n.includes(' PENUMPANG ') || n.includes(' PELANGGAN ')) return 'MAXIM CUSTOMER';
    return 'MAXIM CUSTOMER';
  }

  // PLN
  if (n.includes(' PLN ') || n.includes(' TOKEN ') || n.startsWith(' PLN ')) return 'PLN';

  // Fallback: first word token
  const first = canonicalizePpobBrand(productName).split(' ')[0] || '';
  return first.length > 0 ? first : 'LAINNYA';
}
