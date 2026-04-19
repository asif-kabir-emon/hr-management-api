import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../auth/interfaces/current-user.interface';
import { EmployeesService } from '../employees/employees.service';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ListLeaveRequestsDto } from './dto/list-leave-requests.dto';
import { ReviewLeaveRequestDto } from './dto/review-leave-request.dto';
import { SetLeaveBalanceDto } from './dto/set-leave-balance.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
import { EmployeeLeaveBalance } from './entities/employee-leave-balance.entity';
import { LeaveRequest, LeaveStatus } from './entities/leave-request.entity';
import { LeaveTypeEntity } from './entities/leave-type.entity';

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveTypeEntity)
    private readonly leaveTypeRepository: Repository<LeaveTypeEntity>,
    @InjectRepository(EmployeeLeaveBalance)
    private readonly leaveBalanceRepository: Repository<EmployeeLeaveBalance>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRepository: Repository<LeaveRequest>,
    private readonly employeesService: EmployeesService,
  ) {}

  createLeaveType(createLeaveTypeDto: CreateLeaveTypeDto) {
    const leaveType = this.leaveTypeRepository.create(createLeaveTypeDto);
    return this.leaveTypeRepository.save(leaveType);
  }

  findAllLeaveTypes() {
    return this.leaveTypeRepository.find({
      order: { name: 'ASC' },
    });
  }

  async updateLeaveType(id: string, updateLeaveTypeDto: UpdateLeaveTypeDto) {
    const leaveType = await this.leaveTypeRepository.findOne({ where: { id } });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    Object.assign(leaveType, updateLeaveTypeDto);
    return this.leaveTypeRepository.save(leaveType);
  }

  async removeLeaveType(id: string) {
    const leaveType = await this.leaveTypeRepository.findOne({ where: { id } });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    await this.assertLeaveTypeCanBeDeleted(leaveType.id);
    await this.leaveTypeRepository.softRemove(leaveType);

    return {
      message: 'Leave type deleted successfully',
    };
  }

  private async assertLeaveTypeCanBeDeleted(leaveTypeId: string) {
    const [leaveBalancesCount, leaveRequestsCount] = await Promise.all([
      this.leaveBalanceRepository.count({
        where: { leaveType: { id: leaveTypeId } },
      }),
      this.leaveRepository.count({
        where: { leaveType: { id: leaveTypeId } },
      }),
    ]);
    const blockers = [
      leaveBalancesCount ? `${leaveBalancesCount} leave balance(s)` : null,
      leaveRequestsCount ? `${leaveRequestsCount} leave request(s)` : null,
    ].filter(Boolean);

    if (blockers.length > 0) {
      throw new BadRequestException(
        `Leave type cannot be deleted because it is used by ${blockers.join(
          ', ',
        )}. Keep it inactive instead.`,
      );
    }
  }

  async setLeaveBalance(setLeaveBalanceDto: SetLeaveBalanceDto) {
    const employee = await this.employeesService.findOne(setLeaveBalanceDto.employeeId);
    const leaveType = await this.getLeaveType(setLeaveBalanceDto.leaveTypeId);
    let leaveBalance = await this.leaveBalanceRepository.findOne({
      where: {
        employee: { id: employee.id },
        leaveType: { id: leaveType.id },
        year: setLeaveBalanceDto.year,
      },
    });

    if (!leaveBalance) {
      leaveBalance = this.leaveBalanceRepository.create({
        employee,
        leaveType,
        year: setLeaveBalanceDto.year,
      });
    }

    leaveBalance.totalAllocated = setLeaveBalanceDto.totalAllocated;
    leaveBalance.used = setLeaveBalanceDto.used ?? leaveBalance.used ?? 0;
    leaveBalance.pending = setLeaveBalanceDto.pending ?? leaveBalance.pending ?? 0;
    leaveBalance.carryForward =
      setLeaveBalanceDto.carryForward ?? leaveBalance.carryForward ?? 0;

    return this.leaveBalanceRepository.save(leaveBalance);
  }

  async getEmployeeBalances(employeeId: string) {
    const employee = await this.employeesService.findOne(employeeId);

    return this.leaveBalanceRepository.find({
      where: {
        employee: { id: employee.id },
      },
      order: {
        year: 'DESC',
        updatedAt: 'DESC',
      },
    });
  }

  async getMyBalances(currentUser: CurrentUser) {
    const employee = await this.findEmployeeByUser(currentUser);
    return this.getEmployeeBalances(employee.id);
  }

  async create(createLeaveRequestDto: CreateLeaveRequestDto) {
    const employee = await this.employeesService.findOne(createLeaveRequestDto.employeeId);
    const leaveType = await this.getLeaveType(createLeaveRequestDto.leaveTypeId);
    const requestedDays = this.calculateLeaveDays(
      createLeaveRequestDto.startDate,
      createLeaveRequestDto.endDate,
    );

    if (requestedDays <= 0) {
      throw new BadRequestException('Requested leave days must be greater than zero');
    }

    if (leaveType.requiresBalance) {
      const leaveBalance = await this.getLeaveBalanceForRequest(
        employee.id,
        leaveType.id,
        createLeaveRequestDto.startDate,
      );
      const availableBalance =
        Number(leaveBalance.totalAllocated) +
        Number(leaveBalance.carryForward) -
        Number(leaveBalance.used) -
        Number(leaveBalance.pending);

      if (availableBalance < requestedDays) {
        throw new BadRequestException('Insufficient leave balance');
      }

      leaveBalance.pending = Number(leaveBalance.pending) + requestedDays;
      await this.leaveBalanceRepository.save(leaveBalance);
    }

    const leaveRequest = this.leaveRepository.create({
      employee,
      leaveType,
      startDate: createLeaveRequestDto.startDate,
      endDate: createLeaveRequestDto.endDate,
      reason: createLeaveRequestDto.reason,
      requestedDays,
    });

    return this.leaveRepository.save(leaveRequest);
  }

  findAll(listLeaveRequestsDto: ListLeaveRequestsDto) {
    return this.buildLeaveRequestsQuery(listLeaveRequestsDto).getMany();
  }

  findByStatus(status: LeaveStatus, listLeaveRequestsDto: ListLeaveRequestsDto) {
    return this.buildLeaveRequestsQuery(listLeaveRequestsDto, status).getMany();
  }

  async getMyLeaveRequests(currentUser: CurrentUser) {
    const employee = await this.findEmployeeByUser(currentUser);

    return this.leaveRepository.find({
      where: {
        employee: { id: employee.id },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async reviewLeaveRequest(
    id: string,
    reviewLeaveRequestDto: ReviewLeaveRequestDto,
    currentUser: CurrentUser,
  ) {
    const leaveRequest = await this.leaveRepository.findOne({
      where: { id },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.status !== LeaveStatus.Pending) {
      throw new BadRequestException('Only pending leave requests can be reviewed');
    }

    if (
      ![
        LeaveStatus.Approved,
        LeaveStatus.Rejected,
      ].includes(reviewLeaveRequestDto.status)
    ) {
      throw new BadRequestException(
        'Leave request can only be approved or rejected through review',
      );
    }

    if (leaveRequest.leaveType.requiresBalance) {
      const leaveBalance = await this.getLeaveBalanceForRequest(
        leaveRequest.employee.id,
        leaveRequest.leaveType.id,
        leaveRequest.startDate,
      );

      leaveBalance.pending = Math.max(
        0,
        Number(leaveBalance.pending) - Number(leaveRequest.requestedDays),
      );

      if (reviewLeaveRequestDto.status === LeaveStatus.Approved) {
        leaveBalance.used =
          Number(leaveBalance.used) + Number(leaveRequest.requestedDays);
      }

      await this.leaveBalanceRepository.save(leaveBalance);
    }

    leaveRequest.status = reviewLeaveRequestDto.status;
    leaveRequest.reviewNotes = reviewLeaveRequestDto.reviewNotes;
    leaveRequest.reviewedAt = new Date();
    leaveRequest.reviewedByUserId = currentUser.id ?? currentUser.sub;
    leaveRequest.reviewedByEmail = currentUser.email;

    return this.leaveRepository.save(leaveRequest);
  }

  private async getLeaveType(id: string) {
    const leaveType = await this.leaveTypeRepository.findOne({ where: { id } });

    if (!leaveType) {
      throw new NotFoundException('Leave type not found');
    }

    return leaveType;
  }

  private async getLeaveBalanceForRequest(
    employeeId: string,
    leaveTypeId: string,
    startDate: string,
  ) {
    const year = new Date(`${startDate}T00:00:00.000Z`).getUTCFullYear();
    const leaveBalance = await this.leaveBalanceRepository.findOne({
      where: {
        employee: { id: employeeId },
        leaveType: { id: leaveTypeId },
        year,
      },
    });

    if (!leaveBalance) {
      throw new BadRequestException(
        'Leave balance is not configured for this employee and leave type',
      );
    }

    return leaveBalance;
  }

  private calculateLeaveDays(startDate: string, endDate: string) {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);

    if (end.getTime() < start.getTime()) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;
  }

  private async findEmployeeByUser(currentUser: CurrentUser) {
    const employees = await this.employeesService.findAll();
    const employee = employees.find(
      (candidateEmployee) =>
        candidateEmployee.email.trim().toLowerCase() ===
        currentUser.email.trim().toLowerCase(),
    );

    if (!employee) {
      throw new NotFoundException('Employee profile not found for current user');
    }

    return employee;
  }

  private buildLeaveRequestsQuery(
    listLeaveRequestsDto: ListLeaveRequestsDto,
    status?: LeaveStatus,
  ) {
    const query = this.leaveRepository
      .createQueryBuilder('leaveRequest')
      .leftJoinAndSelect('leaveRequest.employee', 'employee')
      .leftJoinAndSelect('employee.branch', 'branch')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('leaveRequest.leaveType', 'leaveType')
      .orderBy('leaveRequest.createdAt', 'DESC');

    if (status) {
      query.andWhere('leaveRequest.status = :status', { status });
    }

    if (listLeaveRequestsDto.branchId) {
      query.andWhere('branch.id = :branchId', {
        branchId: listLeaveRequestsDto.branchId,
      });
    }

    if (listLeaveRequestsDto.departmentId) {
      query.andWhere('department.id = :departmentId', {
        departmentId: listLeaveRequestsDto.departmentId,
      });
    }

    if (listLeaveRequestsDto.startDate) {
      query.andWhere('leaveRequest.endDate >= :startDate', {
        startDate: listLeaveRequestsDto.startDate,
      });
    }

    if (listLeaveRequestsDto.endDate) {
      query.andWhere('leaveRequest.startDate <= :endDate', {
        endDate: listLeaveRequestsDto.endDate,
      });
    }

    if (listLeaveRequestsDto.search) {
      query.andWhere(
        `(
          LOWER(employee.email) LIKE LOWER(:search)
          OR LOWER(employee.fullName) LIKE LOWER(:search)
          OR LOWER(employee.employeeCode) LIKE LOWER(:search)
        )`,
        {
          search: `%${listLeaveRequestsDto.search}%`,
        },
      );
    }

    return query;
  }
}
