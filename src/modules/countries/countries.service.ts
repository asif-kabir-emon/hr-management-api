import { Injectable, NotFoundException } from '@nestjs/common';
import { ListCountriesDto } from './dto/list-countries.dto';
import { COUNTRIES } from './data/countries.data';

@Injectable()
export class CountriesService {
  findAll(listCountriesDto: ListCountriesDto) {
    const search = listCountriesDto.search?.trim().toLowerCase();
    const region = listCountriesDto.region?.trim().toLowerCase();

    return COUNTRIES.filter((country) => {
      const matchesRegion = region
        ? country.region?.toLowerCase() === region
        : true;

      if (!matchesRegion) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [
        country.name,
        country.officialName,
        country.alpha2Code,
        country.alpha3Code,
        country.numericCode,
        country.dialCode,
        ...country.dialCodes,
        ...country.currencyCodes,
        ...country.languageCodes,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search));
    });
  }

  findOne(code: string) {
    const normalizedCode = code.trim().toLowerCase();
    const country = COUNTRIES.find(
      (item) =>
        item.alpha2Code.toLowerCase() === normalizedCode ||
        item.alpha3Code.toLowerCase() === normalizedCode,
    );

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return country;
  }
}
