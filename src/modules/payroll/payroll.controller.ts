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
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { ListPayrollRunsDto } from './dto/list-payroll-runs.dto';
import { UpdatePayrollItemDto } from './dto/update-payroll-item.dto';
import { PayrollService } from './payroll.service';

@ApiTags('payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({
  path: 'payroll',
  version: '1',
})
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('runs')
  @RequirePermissions(Permissions.PayrollRead)
  findPayrollRuns(@Query() listPayrollRunsDto: ListPayrollRunsDto) {
    return this.payrollService.findPayrollRuns(listPayrollRunsDto);
  }

  @Get('runs/:id')
  @RequirePermissions(Permissions.PayrollRead)
  findPayrollRun(@Param('id') id: string) {
    return this.payrollService.findPayrollRun(id);
  }

  @Post('runs')
  @RequirePermissions(Permissions.PayrollCreate)
  createPayrollRun(
    @Body() createPayrollRunDto: CreatePayrollRunDto,
    @Req() request: Request & { user: CurrentUser },
  ) {
    return this.payrollService.createPayrollRun(
      createPayrollRunDto,
      request.user,
    );
  }

  @Patch('runs/:id/items/:itemId')
  @RequirePermissions(Permissions.PayrollUpdate)
  updatePayrollItem(
    @Param('id') payrollRunId: string,
    @Param('itemId') payrollItemId: string,
    @Body() updatePayrollItemDto: UpdatePayrollItemDto,
  ) {
    return this.payrollService.updatePayrollItem(
      payrollRunId,
      payrollItemId,
      updatePayrollItemDto,
    );
  }

  @Patch('runs/:id/submit')
  @RequirePermissions(Permissions.PayrollCreate)
  submitPayrollRun(
    @Param('id') id: string,
    @Req() request: Request & { user: CurrentUser },
  ) {
    return this.payrollService.submitPayrollRun(id, request.user);
  }
}
