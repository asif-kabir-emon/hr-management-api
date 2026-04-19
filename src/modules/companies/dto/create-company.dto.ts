import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { CompanyStatus } from '../entities/company.entity';

export class CreateCompanyDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    enum: [CompanyStatus.Inactive, CompanyStatus.Active],
    description: '0 = inactive, 1 = active',
    default: CompanyStatus.Active,
  })
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
}
