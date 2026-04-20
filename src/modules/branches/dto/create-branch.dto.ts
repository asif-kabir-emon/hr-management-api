import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { BranchStatus } from '../entities/branch.entity';

export class CreateBranchDto {
  @ApiProperty()
  @IsUUID()
  companyId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Dynamic office/branch type ID from GET /office-types.',
  })
  @IsOptional()
  @IsUUID()
  officeTypeId?: string;

  @ApiPropertyOptional({
    description:
      'Legacy branch type text. Prefer officeTypeId for new frontend implementation.',
  })
  @IsOptional()
  @IsString()
  branchType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerEmployeeId?: string;

  @ApiPropertyOptional({
    enum: [
      BranchStatus.Inactive,
      BranchStatus.Active,
      BranchStatus.Closed,
    ],
    description: '0 = inactive, 1 = active, 2 = closed',
    default: BranchStatus.Active,
  })
  @IsOptional()
  @IsEnum(BranchStatus)
  status?: BranchStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  openedOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  closedOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stateCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
