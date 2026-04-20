import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";
import { OfficeTypeStatus } from "../entities/office-type.entity";

export class CreateOfficeTypeDto {
  @ApiPropertyOptional({
    description:
      "Optional company owner. Leave empty for global office/branch type.",
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: [OfficeTypeStatus.Inactive, OfficeTypeStatus.Active],
    description: "0 = inactive, 1 = active",
    default: OfficeTypeStatus.Active,
  })
  @IsOptional()
  @IsEnum(OfficeTypeStatus)
  status?: OfficeTypeStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
