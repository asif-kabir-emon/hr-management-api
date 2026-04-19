import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CountriesService } from './countries.service';
import { ListCountriesDto } from './dto/list-countries.dto';

@ApiTags('countries')
@Controller({
  path: 'countries',
  version: '1',
})
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  @ApiOperation({
    summary: 'List countries',
    description:
      'Returns static country reference data for frontend dropdowns, phone inputs, and address forms.',
  })
  findAll(@Query() listCountriesDto: ListCountriesDto) {
    return this.countriesService.findAll(listCountriesDto);
  }

  @Get(':code')
  @ApiOperation({
    summary: 'Get country by ISO code',
    description: 'Finds one country by alpha-2 or alpha-3 ISO code.',
  })
  @ApiParam({
    name: 'code',
    example: 'BD',
    description: 'ISO alpha-2 or alpha-3 country code.',
  })
  findOne(@Param('code') code: string) {
    return this.countriesService.findOne(code);
  }
}
