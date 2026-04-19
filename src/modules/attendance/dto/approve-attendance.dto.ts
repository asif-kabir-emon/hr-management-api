import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AttendanceApprovalStatus } from '../entities/attendance.entity';

export class ApproveAttendanceDto {
  @ApiProperty({ enum: AttendanceApprovalStatus })
  @IsEnum(AttendanceApprovalStatus)
  approvalStatus: AttendanceApprovalStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  approvalNotes?: string;
}
