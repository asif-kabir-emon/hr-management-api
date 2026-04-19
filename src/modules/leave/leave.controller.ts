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
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ListLeaveRequestsDto } from './dto/list-leave-requests.dto';
import { ReviewLeaveRequestDto } from './dto/review-leave-request.dto';
import { SetLeaveBalanceDto } from './dto/set-leave-balance.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
import { LeaveService } from './leave.service';
import { LeaveStatus } from './entities/leave-request.entity';

@ApiTags('leave')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({
  path: 'leave-requests',
  version: '1',
})
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get()
  @RequirePermissions(Permissions.LeaveRead)
  findAll(@Query() listLeaveRequestsDto: ListLeaveRequestsDto) {
    return this.leaveService.findAll(listLeaveRequestsDto);
  }

  @Get('pending')
  @RequirePermissions(Permissions.LeaveRead)
  findPending(@Query() listLeaveRequestsDto: ListLeaveRequestsDto) {
    return this.leaveService.findByStatus(
      LeaveStatus.Pending,
      listLeaveRequestsDto,
    );
  }

  @Get('approved')
  @RequirePermissions(Permissions.LeaveRead)
  findApproved(@Query() listLeaveRequestsDto: ListLeaveRequestsDto) {
    return this.leaveService.findByStatus(
      LeaveStatus.Approved,
      listLeaveRequestsDto,
    );
  }

  @Get('types')
  @RequirePermissions(Permissions.LeaveTypeRead)
  findAllLeaveTypes() {
    return this.leaveService.findAllLeaveTypes();
  }

  @Get('balances/me')
  @RequirePermissions(Permissions.LeaveBalanceRead)
  getMyBalances(@Req() request: Request & { user: CurrentUser }) {
    return this.leaveService.getMyBalances(request.user);
  }

  @Get('requests/me')
  @RequirePermissions(Permissions.LeaveRead)
  getMyLeaveRequests(@Req() request: Request & { user: CurrentUser }) {
    return this.leaveService.getMyLeaveRequests(request.user);
  }

  @Get('balances/:employeeId')
  @RequirePermissions(Permissions.LeaveBalanceRead)
  getEmployeeBalances(@Param('employeeId') employeeId: string) {
    return this.leaveService.getEmployeeBalances(employeeId);
  }

  @Post('types')
  @RequirePermissions(Permissions.LeaveTypeCreate)
  createLeaveType(@Body() createLeaveTypeDto: CreateLeaveTypeDto) {
    return this.leaveService.createLeaveType(createLeaveTypeDto);
  }

  @Patch('types/:id')
  @RequirePermissions(Permissions.LeaveTypeUpdate)
  updateLeaveType(
    @Param('id') id: string,
    @Body() updateLeaveTypeDto: UpdateLeaveTypeDto,
  ) {
    return this.leaveService.updateLeaveType(id, updateLeaveTypeDto);
  }

  @Patch('balances')
  @RequirePermissions(Permissions.LeaveBalanceManage)
  setLeaveBalance(@Body() setLeaveBalanceDto: SetLeaveBalanceDto) {
    return this.leaveService.setLeaveBalance(setLeaveBalanceDto);
  }

  @Post()
  @RequirePermissions(Permissions.LeaveCreate)
  create(@Body() createLeaveRequestDto: CreateLeaveRequestDto) {
    return this.leaveService.create(createLeaveRequestDto);
  }

  @Patch(':id/review')
  @RequirePermissions(Permissions.LeaveApprove)
  reviewLeaveRequest(
    @Param('id') id: string,
    @Body() reviewLeaveRequestDto: ReviewLeaveRequestDto,
    @Req() request: Request & { user: CurrentUser },
  ) {
    return this.leaveService.reviewLeaveRequest(
      id,
      reviewLeaveRequestDto,
      request.user,
    );
  }
}
