import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { EmployeesService } from '../employees/employees.service';
import { CurrentUser } from '../auth/interfaces/current-user.interface';
import { Holiday, HolidayScopeType } from '../holidays/entities/holiday.entity';
import { AssignWorkScheduleDto } from './dto/assign-work-schedule.dto';
import { CreateEmployeeDayOverrideDto } from './dto/create-employee-day-override.dto';
import { CreateOffDayReplacementRequestDto } from './dto/create-off-day-replacement-request.dto';
import { CreateWorkScheduleDto } from './dto/create-work-schedule.dto';
import { ReviewOffDayReplacementRequestDto } from './dto/review-off-day-replacement-request.dto';
import { UpdateWorkScheduleDto } from './dto/update-work-schedule.dto';
import {
  EmployeeDayOverride,
  EmployeeDayOverrideType,
} from './entities/employee-day-override.entity';
import { EmployeeWorkSchedule } from './entities/employee-work-schedule.entity';
import {
  OffDayReplacementRequest,
  OffDayReplacementRequestStatus,
} from './entities/off-day-replacement-request.entity';
import { WeekDay, WorkSchedule } from './entities/work-schedule.entity';

@Injectable()
export class WorkSchedulesService {
  constructor(
    @InjectRepository(WorkSchedule)
    private readonly workScheduleRepository: Repository<WorkSchedule>,
    @InjectRepository(EmployeeWorkSchedule)
    private readonly employeeWorkScheduleRepository: Repository<EmployeeWorkSchedule>,
    @InjectRepository(EmployeeDayOverride)
    private readonly employeeDayOverrideRepository: Repository<EmployeeDayOverride>,
    @InjectRepository(OffDayReplacementRequest)
    private readonly offDayReplacementRequestRepository: Repository<OffDayReplacementRequest>,
    @InjectRepository(Holiday)
    private readonly holidayRepository: Repository<Holiday>,
    private readonly employeesService: EmployeesService,
  ) {}

  create(createWorkScheduleDto: CreateWorkScheduleDto) {
    const workSchedule = this.workScheduleRepository.create(createWorkScheduleDto);
    return this.workScheduleRepository.save(workSchedule);
  }

  findAll() {
    return this.workScheduleRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const workSchedule = await this.workScheduleRepository.findOne({
      where: { id },
    });

    if (!workSchedule) {
      throw new NotFoundException('Work schedule not found');
    }

    return workSchedule;
  }

  async update(id: string, updateWorkScheduleDto: UpdateWorkScheduleDto) {
    const workSchedule = await this.findOne(id);
    Object.assign(workSchedule, updateWorkScheduleDto);
    return this.workScheduleRepository.save(workSchedule);
  }

  async remove(id: string) {
    const workSchedule = await this.findOne(id);
    await this.workScheduleRepository.remove(workSchedule);

    return {
      message: 'Work schedule deleted successfully',
    };
  }

  async assignToEmployee(assignWorkScheduleDto: AssignWorkScheduleDto) {
    const employee = await this.employeesService.findOne(assignWorkScheduleDto.employeeId);
    const workSchedule = await this.findOne(assignWorkScheduleDto.workScheduleId);

    if (
      assignWorkScheduleDto.effectiveTo &&
      assignWorkScheduleDto.effectiveTo < assignWorkScheduleDto.effectiveFrom
    ) {
      throw new BadRequestException('effectiveTo must be after effectiveFrom');
    }

    const assignment = this.employeeWorkScheduleRepository.create({
      employee,
      workSchedule,
      effectiveFrom: assignWorkScheduleDto.effectiveFrom,
      effectiveTo: assignWorkScheduleDto.effectiveTo,
      isActive: true,
    });

    return this.employeeWorkScheduleRepository.save(assignment);
  }

  listAssignments() {
    return this.employeeWorkScheduleRepository.find({
      order: { effectiveFrom: 'DESC', createdAt: 'DESC' },
    });
  }

  async createEmployeeDayOverride(
    createEmployeeDayOverrideDto: CreateEmployeeDayOverrideDto,
  ) {
    const employee = await this.employeesService.findOne(
      createEmployeeDayOverrideDto.employeeId,
    );
    const employeeDayOverride = this.employeeDayOverrideRepository.create({
      employee,
      date: createEmployeeDayOverrideDto.date,
      type: createEmployeeDayOverrideDto.type,
      reason: createEmployeeDayOverrideDto.reason,
    });

    return this.employeeDayOverrideRepository.save(employeeDayOverride);
  }

