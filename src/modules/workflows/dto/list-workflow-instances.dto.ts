import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { WorkflowInstanceStatus } from '../entities/workflow-instance.entity';

export class ListWorkflowInstancesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({ enum: WorkflowInstanceStatus })
  @IsOptional()
  @IsString()
  status?: WorkflowInstanceStatus;
}
