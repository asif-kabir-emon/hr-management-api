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
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({
  path: 'notifications',
  version: '1',
})
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @RequirePermissions(Permissions.NotificationCreate)
  create(
    @Body() createNotificationDto: CreateNotificationDto,
    @Req() request: Request & { user: CurrentUser },
  ) {
    return this.notificationsService.createNotifications(
      createNotificationDto,
      request.user,
    );
  }

  @Get('me')
  @RequirePermissions(Permissions.NotificationRead)
  getMyNotifications(@Req() request: Request & { user: CurrentUser }) {
    return this.notificationsService.getMyNotifications(request.user);
  }

  @Get('me/unread-count')
  @RequirePermissions(Permissions.NotificationRead)
  getMyUnreadCount(@Req() request: Request & { user: CurrentUser }) {
    return this.notificationsService.getMyUnreadCount(request.user);
  }

  @Patch(':id/read')
  @RequirePermissions(Permissions.NotificationRead)
  markAsRead(
    @Param('id') id: string,
    @Req() request: Request & { user: CurrentUser },
  ) {
    return this.notificationsService.markAsRead(id, request.user);
  }
}
