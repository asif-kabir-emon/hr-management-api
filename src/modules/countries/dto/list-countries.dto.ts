import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListCountriesDto {
  @ApiPropertyOptional({
    description: 'Search by country name, official name, ISO code, dial code, or currency code.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by region, for example Asia, Europe, Africa, Americas, Oceania.',
  })
  @IsOptional()
  @IsString()
  region?: string;
}
