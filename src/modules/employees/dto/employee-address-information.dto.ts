import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class EmployeeAddressInformationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentAddressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentAddressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentAddressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentAddressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentPostalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentCountry?: string;
}
