import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsIP,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateOfficeLocationDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationLabel?: string;

  @ApiProperty()
  @IsLatitude()
  latitude: number;

  @ApiProperty()
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsIP(undefined, { each: true })
  trustedIps?: string[];

  @ApiPropertyOptional({ default: 150 })
  @IsOptional()
  @IsInt()
  @Min(1)
  allowedRadiusMeters?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
