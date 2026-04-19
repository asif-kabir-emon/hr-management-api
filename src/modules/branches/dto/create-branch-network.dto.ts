import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIP,
  IsOptional,
  IsString,
} from 'class-validator';
import { BranchNetworkType } from '../entities/branch-network.entity';

export class CreateBranchNetworkDto {
  @ApiPropertyOptional({
    enum: BranchNetworkType,
    default: BranchNetworkType.PublicIp,
  })
  @IsOptional()
  @IsEnum(BranchNetworkType)
  networkType?: BranchNetworkType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional({ example: '192.168.1.0/24' })
  @IsOptional()
  @IsString()
  cidr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validTo?: string;
}
