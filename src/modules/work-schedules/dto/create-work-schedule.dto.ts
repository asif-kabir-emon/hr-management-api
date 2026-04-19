import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { WorkDayRuleDto } from './work-day-rule.dto';

export class WeekDaysDto {
  @ApiProperty({ type: WorkDayRuleDto })
  @ValidateNested()
  @Type(() => WorkDayRuleDto)
  monday: WorkDayRuleDto;

  @ApiProperty({ type: WorkDayRuleDto })
  @ValidateNested()
  @Type(() => WorkDayRuleDto)
  tuesday: WorkDayRuleDto;

  @ApiProperty({ type: WorkDayRuleDto })
  @ValidateNested()
  @Type(() => WorkDayRuleDto)
  wednesday: WorkDayRuleDto;

  @ApiProperty({ type: WorkDayRuleDto })
  @ValidateNested()
  @Type(() => WorkDayRuleDto)
  thursday: WorkDayRuleDto;

  @ApiProperty({ type: WorkDayRuleDto })
  @ValidateNested()
  @Type(() => WorkDayRuleDto)
  friday: WorkDayRuleDto;

  @ApiProperty({ type: WorkDayRuleDto })
  @ValidateNested()
  @Type(() => WorkDayRuleDto)
  saturday: WorkDayRuleDto;

  @ApiProperty({ type: WorkDayRuleDto })
  @ValidateNested()
  @Type(() => WorkDayRuleDto)
  sunday: WorkDayRuleDto;
}

export class CreateWorkScheduleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: WeekDaysDto })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => WeekDaysDto)
  weekDays: WeekDaysDto;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
