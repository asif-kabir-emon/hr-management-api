import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OffDayReplacementRequestStatus } from '../entities/off-day-replacement-request.entity';

export class ReviewOffDayReplacementRequestDto {
  @ApiProperty({ enum: OffDayReplacementRequestStatus })
  @IsEnum(OffDayReplacementRequestStatus)
  status: OffDayReplacementRequestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
