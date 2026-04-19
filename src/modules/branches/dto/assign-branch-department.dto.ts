import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { BranchDepartmentStatus } from '../entities/branch-department.entity';

export class AssignBranchDepartmentDto {
  @ApiProperty()
  @IsUUID()
  departmentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  localName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  floorNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomNo?: string;

  @ApiPropertyOptional({
    enum: [BranchDepartmentStatus.Inactive, BranchDepartmentStatus.Active],
    description: '0 = inactive, 1 = active',
    default: BranchDepartmentStatus.Active,
  })
  @IsOptional()
  @IsEnum(BranchDepartmentStatus)
  status?: BranchDepartmentStatus;
}
