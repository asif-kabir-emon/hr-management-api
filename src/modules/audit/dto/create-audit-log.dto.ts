import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { Action } from "../enums/action.enum";

export class CreateAuditLogDto {
  @ApiProperty()
  @IsString()
  actorId: string;

  @ApiProperty()
  @IsEnum(Action)
  action: Action = Action.VIEW;

  @ApiProperty()
  @IsString()
  module: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
