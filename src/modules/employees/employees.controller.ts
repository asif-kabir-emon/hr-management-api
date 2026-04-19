import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeEmploymentEventDto } from './dto/employee-employment-event.dto';
import { TransferEmployeeBranchDto } from './dto/transfer-employee-branch.dto';
import { TransferEmployeeDepartmentDto } from './dto/transfer-employee-department.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({
  path: 'employees',
  version: '1',
})
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @RequirePermissions(Permissions.EmployeeRead)
  findAll() {
    return this.employeesService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permissions.EmployeeRead)
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Get(':id/department-history')
  @RequirePermissions(Permissions.EmployeeRead)
  getDepartmentHistory(@Param('id') id: string) {
    return this.employeesService.getDepartmentHistory(id);
  }

  @Get(':id/branch-history')
  @RequirePermissions(Permissions.EmployeeRead)
  getBranchHistory(@Param('id') id: string) {
    return this.employeesService.getBranchHistory(id);
  }

  @Get(':id/employment-history')
  @RequirePermissions(Permissions.EmployeeRead)
  getEmploymentHistory(@Param('id') id: string) {
    return this.employeesService.getEmploymentHistory(id);
  }

  @Post()
  @RequirePermissions(Permissions.EmployeeCreate)
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.EmployeeUpdate)
  update(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Patch(':id/department')
  @RequirePermissions(Permissions.EmployeeUpdate)
  transferDepartment(
    @Param('id') id: string,
    @Body() transferEmployeeDepartmentDto: TransferEmployeeDepartmentDto,
  ) {
    return this.employeesService.transferDepartment(id, transferEmployeeDepartmentDto);
  }

  @Patch(':id/branch')
  @RequirePermissions(Permissions.EmployeeUpdate)
  transferBranch(
    @Param('id') id: string,
    @Body() transferEmployeeBranchDto: TransferEmployeeBranchDto,
  ) {
    return this.employeesService.transferBranch(id, transferEmployeeBranchDto);
  }

  @Post(':id/employment-events')
  @RequirePermissions(Permissions.EmployeeUpdate)
  recordEmploymentEvent(
    @Param('id') id: string,
    @Body() employeeEmploymentEventDto: EmployeeEmploymentEventDto,
  ) {
    return this.employeesService.recordEmploymentEvent(id, employeeEmploymentEventDto);
  }
}
