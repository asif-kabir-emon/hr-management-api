import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { NoticeStatus } from '../entities/notice.entity';

export class UpdateNoticeStatusDto {
  @ApiProperty({ enum: NoticeStatus })
  @IsEnum(NoticeStatus)
  status: NoticeStatus;
}
