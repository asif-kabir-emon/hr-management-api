import {
  Body,
  Controller,
  Delete,
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
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsService } from './departments.service';

@ApiTags('departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({
  path: 'departments',
  version: '1',
})
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermissions(Permissions.DepartmentRead)
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permissions.DepartmentRead)
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permissions.DepartmentCreate)
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.DepartmentUpdate)
  update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @RequirePermissions(Permissions.DepartmentDelete)
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }
}