  listEmployeeDayOverrides() {
    return this.employeeDayOverrideRepository.find({
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  listOffDayReplacementRequests() {
    return this.offDayReplacementRequestRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async createOffDayReplacementRequest(
    createOffDayReplacementRequestDto: CreateOffDayReplacementRequestDto,
  ) {
    if (
      createOffDayReplacementRequestDto.originalOffDate ===
      createOffDayReplacementRequestDto.replacementOffDate
    ) {
      throw new BadRequestException(
        'originalOffDate and replacementOffDate must be different',
      );
    }

    const employee = await this.employeesService.findOne(
      createOffDayReplacementRequestDto.employeeId,
    );
    const originalDayResolution = await this.resolveEmployeeDay(
      employee.id,
      createOffDayReplacementRequestDto.originalOffDate,
    );
    const replacementDayResolution = await this.resolveEmployeeDay(
      employee.id,
      createOffDayReplacementRequestDto.replacementOffDate,
    );

    if (!originalDayResolution.offDay) {
      throw new BadRequestException(
        'originalOffDate must currently be an off day or holiday',
      );
    }

    if (replacementDayResolution.offDay) {
      throw new BadRequestException(
        'replacementOffDate must currently be a working day',
      );
    }

    const existingPendingRequest =
      await this.offDayReplacementRequestRepository.findOne({
        where: {
          employee: { id: employee.id },
          originalOffDate: createOffDayReplacementRequestDto.originalOffDate,
          replacementOffDate: createOffDayReplacementRequestDto.replacementOffDate,
          status: OffDayReplacementRequestStatus.Pending,
        },
      });

    if (existingPendingRequest) {
      throw new BadRequestException(
        'A pending off day replacement request already exists for these dates',
      );
    }

    const request = this.offDayReplacementRequestRepository.create({
      employee,
      originalOffDate: createOffDayReplacementRequestDto.originalOffDate,
      replacementOffDate: createOffDayReplacementRequestDto.replacementOffDate,
      reason: createOffDayReplacementRequestDto.reason,
      status: OffDayReplacementRequestStatus.Pending,
    });

    return this.offDayReplacementRequestRepository.save(request);
  }

  async reviewOffDayReplacementRequest(
    id: string,
    reviewOffDayReplacementRequestDto: ReviewOffDayReplacementRequestDto,
    currentUser: CurrentUser,
  ) {
    const request = await this.offDayReplacementRequestRepository.findOne({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Off day replacement request not found');
    }

    if (request.status !== OffDayReplacementRequestStatus.Pending) {
      throw new BadRequestException(
        'Only pending off day replacement requests can be reviewed',
      );
    }

    request.status = reviewOffDayReplacementRequestDto.status;
    request.reviewNotes = reviewOffDayReplacementRequestDto.reviewNotes;
    request.reviewedAt = new Date();
    request.reviewedByUserId = currentUser.id ?? currentUser.sub;
    request.reviewedByEmail = currentUser.email;

    if (reviewOffDayReplacementRequestDto.status === OffDayReplacementRequestStatus.Approved) {
      const originalDayResolution = await this.resolveEmployeeDay(
        request.employee.id,
        request.originalOffDate,
      );
      const replacementDayResolution = await this.resolveEmployeeDay(
        request.employee.id,
        request.replacementOffDate,
      );

      if (!originalDayResolution.offDay) {
        throw new BadRequestException(
          'originalOffDate is no longer an off day and cannot be replaced',
        );
      }

      if (replacementDayResolution.offDay) {
        throw new BadRequestException(
          'replacementOffDate is no longer a working day and cannot be swapped',
        );
      }

      await this.employeeDayOverrideRepository.save([
        this.employeeDayOverrideRepository.create({
          employee: request.employee,
          date: request.originalOffDate,
          type: EmployeeDayOverrideType.WorkingDay,
          reason: `Approved off day replacement request ${request.id}`,
        }),
        this.employeeDayOverrideRepository.create({
          employee: request.employee,
          date: request.replacementOffDate,
          type: EmployeeDayOverrideType.OffDay,
          reason: `Approved off day replacement request ${request.id}`,
        }),
      ]);
    }

    return this.offDayReplacementRequestRepository.save(request);
  }

  async resolveEmployeeDay(employeeId: string, date: string) {
    const employee = await this.employeesService.findOne(employeeId);

    const employeeDayOverride = await this.employeeDayOverrideRepository.findOne({
      where: {
        employee: { id: employee.id },
        date,
      },
      order: { createdAt: 'DESC' },
    });

    if (employeeDayOverride) {
      return {
        date,
        employeeId: employee.id,
        isWorkingDay:
          employeeDayOverride.type === EmployeeDayOverrideType.WorkingDay,
        source: 'employee_override',
        offDay: employeeDayOverride.type !== EmployeeDayOverrideType.WorkingDay,
        overrideType: employeeDayOverride.type,
        reason: employeeDayOverride.reason,
      };
    }

    const matchingHolidays = await this.findMatchingHolidays(employee, date);

    if (matchingHolidays.length > 0) {
      const holiday = this.pickHighestPriorityHoliday(matchingHolidays);

      return {
        date,
        employeeId: employee.id,
        isWorkingDay: false,
        offDay: true,
        source: 'holiday',
        holiday: {
          id: holiday.id,
          name: holiday.name,
          type: holiday.type,
          scopeType: holiday.scopeType,
          isPaid: holiday.isPaid,
          isOptional: holiday.isOptional,
        },
      };
    }

    const assignment = await this.employeeWorkScheduleRepository.findOne({
      where: {
        employee: { id: employee.id },
        isActive: true,
      },
      order: { effectiveFrom: 'DESC', createdAt: 'DESC' },
    });

    if (!assignment) {
      return {
        date,
        employeeId: employee.id,
        isWorkingDay: true,
        offDay: false,
        source: 'default',
        reason: 'No work schedule assigned; defaulted to working day',
      };
    }

    if (assignment.effectiveFrom > date) {
      return {
        date,
        employeeId: employee.id,
        isWorkingDay: true,
        offDay: false,
        source: 'default',
        reason: 'Assigned work schedule is not yet effective',
      };
    }

    if (assignment.effectiveTo && assignment.effectiveTo < date) {
      return {
        date,
        employeeId: employee.id,
        isWorkingDay: true,
        offDay: false,
        source: 'default',
        reason: 'Assigned work schedule has expired',
      };
    }

    const weekDay = this.getWeekDay(date);
    const dayRule = assignment.workSchedule.weekDays[weekDay];

    return {
      date,
      employeeId: employee.id,
      isWorkingDay: dayRule?.isWorkingDay ?? true,
      offDay: !(dayRule?.isWorkingDay ?? true),
      source: 'work_schedule',
      workSchedule: {
        id: assignment.workSchedule.id,
        name: assignment.workSchedule.name,
      },
      dayRule: dayRule ?? null,
    };
  }

  private async findMatchingHolidays(employee: Employee, date: string) {
    const holidays = await this.holidayRepository.find({
      where: {
        date,
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });

    return holidays.filter((holiday) => {
      if (holiday.scopeType === HolidayScopeType.All) {
        return true;
      }

      if (
        holiday.scopeType === HolidayScopeType.Employee &&
        holiday.employee?.id === employee.id
      ) {
        return true;
      }

      if (
        holiday.scopeType === HolidayScopeType.Department &&
        holiday.department?.id &&
        holiday.department.id === employee.department?.id
      ) {
        return true;
      }

      if (
        holiday.scopeType === HolidayScopeType.State &&
        holiday.stateCode &&
        holiday.stateCode === employee.stateCode
      ) {
        return true;
      }

      return false;
    });
  }

  private pickHighestPriorityHoliday(holidays: Holiday[]) {
    const priorityMap: Record<HolidayScopeType, number> = {
      [HolidayScopeType.Employee]: 1,
      [HolidayScopeType.Department]: 2,
      [HolidayScopeType.State]: 3,
      [HolidayScopeType.All]: 4,
    };

    return [...holidays].sort(
      (firstHoliday, secondHoliday) =>
        priorityMap[firstHoliday.scopeType] - priorityMap[secondHoliday.scopeType],
    )[0];
  }

  private getWeekDay(date: string): WeekDay {
    const dayIndex = new Date(`${date}T00:00:00.000Z`).getUTCDay();

    switch (dayIndex) {
      case 0:
        return WeekDay.Sunday;
      case 1:
        return WeekDay.Monday;
      case 2:
        return WeekDay.Tuesday;
      case 3:
        return WeekDay.Wednesday;
      case 4:
        return WeekDay.Thursday;
      case 5:
        return WeekDay.Friday;
      default:
        return WeekDay.Saturday;
    }
  }
}
