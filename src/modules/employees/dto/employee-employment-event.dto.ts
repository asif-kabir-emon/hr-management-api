import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { EmployeeEmploymentEventType } from '../entities/employee-employment-history.entity';

export class EmployeeEmploymentEventDto {
  @ApiProperty({ enum: EmployeeEmploymentEventType })
  @IsEnum(EmployeeEmploymentEventType)
  eventType: EmployeeEmploymentEventType;

  @ApiProperty()
  @IsDateString()
  effectiveDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  lastWorkingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
