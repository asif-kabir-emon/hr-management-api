import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeStatusDto } from './dto/update-notice-status.dto';
import { NoticesService } from './notices.service';

@ApiTags('notices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({
  path: 'notices',
  version: '1',
})
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Post()
  @RequirePermissions(Permissions.NoticeCreate)
  create(
    @Body() createNoticeDto: CreateNoticeDto,
    @Req() request: Request & { user: CurrentUser },
  ) {
    return this.noticesService.create(createNoticeDto, request.user);
  }

  @Get()
  @RequirePermissions(Permissions.NoticeRead)
  findAll() {
    return this.noticesService.findAll();
  }

  @Get('me')
  @RequirePermissions(Permissions.NoticeRead)
  getMyNotices(@Req() request: Request & { user: CurrentUser }) {
    return this.noticesService.getMyNotices(request.user);
  }

  @Patch(':id/status')
  @RequirePermissions(Permissions.NoticePublish)
  updateStatus(
    @Param('id') id: string,
    @Body() updateNoticeStatusDto: UpdateNoticeStatusDto,
  ) {
    return this.noticesService.updateStatus(id, updateNoticeStatusDto);
  }
}
