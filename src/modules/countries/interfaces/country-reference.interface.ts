export interface CountryCurrencyReference {
  code: string;
  name: string;
  symbol: string;
}

export interface CountryLanguageReference {
  code: string;
  name: string;
}

export interface CountryReference {
  name: string;
  officialName: string;
  alpha2Code: string;
  alpha3Code: string;
  numericCode: string | null;
  dialCode: string | null;
  dialCodes: string[];
  flag: string;
  region: string | null;
  subregion: string | null;
  capital: string | null;
  capitals: string[];
  currencyCodes: string[];
  currencies: CountryCurrencyReference[];
  languageCodes: string[];
  languages: CountryLanguageReference[];
  timezones: string[];
}
