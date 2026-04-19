import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIP,
  IsISO8601,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '../entities/attendance.entity';
import { AttendanceBreakDto } from './attendance-break.dto';
import { AttendanceLocationDto } from './attendance-location.dto';

export class CreateAttendanceDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;

  @ApiProperty()
  @IsDateString()
  workDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  checkInAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  checkOutAt?: string;

  @ApiPropertyOptional({ type: AttendanceLocationDto })
  @IsOptional()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => AttendanceLocationDto)
  checkInLocation?: AttendanceLocationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIP()
  checkInIp?: string;

  @ApiPropertyOptional({ type: AttendanceLocationDto })
  @IsOptional()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => AttendanceLocationDto)
  checkOutLocation?: AttendanceLocationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIP()
  checkOutIp?: string;

  @ApiPropertyOptional({ type: [AttendanceBreakDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => AttendanceBreakDto)
  breakRecords?: AttendanceBreakDto[];

  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
