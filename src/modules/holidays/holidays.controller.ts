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
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { HolidaysService } from './holidays.service';

@ApiTags('holidays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({
  path: 'holidays',
  version: '1',
})
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Get()
  @RequirePermissions(Permissions.HolidayRead)
  findAll() {
    return this.holidaysService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permissions.HolidayRead)
  findOne(@Param('id') id: string) {
    return this.holidaysService.findOne(id);
  }

  @Post()
  @RequirePermissions(Permissions.HolidayCreate)
  create(@Body() createHolidayDto: CreateHolidayDto) {
    return this.holidaysService.create(createHolidayDto);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.HolidayUpdate)
  update(@Param('id') id: string, @Body() updateHolidayDto: UpdateHolidayDto) {
    return this.holidaysService.update(id, updateHolidayDto);
  }

  @Delete(':id')
  @RequirePermissions(Permissions.HolidayDelete)
  remove(@Param('id') id: string) {
    return this.holidaysService.remove(id);
  }
}
