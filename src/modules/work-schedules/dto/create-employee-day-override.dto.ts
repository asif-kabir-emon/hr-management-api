import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { EmployeeDayOverrideType } from '../entities/employee-day-override.entity';

export class CreateEmployeeDayOverrideDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty({ enum: EmployeeDayOverrideType })
  @IsEnum(EmployeeDayOverrideType)
  type: EmployeeDayOverrideType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
