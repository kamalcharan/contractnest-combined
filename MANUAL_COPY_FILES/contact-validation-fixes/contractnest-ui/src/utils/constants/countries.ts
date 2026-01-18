// src/utils/constants/countries.ts


interface State {
  code: string;
  name: string;
}

export interface Country {
  code: string;
  name: string;
  phoneCode: string;
  phoneLength: number | [number, number]; // Single number or [min, max] for variable length
  states: State[];
}

// Phone length validation helper
export const getPhoneLengthForCountry = (countryCode: string): { min: number; max: number } => {
  const country = countries.find(c => c.code === countryCode);
  if (!country) return { min: 7, max: 15 }; // Default fallback

  if (Array.isArray(country.phoneLength)) {
    return { min: country.phoneLength[0], max: country.phoneLength[1] };
  }
  return { min: country.phoneLength, max: country.phoneLength };
};

// Get country by phone code (e.g., "91" -> India)
export const getCountryByPhoneCode = (phoneCode: string): Country | undefined => {
  return countries.find(c => c.phoneCode === phoneCode);
};

export const countries: Country[] = [
  {
    code: 'IN',
    name: 'India',
    phoneCode: '91',
    phoneLength: 10,
    states: [
      { code: 'AN', name: 'Andaman and Nicobar Islands' },
      { code: 'AP', name: 'Andhra Pradesh' },
      { code: 'AR', name: 'Arunachal Pradesh' },
      { code: 'AS', name: 'Assam' },
      { code: 'BR', name: 'Bihar' },
      { code: 'CH', name: 'Chandigarh' },
      { code: 'CT', name: 'Chhattisgarh' },
      { code: 'DN', name: 'Dadra and Nagar Haveli and Daman and Diu' },
      { code: 'DL', name: 'Delhi' },
      { code: 'GA', name: 'Goa' },
      { code: 'GJ', name: 'Gujarat' },
      { code: 'HR', name: 'Haryana' },
      { code: 'HP', name: 'Himachal Pradesh' },
      { code: 'JK', name: 'Jammu and Kashmir' },
      { code: 'JH', name: 'Jharkhand' },
      { code: 'KA', name: 'Karnataka' },
      { code: 'KL', name: 'Kerala' },
      { code: 'LA', name: 'Ladakh' },
      { code: 'LD', name: 'Lakshadweep' },
      { code: 'MP', name: 'Madhya Pradesh' },
      { code: 'MH', name: 'Maharashtra' },
      { code: 'MN', name: 'Manipur' },
      { code: 'ML', name: 'Meghalaya' },
      { code: 'MZ', name: 'Mizoram' },
      { code: 'NL', name: 'Nagaland' },
      { code: 'OD', name: 'Odisha' },
      { code: 'PY', name: 'Puducherry' },
      { code: 'PB', name: 'Punjab' },
      { code: 'RJ', name: 'Rajasthan' },
      { code: 'SK', name: 'Sikkim' },
      { code: 'TN', name: 'Tamil Nadu' },
      { code: 'TG', name: 'Telangana' },
      { code: 'TR', name: 'Tripura' },
      { code: 'UP', name: 'Uttar Pradesh' },
      { code: 'UT', name: 'Uttarakhand' },
      { code: 'WB', name: 'West Bengal' }
    ]
  },
  {
    code: 'US',
    name: 'United States',
    phoneCode: '1',
    phoneLength: 10,
    states: [
      { code: 'AL', name: 'Alabama' },
      { code: 'AK', name: 'Alaska' },
      { code: 'AZ', name: 'Arizona' },
      { code: 'AR', name: 'Arkansas' },
      { code: 'CA', name: 'California' },
      { code: 'CO', name: 'Colorado' },
      { code: 'CT', name: 'Connecticut' },
      { code: 'DE', name: 'Delaware' },
      { code: 'FL', name: 'Florida' },
      { code: 'GA', name: 'Georgia' },
      { code: 'HI', name: 'Hawaii' },
      { code: 'ID', name: 'Idaho' },
      { code: 'IL', name: 'Illinois' },
      { code: 'IN', name: 'Indiana' },
      { code: 'IA', name: 'Iowa' },
      { code: 'KS', name: 'Kansas' },
      { code: 'KY', name: 'Kentucky' },
      { code: 'LA', name: 'Louisiana' },
      { code: 'ME', name: 'Maine' },
      { code: 'MD', name: 'Maryland' },
      { code: 'MA', name: 'Massachusetts' },
      { code: 'MI', name: 'Michigan' },
      { code: 'MN', name: 'Minnesota' },
      { code: 'MS', name: 'Mississippi' },
      { code: 'MO', name: 'Missouri' },
      { code: 'MT', name: 'Montana' },
      { code: 'NE', name: 'Nebraska' },
      { code: 'NV', name: 'Nevada' },
      { code: 'NH', name: 'New Hampshire' },
      { code: 'NJ', name: 'New Jersey' },
      { code: 'NM', name: 'New Mexico' },
      { code: 'NY', name: 'New York' },
      { code: 'NC', name: 'North Carolina' },
      { code: 'ND', name: 'North Dakota' },
      { code: 'OH', name: 'Ohio' },
      { code: 'OK', name: 'Oklahoma' },
      { code: 'OR', name: 'Oregon' },
      { code: 'PA', name: 'Pennsylvania' },
      { code: 'RI', name: 'Rhode Island' },
      { code: 'SC', name: 'South Carolina' },
      { code: 'SD', name: 'South Dakota' },
      { code: 'TN', name: 'Tennessee' },
      { code: 'TX', name: 'Texas' },
      { code: 'UT', name: 'Utah' },
      { code: 'VT', name: 'Vermont' },
      { code: 'VA', name: 'Virginia' },
      { code: 'WA', name: 'Washington' },
      { code: 'WV', name: 'West Virginia' },
      { code: 'WI', name: 'Wisconsin' },
      { code: 'WY', name: 'Wyoming' },
      { code: 'DC', name: 'District of Columbia' }
    ]
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    phoneCode: '44',
    phoneLength: [10, 11],
    states: [
      { code: 'ENG', name: 'England' },
      { code: 'SCT', name: 'Scotland' },
      { code: 'WLS', name: 'Wales' },
      { code: 'NIR', name: 'Northern Ireland' }
    ]
  },
  {
    code: 'AF',
    name: 'Afghanistan',
    phoneCode: '93',
    phoneLength: 9,
    states: []
  },
  {
    code: 'AL',
    name: 'Albania',
    phoneCode: '355',
    phoneLength: 9,
    states: []
  },
  {
    code: 'DZ',
    name: 'Algeria',
    phoneCode: '213',
    phoneLength: 9,
    states: []
  },
  {
    code: 'AD',
    name: 'Andorra',
    phoneCode: '376',
    phoneLength: 6,
    states: []
  },
  {
    code: 'AO',
    name: 'Angola',
    phoneCode: '244',
    phoneLength: 9,
    states: []
  },
  {
    code: 'AG',
    name: 'Antigua and Barbuda',
    phoneCode: '1268',
    phoneLength: 7,
    states: []
  },
  {
    code: 'AR',
    name: 'Argentina',
    phoneCode: '54',
    phoneLength: 10,
    states: []
  },
  {
    code: 'AM',
    name: 'Armenia',
    phoneCode: '374',
    phoneLength: 8,
    states: []
  },
  {
    code: 'AU',
    name: 'Australia',
    phoneCode: '61',
    phoneLength: 9,
    states: []
  },
  {
    code: 'AT',
    name: 'Austria',
    phoneCode: '43',
    phoneLength: [10, 11],
    states: []
  },
  {
    code: 'AZ',
    name: 'Azerbaijan',
    phoneCode: '994',
    phoneLength: 9,
    states: []
  },
  {
    code: 'BS',
    name: 'Bahamas',
    phoneCode: '1242',
    phoneLength: 7,
    states: []
  },
  {
    code: 'BH',
    name: 'Bahrain',
    phoneCode: '973',
    phoneLength: 8,
    states: []
  },
  {
    code: 'BD',
    name: 'Bangladesh',
    phoneCode: '880',
    phoneLength: 10,
    states: []
  },
  {
    code: 'BB',
    name: 'Barbados',
    phoneCode: '1246',
    phoneLength: 7,
    states: []
  },
  {
    code: 'BY',
    name: 'Belarus',
    phoneCode: '375',
    phoneLength: 9,
    states: []
  },
  {
    code: 'BE',
    name: 'Belgium',
    phoneCode: '32',
    phoneLength: 9,
    states: []
  },
  {
    code: 'BZ',
    name: 'Belize',
    phoneCode: '501',
    phoneLength: 7,
    states: []
  },
  {
    code: 'BJ',
    name: 'Benin',
    phoneCode: '229',
    phoneLength: 8,
    states: []
  },
  {
    code: 'BT',
    name: 'Bhutan',
    phoneCode: '975',
    phoneLength: 8,
    states: []
  },
  {
    code: 'BO',
    name: 'Bolivia',
    phoneCode: '591',
    phoneLength: 8,
    states: []
  },
  {
    code: 'BA',
    name: 'Bosnia and Herzegovina',
    phoneCode: '387',
    phoneLength: 8,
    states: []
  },
  {
    code: 'BW',
    name: 'Botswana',
    phoneCode: '267',
    phoneLength: 8,
    states: []
  },
  {
    code: 'BR',
    name: 'Brazil',
    phoneCode: '55',
    phoneLength: [10, 11],
    states: []
  },
  {
    code: 'BN',
    name: 'Brunei',
    phoneCode: '673',
    phoneLength: 7,
    states: []
  },
  {
    code: 'BG',
    name: 'Bulgaria',
    phoneCode: '359',
    phoneLength: 9,
    states: []
  },
  {
    code: 'BF',
    name: 'Burkina Faso',
    phoneCode: '226',
    phoneLength: 8,
    states: []
  },
  {
    code: 'BI',
    name: 'Burundi',
    phoneCode: '257',
    phoneLength: 8,
    states: []
  },
  {
    code: 'KH',
    name: 'Cambodia',
    phoneCode: '855',
    phoneLength: 9,
    states: []
  },
  {
    code: 'CM',
    name: 'Cameroon',
    phoneCode: '237',
    phoneLength: 9,
    states: []
  },
  {
    code: 'CA',
    name: 'Canada',
    phoneCode: '1',
    phoneLength: 10,
    states: []
  },
  {
    code: 'CV',
    name: 'Cape Verde',
    phoneCode: '238',
    phoneLength: 7,
    states: []
  },
  {
    code: 'CF',
    name: 'Central African Republic',
    phoneCode: '236',
    phoneLength: 8,
    states: []
  },
  {
    code: 'TD',
    name: 'Chad',
    phoneCode: '235',
    phoneLength: 8,
    states: []
  },
  {
    code: 'CL',
    name: 'Chile',
    phoneCode: '56',
    phoneLength: 9,
    states: []
  },
  {
    code: 'CN',
    name: 'China',
    phoneCode: '86',
    phoneLength: 11,
    states: []
  },
  {
    code: 'CO',
    name: 'Colombia',
    phoneCode: '57',
    phoneLength: 10,
    states: []
  },
  {
    code: 'KM',
    name: 'Comoros',
    phoneCode: '269',
    phoneLength: 7,
    states: []
  },
  {
    code: 'CD',
    name: 'Congo (DRC)',
    phoneCode: '243',
    phoneLength: 9,
    states: []
  },
  {
    code: 'CG',
    name: 'Congo (Republic)',
    phoneCode: '242',
    phoneLength: 9,
    states: []
  },
  {
    code: 'CR',
    name: 'Costa Rica',
    phoneCode: '506',
    phoneLength: 8,
    states: []
  },
  {
    code: 'CI',
    name: 'Cote d\'Ivoire',
    phoneCode: '225',
    phoneLength: 10,
    states: []
  },
  {
    code: 'HR',
    name: 'Croatia',
    phoneCode: '385',
    phoneLength: 9,
    states: []
  },
  {
    code: 'CU',
    name: 'Cuba',
    phoneCode: '53',
    phoneLength: 8,
    states: []
  },
  {
    code: 'CY',
    name: 'Cyprus',
    phoneCode: '357',
    phoneLength: 8,
    states: []
  },
  {
    code: 'CZ',
    name: 'Czech Republic',
    phoneCode: '420',
    phoneLength: 9,
    states: []
  },
  {
    code: 'DK',
    name: 'Denmark',
    phoneCode: '45',
    phoneLength: 8,
    states: []
  },
  {
    code: 'DJ',
    name: 'Djibouti',
    phoneCode: '253',
    phoneLength: 8,
    states: []
  },
  {
    code: 'DM',
    name: 'Dominica',
    phoneCode: '1767',
    phoneLength: 7,
    states: []
  },
  {
    code: 'DO',
    name: 'Dominican Republic',
    phoneCode: '1809',
    phoneLength: 7,
    states: []
  },
  {
    code: 'EC',
    name: 'Ecuador',
    phoneCode: '593',
    phoneLength: 9,
    states: []
  },
  {
    code: 'EG',
    name: 'Egypt',
    phoneCode: '20',
    phoneLength: 10,
    states: []
  },
  {
    code: 'SV',
    name: 'El Salvador',
    phoneCode: '503',
    phoneLength: 8,
    states: []
  },
  {
    code: 'GQ',
    name: 'Equatorial Guinea',
    phoneCode: '240',
    phoneLength: 9,
    states: []
  },
  {
    code: 'ER',
    name: 'Eritrea',
    phoneCode: '291',
    phoneLength: 7,
    states: []
  },
  {
    code: 'EE',
    name: 'Estonia',
    phoneCode: '372',
    phoneLength: [7, 8],
    states: []
  },
  {
    code: 'ET',
    name: 'Ethiopia',
    phoneCode: '251',
    phoneLength: 9,
    states: []
  },
  {
    code: 'FJ',
    name: 'Fiji',
    phoneCode: '679',
    phoneLength: 7,
    states: []
  },
  {
    code: 'FI',
    name: 'Finland',
    phoneCode: '358',
    phoneLength: [9, 10],
    states: []
  },
  {
    code: 'FR',
    name: 'France',
    phoneCode: '33',
    phoneLength: 9,
    states: []
  },
  {
    code: 'GA',
    name: 'Gabon',
    phoneCode: '241',
    phoneLength: 7,
    states: []
  },
  {
    code: 'GM',
    name: 'Gambia',
    phoneCode: '220',
    phoneLength: 7,
    states: []
  },
  {
    code: 'GE',
    name: 'Georgia',
    phoneCode: '995',
    phoneLength: 9,
    states: []
  },
  {
    code: 'DE',
    name: 'Germany',
    phoneCode: '49',
    phoneLength: [10, 11],
    states: []
  },
  {
    code: 'GH',
    name: 'Ghana',
    phoneCode: '233',
    phoneLength: 9,
    states: []
  },
  {
    code: 'GR',
    name: 'Greece',
    phoneCode: '30',
    phoneLength: 10,
    states: []
  },
  {
    code: 'GD',
    name: 'Grenada',
    phoneCode: '1473',
    phoneLength: 7,
    states: []
  },
  {
    code: 'GT',
    name: 'Guatemala',
    phoneCode: '502',
    phoneLength: 8,
    states: []
  },
  {
    code: 'GN',
    name: 'Guinea',
    phoneCode: '224',
    phoneLength: 9,
    states: []
  },
  {
    code: 'GW',
    name: 'Guinea-Bissau',
    phoneCode: '245',
    phoneLength: 7,
    states: []
  },
  {
    code: 'GY',
    name: 'Guyana',
    phoneCode: '592',
    phoneLength: 7,
    states: []
  },
  {
    code: 'HT',
    name: 'Haiti',
    phoneCode: '509',
    phoneLength: 8,
    states: []
  },
  {
    code: 'HN',
    name: 'Honduras',
    phoneCode: '504',
    phoneLength: 8,
    states: []
  },
  {
    code: 'HU',
    name: 'Hungary',
    phoneCode: '36',
    phoneLength: 9,
    states: []
  },
  {
    code: 'IS',
    name: 'Iceland',
    phoneCode: '354',
    phoneLength: 7,
    states: []
  },
  {
    code: 'ID',
    name: 'Indonesia',
    phoneCode: '62',
    phoneLength: [10, 12],
    states: []
  },
  {
    code: 'IR',
    name: 'Iran',
    phoneCode: '98',
    phoneLength: 10,
    states: []
  },
  {
    code: 'IQ',
    name: 'Iraq',
    phoneCode: '964',
    phoneLength: 10,
    states: []
  },
  {
    code: 'IE',
    name: 'Ireland',
    phoneCode: '353',
    phoneLength: 9,
    states: []
  },
  {
    code: 'IL',
    name: 'Israel',
    phoneCode: '972',
    phoneLength: 9,
    states: []
  },
  {
    code: 'IT',
    name: 'Italy',
    phoneCode: '39',
    phoneLength: 10,
    states: []
  },
  {
    code: 'JM',
    name: 'Jamaica',
    phoneCode: '1876',
    phoneLength: 7,
    states: []
  },
  {
    code: 'JP',
    name: 'Japan',
    phoneCode: '81',
    phoneLength: 10,
    states: []
  },
  {
    code: 'JO',
    name: 'Jordan',
    phoneCode: '962',
    phoneLength: 9,
    states: []
  },
  {
    code: 'KZ',
    name: 'Kazakhstan',
    phoneCode: '7',
    phoneLength: 10,
    states: []
  },
  {
    code: 'KE',
    name: 'Kenya',
    phoneCode: '254',
    phoneLength: 9,
    states: []
  },
  {
    code: 'KI',
    name: 'Kiribati',
    phoneCode: '686',
    phoneLength: 5,
    states: []
  },
  {
    code: 'KP',
    name: 'North Korea',
    phoneCode: '850',
    phoneLength: [10, 13],
    states: []
  },
  {
    code: 'KR',
    name: 'South Korea',
    phoneCode: '82',
    phoneLength: [9, 10],
    states: []
  },
  {
    code: 'KW',
    name: 'Kuwait',
    phoneCode: '965',
    phoneLength: 8,
    states: []
  },
  {
    code: 'KG',
    name: 'Kyrgyzstan',
    phoneCode: '996',
    phoneLength: 9,
    states: []
  },
  {
    code: 'LA',
    name: 'Laos',
    phoneCode: '856',
    phoneLength: 10,
    states: []
  },
  {
    code: 'LV',
    name: 'Latvia',
    phoneCode: '371',
    phoneLength: 8,
    states: []
  },
  {
    code: 'LB',
    name: 'Lebanon',
    phoneCode: '961',
    phoneLength: 8,
    states: []
  },
  {
    code: 'LS',
    name: 'Lesotho',
    phoneCode: '266',
    phoneLength: 8,
    states: []
  },
  {
    code: 'LR',
    name: 'Liberia',
    phoneCode: '231',
    phoneLength: [7, 8],
    states: []
  },
  {
    code: 'LY',
    name: 'Libya',
    phoneCode: '218',
    phoneLength: 9,
    states: []
  },
  {
    code: 'LI',
    name: 'Liechtenstein',
    phoneCode: '423',
    phoneLength: 7,
    states: []
  },
  {
    code: 'LT',
    name: 'Lithuania',
    phoneCode: '370',
    phoneLength: 8,
    states: []
  },
  {
    code: 'LU',
    name: 'Luxembourg',
    phoneCode: '352',
    phoneLength: 9,
    states: []
  },
  {
    code: 'MK',
    name: 'North Macedonia',
    phoneCode: '389',
    phoneLength: 8,
    states: []
  },
  {
    code: 'MG',
    name: 'Madagascar',
    phoneCode: '261',
    phoneLength: 9,
    states: []
  },
  {
    code: 'MW',
    name: 'Malawi',
    phoneCode: '265',
    phoneLength: 9,
    states: []
  },
  {
    code: 'MY',
    name: 'Malaysia',
    phoneCode: '60',
    phoneLength: [9, 10],
    states: []
  },
  {
    code: 'MV',
    name: 'Maldives',
    phoneCode: '960',
    phoneLength: 7,
    states: []
  },
  {
    code: 'ML',
    name: 'Mali',
    phoneCode: '223',
    phoneLength: 8,
    states: []
  },
  {
    code: 'MT',
    name: 'Malta',
    phoneCode: '356',
    phoneLength: 8,
    states: []
  },
  {
    code: 'MH',
    name: 'Marshall Islands',
    phoneCode: '692',
    phoneLength: 7,
    states: []
  },
  {
    code: 'MR',
    name: 'Mauritania',
    phoneCode: '222',
    phoneLength: 8,
    states: []
  },
  {
    code: 'MU',
    name: 'Mauritius',
    phoneCode: '230',
    phoneLength: 8,
    states: []
  },
  {
    code: 'MX',
    name: 'Mexico',
    phoneCode: '52',
    phoneLength: 10,
    states: []
  },
  {
    code: 'FM',
    name: 'Micronesia',
    phoneCode: '691',
    phoneLength: 7,
    states: []
  },
  {
    code: 'MD',
    name: 'Moldova',
    phoneCode: '373',
    phoneLength: 8,
    states: []
  },
  {
    code: 'MC',
    name: 'Monaco',
    phoneCode: '377',
    phoneLength: 8,
    states: []
  },
  {
    code: 'MN',
    name: 'Mongolia',
    phoneCode: '976',
    phoneLength: 8,
    states: []
  },
  {
    code: 'ME',
    name: 'Montenegro',
    phoneCode: '382',
    phoneLength: 8,
    states: []
  },
  {
    code: 'MA',
    name: 'Morocco',
    phoneCode: '212',
    phoneLength: 9,
    states: []
  },
  {
    code: 'MZ',
    name: 'Mozambique',
    phoneCode: '258',
    phoneLength: 9,
    states: []
  },
  {
    code: 'MM',
    name: 'Myanmar',
    phoneCode: '95',
    phoneLength: [8, 10],
    states: []
  },
  {
    code: 'NA',
    name: 'Namibia',
    phoneCode: '264',
    phoneLength: 9,
    states: []
  },
  {
    code: 'NR',
    name: 'Nauru',
    phoneCode: '674',
    phoneLength: 7,
    states: []
  },
  {
    code: 'NP',
    name: 'Nepal',
    phoneCode: '977',
    phoneLength: 10,
    states: []
  },
  {
    code: 'NL',
    name: 'Netherlands',
    phoneCode: '31',
    phoneLength: 9,
    states: []
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    phoneCode: '64',
    phoneLength: [8, 10],
    states: []
  },
  {
    code: 'NI',
    name: 'Nicaragua',
    phoneCode: '505',
    phoneLength: 8,
    states: []
  },
  {
    code: 'NE',
    name: 'Niger',
    phoneCode: '227',
    phoneLength: 8,
    states: []
  },
  {
    code: 'NG',
    name: 'Nigeria',
    phoneCode: '234',
    phoneLength: 10,
    states: []
  },
  {
    code: 'NO',
    name: 'Norway',
    phoneCode: '47',
    phoneLength: 8,
    states: []
  },
  {
    code: 'OM',
    name: 'Oman',
    phoneCode: '968',
    phoneLength: 8,
    states: []
  },
  {
    code: 'PK',
    name: 'Pakistan',
    phoneCode: '92',
    phoneLength: 10,
    states: []
  },
  {
    code: 'PW',
    name: 'Palau',
    phoneCode: '680',
    phoneLength: 7,
    states: []
  },
  {
    code: 'PS',
    name: 'Palestine',
    phoneCode: '970',
    phoneLength: 9,
    states: []
  },
  {
    code: 'PA',
    name: 'Panama',
    phoneCode: '507',
    phoneLength: 8,
    states: []
  },
  {
    code: 'PG',
    name: 'Papua New Guinea',
    phoneCode: '675',
    phoneLength: 8,
    states: []
  },
  {
    code: 'PY',
    name: 'Paraguay',
    phoneCode: '595',
    phoneLength: 9,
    states: []
  },
  {
    code: 'PE',
    name: 'Peru',
    phoneCode: '51',
    phoneLength: 9,
    states: []
  },
  {
    code: 'PH',
    name: 'Philippines',
    phoneCode: '63',
    phoneLength: 10,
    states: []
  },
  {
    code: 'PL',
    name: 'Poland',
    phoneCode: '48',
    phoneLength: 9,
    states: []
  },
  {
    code: 'PT',
    name: 'Portugal',
    phoneCode: '351',
    phoneLength: 9,
    states: []
  },
  {
    code: 'QA',
    name: 'Qatar',
    phoneCode: '974',
    phoneLength: 8,
    states: []
  },
  {
    code: 'RO',
    name: 'Romania',
    phoneCode: '40',
    phoneLength: 10,
    states: []
  },
  {
    code: 'RU',
    name: 'Russia',
    phoneCode: '7',
    phoneLength: 10,
    states: []
  },
  {
    code: 'RW',
    name: 'Rwanda',
    phoneCode: '250',
    phoneLength: 9,
    states: []
  },
  {
    code: 'KN',
    name: 'Saint Kitts and Nevis',
    phoneCode: '1869',
    phoneLength: 7,
    states: []
  },
  {
    code: 'LC',
    name: 'Saint Lucia',
    phoneCode: '1758',
    phoneLength: 7,
    states: []
  },
  {
    code: 'VC',
    name: 'Saint Vincent and the Grenadines',
    phoneCode: '1784',
    phoneLength: 7,
    states: []
  },
  {
    code: 'WS',
    name: 'Samoa',
    phoneCode: '685',
    phoneLength: 7,
    states: []
  },
  {
    code: 'SM',
    name: 'San Marino',
    phoneCode: '378',
    phoneLength: 10,
    states: []
  },
  {
    code: 'ST',
    name: 'Sao Tome and Principe',
    phoneCode: '239',
    phoneLength: 7,
    states: []
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    phoneCode: '966',
    phoneLength: 9,
    states: []
  },
  {
    code: 'SN',
    name: 'Senegal',
    phoneCode: '221',
    phoneLength: 9,
    states: []
  },
  {
    code: 'RS',
    name: 'Serbia',
    phoneCode: '381',
    phoneLength: [8, 9],
    states: []
  },
  {
    code: 'SC',
    name: 'Seychelles',
    phoneCode: '248',
    phoneLength: 7,
    states: []
  },
  {
    code: 'SL',
    name: 'Sierra Leone',
    phoneCode: '232',
    phoneLength: 8,
    states: []
  },
  {
    code: 'SG',
    name: 'Singapore',
    phoneCode: '65',
    phoneLength: 8,
    states: []
  },
  {
    code: 'SK',
    name: 'Slovakia',
    phoneCode: '421',
    phoneLength: 9,
    states: []
  },
  {
    code: 'SI',
    name: 'Slovenia',
    phoneCode: '386',
    phoneLength: 8,
    states: []
  },
  {
    code: 'SB',
    name: 'Solomon Islands',
    phoneCode: '677',
    phoneLength: 7,
    states: []
  },
  {
    code: 'SO',
    name: 'Somalia',
    phoneCode: '252',
    phoneLength: [7, 8],
    states: []
  },
  {
    code: 'ZA',
    name: 'South Africa',
    phoneCode: '27',
    phoneLength: 9,
    states: []
  },
  {
    code: 'SS',
    name: 'South Sudan',
    phoneCode: '211',
    phoneLength: 9,
    states: []
  },
  {
    code: 'ES',
    name: 'Spain',
    phoneCode: '34',
    phoneLength: 9,
    states: []
  },
  {
    code: 'LK',
    name: 'Sri Lanka',
    phoneCode: '94',
    phoneLength: 9,
    states: []
  },
  {
    code: 'SD',
    name: 'Sudan',
    phoneCode: '249',
    phoneLength: 9,
    states: []
  },
  {
    code: 'SR',
    name: 'Suriname',
    phoneCode: '597',
    phoneLength: 7,
    states: []
  },
  {
    code: 'SE',
    name: 'Sweden',
    phoneCode: '46',
    phoneLength: [9, 10],
    states: []
  },
  {
    code: 'CH',
    name: 'Switzerland',
    phoneCode: '41',
    phoneLength: 9,
    states: []
  },
  {
    code: 'SY',
    name: 'Syria',
    phoneCode: '963',
    phoneLength: 9,
    states: []
  },
  {
    code: 'TW',
    name: 'Taiwan',
    phoneCode: '886',
    phoneLength: 9,
    states: []
  },
  {
    code: 'TJ',
    name: 'Tajikistan',
    phoneCode: '992',
    phoneLength: 9,
    states: []
  },
  {
    code: 'TZ',
    name: 'Tanzania',
    phoneCode: '255',
    phoneLength: 9,
    states: []
  },
  {
    code: 'TH',
    name: 'Thailand',
    phoneCode: '66',
    phoneLength: 9,
    states: []
  },
  {
    code: 'TL',
    name: 'Timor-Leste',
    phoneCode: '670',
    phoneLength: 8,
    states: []
  },
  {
    code: 'TG',
    name: 'Togo',
    phoneCode: '228',
    phoneLength: 8,
    states: []
  },
  {
    code: 'TO',
    name: 'Tonga',
    phoneCode: '676',
    phoneLength: 7,
    states: []
  },
  {
    code: 'TT',
    name: 'Trinidad and Tobago',
    phoneCode: '1868',
    phoneLength: 7,
    states: []
  },
  {
    code: 'TN',
    name: 'Tunisia',
    phoneCode: '216',
    phoneLength: 8,
    states: []
  },
  {
    code: 'TR',
    name: 'Turkey',
    phoneCode: '90',
    phoneLength: 10,
    states: []
  },
  {
    code: 'TM',
    name: 'Turkmenistan',
    phoneCode: '993',
    phoneLength: 8,
    states: []
  },
  {
    code: 'TV',
    name: 'Tuvalu',
    phoneCode: '688',
    phoneLength: 6,
    states: []
  },
  {
    code: 'UG',
    name: 'Uganda',
    phoneCode: '256',
    phoneLength: 9,
    states: []
  },
  {
    code: 'UA',
    name: 'Ukraine',
    phoneCode: '380',
    phoneLength: 9,
    states: []
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    phoneCode: '971',
    phoneLength: 9,
    states: []
  },
  {
    code: 'UY',
    name: 'Uruguay',
    phoneCode: '598',
    phoneLength: 8,
    states: []
  },
  {
    code: 'UZ',
    name: 'Uzbekistan',
    phoneCode: '998',
    phoneLength: 9,
    states: []
  },
  {
    code: 'VU',
    name: 'Vanuatu',
    phoneCode: '678',
    phoneLength: 7,
    states: []
  },
  {
    code: 'VA',
    name: 'Vatican City',
    phoneCode: '379',
    phoneLength: 10,
    states: []
  },
  {
    code: 'VE',
    name: 'Venezuela',
    phoneCode: '58',
    phoneLength: 10,
    states: []
  },
  {
    code: 'VN',
    name: 'Vietnam',
    phoneCode: '84',
    phoneLength: 10,
    states: []
  },
  {
    code: 'YE',
    name: 'Yemen',
    phoneCode: '967',
    phoneLength: 9,
    states: []
  },
  {
    code: 'ZM',
    name: 'Zambia',
    phoneCode: '260',
    phoneLength: 9,
    states: []
  },
  {
    code: 'ZW',
    name: 'Zimbabwe',
    phoneCode: '263',
    phoneLength: 9,
    states: []
  }
];