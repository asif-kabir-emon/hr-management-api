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
import { AttendanceService } from './attendance.service';
import { ApproveAttendanceDto } from './dto/approve-attendance.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { ListAttendanceDto } from './dto/list-attendance.dto';
import { CurrentUser } from '../auth/interfaces/current-user.interface';
import { AttendanceApprovalStatus } from './entities/attendance.entity';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({
  path: 'attendance',
  version: '1',
})
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @RequirePermissions(Permissions.AttendanceRead)
  findAll(@Query() listAttendanceDto: ListAttendanceDto) {
    return this.attendanceService.findAll(listAttendanceDto);
  }

  @Get('me')
  @RequirePermissions(Permissions.AttendanceRead)
  getMyAttendance(
    @Req() request: Request & { user: CurrentUser },
    @Query() listAttendanceDto: ListAttendanceDto,
  ) {
    return this.attendanceService.getMyAttendance(request.user, listAttendanceDto);
  }

  @Get('pending')
  @RequirePermissions(Permissions.AttendanceRead)
  findPending(@Query() listAttendanceDto: ListAttendanceDto) {
    return this.attendanceService.findByApprovalStatus(
      AttendanceApprovalStatus.Pending,
      listAttendanceDto,
    );
  }

  @Get('approved')
  @RequirePermissions(Permissions.AttendanceRead)
  findApproved(@Query() listAttendanceDto: ListAttendanceDto) {
    return this.attendanceService.findByApprovalStatus(
      AttendanceApprovalStatus.Approved,
      listAttendanceDto,
    );
  }

  @Get('missing')
  @RequirePermissions(Permissions.AttendanceRead)
  getMissingAttendance(@Query() listAttendanceDto: ListAttendanceDto) {
    return this.attendanceService.getMissingAttendance(listAttendanceDto);
  }

  @Post()
  @RequirePermissions(Permissions.AttendanceCreate)
  create(
    @Body() createAttendanceDto: CreateAttendanceDto,
    @Req() request: Request,
  ) {
    const requestIp = this.getRequestIp(request);
    return this.attendanceService.create(createAttendanceDto, requestIp);
  }

  @Patch(':id/approval')
  @RequirePermissions(Permissions.AttendanceApprove)
  approve(
    @Param('id') attendanceId: string,
    @Body() approveAttendanceDto: ApproveAttendanceDto,
    @Req() request: Request & { user: CurrentUser },
  ) {
    return this.attendanceService.approve(
      attendanceId,
      approveAttendanceDto,
      request.user,
    );
  }

  private getRequestIp(request: Request) {
    const forwardedIpHeader = request.headers['x-forwarded-for'];

    if (typeof forwardedIpHeader === 'string') {
      return forwardedIpHeader.split(',')[0]?.trim();
    }

    if (Array.isArray(forwardedIpHeader)) {
      return forwardedIpHeader[0]?.split(',')[0]?.trim();
    }

    return request.ip;
  }
}
