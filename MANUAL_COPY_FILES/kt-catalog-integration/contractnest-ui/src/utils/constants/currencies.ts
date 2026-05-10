// src/utils/constants/currencies.ts
// Master currency list used across ContractNest — pricing, catalog, contracts, KT

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  geo: string;        // ISO 3166-1 alpha-2 country/region code (used for KT pricing geo context)
  isDefault?: boolean;
  isActive?: boolean;
}

export const currencyOptions: CurrencyOption[] = [
  // South Asia
  { code: 'INR', name: 'Indian Rupee',           symbol: '₹',   geo: 'IN',  isDefault: true,  isActive: true },

  // North America
  { code: 'USD', name: 'US Dollar',              symbol: '$',   geo: 'US',  isActive: true },
  { code: 'CAD', name: 'Canadian Dollar',        symbol: 'CA$', geo: 'CA',  isActive: true },
  { code: 'MXN', name: 'Mexican Peso',           symbol: 'MX$', geo: 'MX',  isActive: true },

  // Europe
  { code: 'EUR', name: 'Euro',                   symbol: '€',   geo: 'EU',  isActive: true },
  { code: 'GBP', name: 'British Pound',          symbol: '£',   geo: 'GB',  isActive: true },
  { code: 'CHF', name: 'Swiss Franc',            symbol: 'CHF', geo: 'CH',  isActive: true },
  { code: 'SEK', name: 'Swedish Krona',          symbol: 'kr',  geo: 'SE',  isActive: true },
  { code: 'NOK', name: 'Norwegian Krone',        symbol: 'kr',  geo: 'NO',  isActive: true },
  { code: 'DKK', name: 'Danish Krone',           symbol: 'kr',  geo: 'DK',  isActive: true },
  { code: 'PLN', name: 'Polish Złoty',           symbol: 'zł',  geo: 'PL',  isActive: true },
  { code: 'CZK', name: 'Czech Koruna',           symbol: 'Kč',  geo: 'CZ',  isActive: true },

  // Middle East & Africa
  { code: 'AED', name: 'UAE Dirham',             symbol: 'AED', geo: 'AE',  isActive: true },
  { code: 'SAR', name: 'Saudi Riyal',            symbol: 'SAR', geo: 'SA',  isActive: true },
  { code: 'QAR', name: 'Qatari Riyal',           symbol: 'QAR', geo: 'QA',  isActive: true },
  { code: 'KWD', name: 'Kuwaiti Dinar',          symbol: 'KD',  geo: 'KW',  isActive: true },
  { code: 'BHD', name: 'Bahraini Dinar',         symbol: 'BD',  geo: 'BH',  isActive: true },
  { code: 'OMR', name: 'Omani Rial',             symbol: 'OMR', geo: 'OM',  isActive: true },
  { code: 'ZAR', name: 'South African Rand',     symbol: 'R',   geo: 'ZA',  isActive: true },
  { code: 'NGN', name: 'Nigerian Naira',         symbol: '₦',   geo: 'NG',  isActive: true },
  { code: 'KES', name: 'Kenyan Shilling',        symbol: 'KSh', geo: 'KE',  isActive: true },

  // Asia-Pacific
  { code: 'SGD', name: 'Singapore Dollar',       symbol: 'S$',  geo: 'SG',  isActive: true },
  { code: 'MYR', name: 'Malaysian Ringgit',      symbol: 'RM',  geo: 'MY',  isActive: true },
  { code: 'AUD', name: 'Australian Dollar',      symbol: 'A$',  geo: 'AU',  isActive: true },
  { code: 'NZD', name: 'New Zealand Dollar',     symbol: 'NZ$', geo: 'NZ',  isActive: true },
  { code: 'JPY', name: 'Japanese Yen',           symbol: '¥',   geo: 'JP',  isActive: true },
  { code: 'CNY', name: 'Chinese Yuan',           symbol: '¥',   geo: 'CN',  isActive: true },
  { code: 'HKD', name: 'Hong Kong Dollar',       symbol: 'HK$', geo: 'HK',  isActive: true },
  { code: 'THB', name: 'Thai Baht',              symbol: '฿',   geo: 'TH',  isActive: true },
  { code: 'IDR', name: 'Indonesian Rupiah',      symbol: 'Rp',  geo: 'ID',  isActive: true },
  { code: 'PHP', name: 'Philippine Peso',        symbol: '₱',   geo: 'PH',  isActive: true },
  { code: 'VND', name: 'Vietnamese Dong',        symbol: '₫',   geo: 'VN',  isActive: true },
  { code: 'BDT', name: 'Bangladeshi Taka',       symbol: '৳',   geo: 'BD',  isActive: true },
  { code: 'PKR', name: 'Pakistani Rupee',        symbol: '₨',   geo: 'PK',  isActive: true },
  { code: 'LKR', name: 'Sri Lankan Rupee',       symbol: 'Rs',  geo: 'LK',  isActive: true },

  // Latin America
  { code: 'BRL', name: 'Brazilian Real',         symbol: 'R$',  geo: 'BR',  isActive: true },
  { code: 'ARS', name: 'Argentine Peso',         symbol: 'AR$', geo: 'AR',  isActive: true },
  { code: 'CLP', name: 'Chilean Peso',           symbol: 'CL$', geo: 'CL',  isActive: true },
  { code: 'COP', name: 'Colombian Peso',         symbol: 'CO$', geo: 'CO',  isActive: true },
];

export const getDefaultCurrency = (): CurrencyOption =>
  currencyOptions.find((c) => c.isDefault) ?? currencyOptions[0];

export const getCurrencySymbol = (code: string): string =>
  currencyOptions.find((c) => c.code === code)?.symbol ?? code;

export const getCurrencyGeo = (code: string): string =>
  currencyOptions.find((c) => c.code === code)?.geo ?? 'IN';
