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
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({
  path: 'companies',
  version: '1',
})
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @RequirePermissions(Permissions.CompanyRead)
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permissions.CompanyRead)
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permissions.CompanyCreate)
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.CompanyUpdate)
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @RequirePermissions(Permissions.CompanyDelete)
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }
}
