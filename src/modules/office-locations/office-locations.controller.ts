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
import { CreateOfficeLocationDto } from './dto/create-office-location.dto';
import { UpdateOfficeLocationDto } from './dto/update-office-location.dto';
import { OfficeLocationsService } from './office-locations.service';

@ApiTags('office-locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({
  path: 'office-locations',
  version: '1',
})
export class OfficeLocationsController {
  constructor(private readonly officeLocationsService: OfficeLocationsService) {}

  @Get()
  @RequirePermissions(Permissions.OfficeLocationRead)
  findAll() {
    return this.officeLocationsService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permissions.OfficeLocationRead)
  findOne(@Param('id') id: string) {
    return this.officeLocationsService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permissions.OfficeLocationCreate)
  create(@Body() createOfficeLocationDto: CreateOfficeLocationDto) {
    return this.officeLocationsService.create(createOfficeLocationDto);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.OfficeLocationUpdate)
  update(
    @Param('id') id: string,
    @Body() updateOfficeLocationDto: UpdateOfficeLocationDto,
  ) {
    return this.officeLocationsService.update(id, updateOfficeLocationDto);
  }

  @Delete(':id')
  @RequirePermissions(Permissions.OfficeLocationDelete)
  remove(@Param('id') id: string) {
    return this.officeLocationsService.remove(id);
  }
}
