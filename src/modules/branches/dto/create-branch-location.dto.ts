import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBranchLocationDto {
  @ApiPropertyOptional({ default: 'main' })
  @IsOptional()
  @IsString()
  locationLabel?: string;

  @ApiProperty()
  @IsString()
  addressLine1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stateRegion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty()
  @IsString()
  country: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiProperty()
  @IsString()
  timezone: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
