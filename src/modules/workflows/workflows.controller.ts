import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Permissions } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../auth/interfaces/current-user.interface';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';
import { ListWorkflowInstancesDto } from './dto/list-workflow-instances.dto';
import { ReviewWorkflowInstanceDto } from './dto/review-workflow-instance.dto';
import { UpdateWorkflowDefinitionDto } from './dto/update-workflow-definition.dto';
import { WorkflowsService } from './workflows.service';

@ApiTags('workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({
  path: 'workflows',
  version: '1',
})
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get('definitions')
  @RequirePermissions(Permissions.WorkflowRead)
  findDefinitions() {
    return this.workflowsService.findDefinitions();
  }

  @Post('definitions')
  @RequirePermissions(Permissions.WorkflowCreate)
  createDefinition(@Body() createWorkflowDefinitionDto: CreateWorkflowDefinitionDto) {
    return this.workflowsService.createDefinition(createWorkflowDefinitionDto);
  }

  @Patch('definitions/:id')
  @RequirePermissions(Permissions.WorkflowUpdate)
  updateDefinition(
    @Param('id') id: string,
    @Body() updateWorkflowDefinitionDto: UpdateWorkflowDefinitionDto,
  ) {
    return this.workflowsService.updateDefinition(id, updateWorkflowDefinitionDto);
  }

  @Get('instances')
  @RequirePermissions(Permissions.WorkflowRead)
  findInstances(@Query() listWorkflowInstancesDto: ListWorkflowInstancesDto) {
    return this.workflowsService.findInstances(listWorkflowInstancesDto);
  }

  @Get('instances/:id')
  @RequirePermissions(Permissions.WorkflowRead)
  findInstance(@Param('id') id: string) {
    return this.workflowsService.findInstance(id);
  }

  @Patch('instances/:id/review')
  @RequirePermissions(Permissions.WorkflowApprove)
  reviewInstance(
    @Param('id') id: string,
    @Body() reviewWorkflowInstanceDto: ReviewWorkflowInstanceDto,
    @Req() request: Request & { user: CurrentUser },
  ) {
    return this.workflowsService.reviewInstance(
      id,
      reviewWorkflowInstanceDto,
      request.user,
    );
  }
}
