import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class ResolveWorkDayDto {
  @ApiProperty()
  @IsDateString()
  date: string;
}
