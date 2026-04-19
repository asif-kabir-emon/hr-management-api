import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class EmployeeJoiningInformationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  originalJoinDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentJoinDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  confirmationDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  probationEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  lastWorkingDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  resignationDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  rejoinCount?: number;
}
