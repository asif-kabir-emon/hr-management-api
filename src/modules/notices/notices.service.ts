import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../auth/interfaces/current-user.interface';
import { Employee } from '../employees/entities/employee.entity';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeStatusDto } from './dto/update-notice-status.dto';
import { Notice, NoticeStatus } from './entities/notice.entity';

@Injectable()
export class NoticesService {
  constructor(
    @InjectRepository(Notice)
    private readonly noticeRepository: Repository<Notice>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  create(createNoticeDto: CreateNoticeDto, currentUser: CurrentUser) {
    const notice = this.noticeRepository.create({
      ...createNoticeDto,
      targetPermissions: createNoticeDto.targetPermissions ?? [],
      targetUserIds: createNoticeDto.targetUserIds ?? [],
      isPinned: createNoticeDto.isPinned ?? false,
      createdByUserId: currentUser.id ?? currentUser.sub,
      createdByEmail: currentUser.email,
    });

    return this.noticeRepository.save(notice);
  }

  findAll() {
    return this.noticeRepository.find({
      order: {
        isPinned: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async getMyNotices(currentUser: CurrentUser) {
    const employee = await this.findEmployeeByUser(currentUser);
    const notices = await this.noticeRepository.find({
      where: {
        status: NoticeStatus.Published,
      },
      order: {
        isPinned: 'DESC',
        publishedAt: 'DESC',
        createdAt: 'DESC',
      },
    });

    return notices.filter((notice) => {
      const targetUserMatch =
        notice.targetUserIds.length === 0
        || notice.targetUserIds.includes(currentUser.id ?? currentUser.sub);
      const permissionMatch =
        notice.targetPermissions.length === 0
        || notice.targetPermissions.some((permission) =>
          currentUser.permissions.includes(permission)
          || currentUser.permissions.includes('*'),
        );
      const branchMatch =
        !notice.branchId || employee.branch?.id === notice.branchId;
      const departmentMatch =
        !notice.departmentId || employee.department?.id === notice.departmentId;

      return targetUserMatch && permissionMatch && branchMatch && departmentMatch;
    });
  }

  async updateStatus(id: string, updateNoticeStatusDto: UpdateNoticeStatusDto) {
    const notice = await this.noticeRepository.findOne({
      where: { id },
    });

    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    notice.status = updateNoticeStatusDto.status;

    if (updateNoticeStatusDto.status === NoticeStatus.Published) {
      notice.publishedAt = new Date();
    }

    return this.noticeRepository.save(notice);
  }

  private async findEmployeeByUser(currentUser: CurrentUser) {
    const employees = await this.employeeRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
    const employee = employees.find(
      (candidateEmployee) =>
        candidateEmployee.email.trim().toLowerCase()
        === currentUser.email.trim().toLowerCase(),
    );

    if (!employee) {
      throw new NotFoundException('Employee profile not found for current user');
    }

    return employee;
  }
}
