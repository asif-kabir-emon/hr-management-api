import {
  Body,
  Controller,
  Delete,
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
import { AssignWorkScheduleDto } from './dto/assign-work-schedule.dto';
import { CreateEmployeeDayOverrideDto } from './dto/create-employee-day-override.dto';
import { CreateOffDayReplacementRequestDto } from './dto/create-off-day-replacement-request.dto';
import { CreateWorkScheduleDto } from './dto/create-work-schedule.dto';
import { ReviewOffDayReplacementRequestDto } from './dto/review-off-day-replacement-request.dto';
import { ResolveWorkDayDto } from './dto/resolve-work-day.dto';
import { UpdateWorkScheduleDto } from './dto/update-work-schedule.dto';
import { WorkSchedulesService } from './work-schedules.service';

@ApiTags('work-schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({
  path: 'work-schedules',
  version: '1',
})
export class WorkSchedulesController {
  constructor(private readonly workSchedulesService: WorkSchedulesService) {}

  @Get()
  @RequirePermissions(Permissions.WorkScheduleRead)
  findAll() {
    return this.workSchedulesService.findAll();
  }

  @Get('assignments')
  @RequirePermissions(Permissions.WorkScheduleRead)
  listAssignments() {
    return this.workSchedulesService.listAssignments();
  }

  @Get('employee-day-overrides')
  @RequirePermissions(Permissions.WorkScheduleRead)
  listEmployeeDayOverrides() {
    return this.workSchedulesService.listEmployeeDayOverrides();
  }

  @Get('off-day-replacement-requests')
  @RequirePermissions(Permissions.WorkScheduleRead)
  listOffDayReplacementRequests() {
    return this.workSchedulesService.listOffDayReplacementRequests();
  }

  @Get('employees/:employeeId/day-status')
  @RequirePermissions(Permissions.WorkScheduleRead)
  resolveEmployeeDay(
    @Param('employeeId') employeeId: string,
    @Query() query: ResolveWorkDayDto,
  ) {
    return this.workSchedulesService.resolveEmployeeDay(employeeId, query.date);
  }

  @Get(':id')
  @RequirePermissions(Permissions.WorkScheduleRead)
  findOne(@Param('id') id: string) {
    return this.workSchedulesService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permissions.WorkScheduleCreate)
  create(@Body() createWorkScheduleDto: CreateWorkScheduleDto) {
    return this.workSchedulesService.create(createWorkScheduleDto);
  }

  @Post('assignments')
  @RequirePermissions(Permissions.WorkScheduleCreate)
  assignToEmployee(@Body() assignWorkScheduleDto: AssignWorkScheduleDto) {
    return this.workSchedulesService.assignToEmployee(assignWorkScheduleDto);
  }

  @Post('employee-day-overrides')
  @RequirePermissions(Permissions.WorkScheduleCreate)
  createEmployeeDayOverride(
    @Body() createEmployeeDayOverrideDto: CreateEmployeeDayOverrideDto,
  ) {
    return this.workSchedulesService.createEmployeeDayOverride(
      createEmployeeDayOverrideDto,
    );
  }

  @Post('off-day-replacement-requests')
  @RequirePermissions(Permissions.WorkScheduleCreate)
  createOffDayReplacementRequest(
    @Body()
    createOffDayReplacementRequestDto: CreateOffDayReplacementRequestDto,
  ) {
    return this.workSchedulesService.createOffDayReplacementRequest(
      createOffDayReplacementRequestDto,
    );
  }

  @Patch('off-day-replacement-requests/:id/review')
  @RequirePermissions(Permissions.WorkScheduleApprove)
  reviewOffDayReplacementRequest(
    @Param('id') id: string,
    @Body()
    reviewOffDayReplacementRequestDto: ReviewOffDayReplacementRequestDto,
    @Req() request: Request & { user: CurrentUser },
  ) {
    return this.workSchedulesService.reviewOffDayReplacementRequest(
      id,
      reviewOffDayReplacementRequestDto,
      request.user,
    );
  }

  @Patch(':id')
  @RequirePermissions(Permissions.WorkScheduleUpdate)
  update(
    @Param('id') id: string,
    @Body() updateWorkScheduleDto: UpdateWorkScheduleDto,
  ) {
    return this.workSchedulesService.update(id, updateWorkScheduleDto);
  }

  @Delete(':id')
  @RequirePermissions(Permissions.WorkScheduleDelete)
  remove(@Param('id') id: string) {
    return this.workSchedulesService.remove(id);
  }
}
