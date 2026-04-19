import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permissions } from '../../common/constants/permissions';
import { CurrentUser } from '../auth/interfaces/current-user.interface';
import { User } from '../auth/entities/user.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  Notification,
  NotificationStatus,
} from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createNotifications(
    createNotificationDto: CreateNotificationDto,
    currentUser: CurrentUser,
  ) {
    const recipients = await this.resolveRecipients(createNotificationDto);

    if (recipients.length === 0) {
      throw new BadRequestException('No recipients found for notification');
    }

    const notifications = recipients.map((recipient) =>
      this.notificationRepository.create({
        recipient,
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        type: createNotificationDto.type,
        referenceType: createNotificationDto.referenceType,
        referenceId: createNotificationDto.referenceId,
        metadata: createNotificationDto.metadata,
        createdByUserId: currentUser.id ?? currentUser.sub,
        createdByEmail: currentUser.email,
      }),
    );

    return this.notificationRepository.save(notifications);
  }

  getMyNotifications(currentUser: CurrentUser) {
    const userId = currentUser.id ?? currentUser.sub;

    return this.notificationRepository.find({
      where: {
        recipient: { id: userId },
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getMyUnreadCount(currentUser: CurrentUser) {
    const userId = currentUser.id ?? currentUser.sub;
    const unreadCount = await this.notificationRepository.count({
      where: {
        recipient: { id: userId },
        status: NotificationStatus.Unread,
      },
    });

    return {
      unreadCount,
    };
  }

  async markAsRead(id: string, currentUser: CurrentUser) {
    const userId = currentUser.id ?? currentUser.sub;
    const notification = await this.notificationRepository.findOne({
      where: {
        id,
        recipient: { id: userId },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.status = NotificationStatus.Read;
    notification.readAt = new Date();

    return this.notificationRepository.save(notification);
  }

  private async resolveRecipients(createNotificationDto: CreateNotificationDto) {
    const recipientMap = new Map<string, User>();

    if (createNotificationDto.recipientUserIds?.length) {
      const users = await this.userRepository.find({
        where: {
          id: In(createNotificationDto.recipientUserIds),
          isDelete: false,
          isActive: true,
        },
      });

      users.forEach((user) => recipientMap.set(user.id, user));
    }

    if (createNotificationDto.recipientPermissions?.length) {
      const users = await this.userRepository.find({
        where: {
          isDelete: false,
          isActive: true,
        },
      });

      users
        .filter((user) =>
          createNotificationDto.recipientPermissions?.some(
            (permission) =>
              user.permissions.includes(Permissions.All)
              || user.permissions.includes(permission),
          ),
        )
        .forEach((user) => recipientMap.set(user.id, user));
    }

    return [...recipientMap.values()];
  }
}
