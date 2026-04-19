import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

export class UpdateUserAccessDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsString()
  role?: UserRole;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((permission) =>
          typeof permission === 'string' ? permission.trim() : permission,
        )
      : value,
  )
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mergeWithRoleTemplate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
