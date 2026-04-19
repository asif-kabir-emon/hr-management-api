import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../auth/interfaces/current-user.interface';
import { Employee, EmploymentStatus } from '../employees/entities/employee.entity';
import { EmployeesService } from '../employees/employees.service';
import { LeaveRequest, LeaveStatus } from '../leave/entities/leave-request.entity';
import { OfficeLocationsService } from '../office-locations/office-locations.service';
import { WorkSchedulesService } from '../work-schedules/work-schedules.service';
import { ApproveAttendanceDto } from './dto/approve-attendance.dto';
import { AttendanceLocationDto } from './dto/attendance-location.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { ListAttendanceDto } from './dto/list-attendance.dto';
import {
  AttendanceApprovalStatus,
  AttendanceDayResolution,
  AttendanceLocation,
  AttendanceRecord,
} from './entities/attendance.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    private readonly employeesService: EmployeesService,
    private readonly officeLocationsService: OfficeLocationsService,
    private readonly workSchedulesService: WorkSchedulesService,
  ) {}

  async create(createAttendanceDto: CreateAttendanceDto, requestIp?: string) {
    const employee = await this.employeesService.findOne(createAttendanceDto.employeeId);
    const dayResolution = (await this.workSchedulesService.resolveEmployeeDay(
      employee.id,
      createAttendanceDto.workDate,
    )) as AttendanceDayResolution;
    const normalizedRequestIp = requestIp?.trim();
    const checkInIp = createAttendanceDto.checkInIp?.trim() ?? normalizedRequestIp;
    const checkOutIp = createAttendanceDto.checkOutIp?.trim() ?? normalizedRequestIp;
    const checkInGeofence = await this.officeLocationsService.findMatchingOffice(
      createAttendanceDto.checkInLocation,
      checkInIp,
    );
    const checkOutGeofence = await this.officeLocationsService.findMatchingOffice(
      createAttendanceDto.checkOutLocation,
      checkOutIp,
    );
    const attendance = this.attendanceRepository.create({
      employee,
      workDate: createAttendanceDto.workDate,
      checkInAt: createAttendanceDto.checkInAt
        ? new Date(createAttendanceDto.checkInAt)
        : undefined,
      checkOutAt: createAttendanceDto.checkOutAt
        ? new Date(createAttendanceDto.checkOutAt)
        : undefined,
      checkInLocation: this.buildAttendanceLocation(
        createAttendanceDto.checkInLocation,
        checkInGeofence?.officeLocation.id,
        checkInGeofence?.officeLocation.name,
        checkInGeofence?.distanceMeters,
        checkInGeofence?.isInside,
        checkInGeofence?.matchedBy,
      ),
      checkOutLocation: this.buildAttendanceLocation(
        createAttendanceDto.checkOutLocation,
        checkOutGeofence?.officeLocation.id,
        checkOutGeofence?.officeLocation.name,
        checkOutGeofence?.distanceMeters,
        checkOutGeofence?.isInside,
        checkOutGeofence?.matchedBy,
      ),
      checkInOfficeLocationId: checkInGeofence?.officeLocation.id,
      checkInOfficeLocationName: checkInGeofence?.officeLocation.name,
      checkInDistanceMetersFromOffice: checkInGeofence?.distanceMeters,
      isCheckInInsideOffice: checkInGeofence?.isInside,
      checkInOfficeMatchedBy: checkInGeofence?.matchedBy,
      checkOutOfficeLocationId: checkOutGeofence?.officeLocation.id,
      checkOutOfficeLocationName: checkOutGeofence?.officeLocation.name,
      checkOutDistanceMetersFromOffice: checkOutGeofence?.distanceMeters,
      isCheckOutInsideOffice: checkOutGeofence?.isInside,
      checkOutOfficeMatchedBy: checkOutGeofence?.matchedBy,
      breakRecords:
        createAttendanceDto.breakRecords?.map((breakRecord) => ({
          startAt: breakRecord.startAt,
          endAt: breakRecord.endAt,
          notes: breakRecord.notes,
        })) ?? [],
      isOffDayAttendance: dayResolution.offDay,
      offDayType: this.getOffDayType(dayResolution),
      dayResolution,
      status: createAttendanceDto.status,
      notes: createAttendanceDto.notes,
      approvalStatus: AttendanceApprovalStatus.Pending,
    });

    return this.attendanceRepository.save(attendance);
  }

  findAll(listAttendanceDto: ListAttendanceDto) {
    return this.buildAttendanceQuery(listAttendanceDto).getMany();
  }

  findByApprovalStatus(
    approvalStatus: AttendanceApprovalStatus,
    listAttendanceDto: ListAttendanceDto,
  ) {
    return this.buildAttendanceQuery(listAttendanceDto, approvalStatus).getMany();
  }

  async getMyAttendance(
    currentUser: CurrentUser,
    listAttendanceDto: ListAttendanceDto,
  ) {
    const employee = await this.findEmployeeByUser(currentUser);
    return this.buildAttendanceQuery({
      ...listAttendanceDto,
      employeeId: employee.id,
    }).getMany();
  }

  async getMissingAttendance(listAttendanceDto: ListAttendanceDto) {
    if (!listAttendanceDto.startDate || !listAttendanceDto.endDate) {
      throw new BadRequestException(
        'startDate and endDate are required for missing attendance reports',
      );
    }

    const startDate = this.parseDateOnly(listAttendanceDto.startDate);
    const endDate = this.parseDateOnly(listAttendanceDto.endDate);

    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    const employees = await this.getFilteredEmployees(listAttendanceDto);

    if (employees.length === 0) {
      return [];
    }

    const employeeIds = employees.map((employee) => employee.id);
    const attendanceRecords = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .where('employee.id IN (:...employeeIds)', { employeeIds })
      .andWhere('attendance.workDate BETWEEN :startDate AND :endDate', {
        startDate: listAttendanceDto.startDate,
        endDate: listAttendanceDto.endDate,
      })
      .getMany();
    const approvedLeaveRequests = await this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .leftJoinAndSelect('leaveRequest.employee', 'employee')
      .where('employee.id IN (:...employeeIds)', { employeeIds })
      .andWhere('leaveRequest.status = :status', {
        status: LeaveStatus.Approved,
      })
      .andWhere('leaveRequest.startDate <= :endDate', {
        endDate: listAttendanceDto.endDate,
      })
      .andWhere('leaveRequest.endDate >= :startDate', {
        startDate: listAttendanceDto.startDate,
      })
      .getMany();

    const attendanceLookup = new Set(
      attendanceRecords.map(
        (attendanceRecord) =>
          `${attendanceRecord.employee.id}:${attendanceRecord.workDate}`,
      ),
    );
    const approvedLeaveLookup = this.buildApprovedLeaveLookup(approvedLeaveRequests);
    const missingAttendance: Array<{
      employeeId: string;
      employeeCode: string;
      employeeName: string;
      email: string;
      branchId?: string;
      branchName?: string;
      departmentId?: string;
      departmentName?: string;
      workDate: string;
      reason: string;
    }> = [];

    for (const employee of employees) {
      for (const workDate of this.buildDateRange(
        listAttendanceDto.startDate,
        listAttendanceDto.endDate,
      )) {
        const attendanceKey = `${employee.id}:${workDate}`;

        if (attendanceLookup.has(attendanceKey)) {
          continue;
        }

        if (approvedLeaveLookup.has(attendanceKey)) {
          continue;
        }

        const dayResolution = await this.workSchedulesService.resolveEmployeeDay(
          employee.id,
          workDate,
        );

        if (!dayResolution.isWorkingDay || dayResolution.offDay) {
          continue;
        }

        missingAttendance.push({
          employeeId: employee.id,
          employeeCode: employee.employeeCode,
          employeeName: employee.fullName,
          email: employee.email,
          branchId: employee.branch?.id,
          branchName: employee.branch?.name,
          departmentId: employee.department?.id,
          departmentName: employee.department?.name,
          workDate,
          reason: 'attendance_not_submitted',
        });
      }
    }

    return missingAttendance;
  }

  async approve(
    attendanceId: string,
    approveAttendanceDto: ApproveAttendanceDto,
    currentUser: CurrentUser,
  ) {
    const attendance = await this.attendanceRepository.findOne({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    attendance.approvalStatus = approveAttendanceDto.approvalStatus;
    attendance.approvalNotes = approveAttendanceDto.approvalNotes;
    attendance.approvedAt = new Date();
    attendance.approvedByUserId = currentUser.id ?? currentUser.sub;
    attendance.approvedByEmail = currentUser.email;

    return this.attendanceRepository.save(attendance);
  }

  private buildAttendanceLocation(
    location?: AttendanceLocationDto,
    officeLocationId?: string,
    officeLocationName?: string,
    distanceMetersFromOffice?: number,
    isInsideOffice?: boolean,
    matchedBy?: 'ip' | 'location',
  ): AttendanceLocation | undefined {
    if (!location) {
      return undefined;
    }

    return {
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      officeLocationId,
      officeLocationName,
      distanceMetersFromOffice,
      isInsideOffice,
      matchedBy,
    };
  }

  private getOffDayType(dayResolution: AttendanceDayResolution) {
    if (!dayResolution.offDay) {
      return undefined;
    }

    if (dayResolution.source === 'holiday') {
      return 'holiday';
    }

    if (dayResolution.source === 'employee_override') {
      return dayResolution.overrideType ?? 'employee_override';
    }

    if (dayResolution.source === 'work_schedule') {
      return 'weekly_off_day';
    }

    return dayResolution.source;
  }

  private buildAttendanceQuery(
    listAttendanceDto: ListAttendanceDto,
    approvalStatus?: AttendanceApprovalStatus,
  ) {
    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .leftJoinAndSelect('employee.branch', 'branch')
      .leftJoinAndSelect('employee.department', 'department')
      .orderBy('attendance.workDate', 'DESC')
      .addOrderBy('attendance.createdAt', 'DESC');

    if (approvalStatus) {
      query.andWhere('attendance.approvalStatus = :approvalStatus', {
        approvalStatus,
      });
    }

    if (listAttendanceDto.employeeId) {
      query.andWhere('employee.id = :employeeId', {
        employeeId: listAttendanceDto.employeeId,
      });
    }

    if (listAttendanceDto.branchId) {
      query.andWhere('branch.id = :branchId', {
        branchId: listAttendanceDto.branchId,
      });
    }

    if (listAttendanceDto.departmentId) {
      query.andWhere('department.id = :departmentId', {
        departmentId: listAttendanceDto.departmentId,
      });
    }

    if (listAttendanceDto.startDate) {
      query.andWhere('attendance.workDate >= :startDate', {
        startDate: listAttendanceDto.startDate,
      });
    }

    if (listAttendanceDto.endDate) {
      query.andWhere('attendance.workDate <= :endDate', {
        endDate: listAttendanceDto.endDate,
      });
    }

    if (listAttendanceDto.search) {
      query.andWhere(
        `(
          LOWER(employee.employeeCode) LIKE LOWER(:search)
          OR LOWER(employee.fullName) LIKE LOWER(:search)
          OR LOWER(employee.email) LIKE LOWER(:search)
        )`,
        {
          search: `%${listAttendanceDto.search}%`,
        },
      );
    }

    return query;
  }

  private async getFilteredEmployees(listAttendanceDto: ListAttendanceDto) {
    const query = this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.branch', 'branch')
      .leftJoinAndSelect('employee.department', 'department')
      .where('employee.status IN (:...activeStatuses)', {
        activeStatuses: [EmploymentStatus.Active, EmploymentStatus.Probation],
      })
      .orderBy('employee.fullName', 'ASC');

    if (listAttendanceDto.employeeId) {
      query.andWhere('employee.id = :employeeId', {
        employeeId: listAttendanceDto.employeeId,
      });
    }

    if (listAttendanceDto.branchId) {
      query.andWhere('branch.id = :branchId', {
        branchId: listAttendanceDto.branchId,
      });
    }

    if (listAttendanceDto.departmentId) {
      query.andWhere('department.id = :departmentId', {
        departmentId: listAttendanceDto.departmentId,
      });
    }

    if (listAttendanceDto.search) {
      query.andWhere(
        `(
          LOWER(employee.employeeCode) LIKE LOWER(:search)
          OR LOWER(employee.fullName) LIKE LOWER(:search)
          OR LOWER(employee.email) LIKE LOWER(:search)
        )`,
        {
          search: `%${listAttendanceDto.search}%`,
        },
      );
    }

    return query.getMany();
  }

  private buildApprovedLeaveLookup(approvedLeaveRequests: LeaveRequest[]) {
    const approvedLeaveLookup = new Set<string>();

    for (const leaveRequest of approvedLeaveRequests) {
      for (const leaveDate of this.buildDateRange(
        leaveRequest.startDate,
        leaveRequest.endDate,
      )) {
        approvedLeaveLookup.add(`${leaveRequest.employee.id}:${leaveDate}`);
      }
    }

    return approvedLeaveLookup;
  }

  private buildDateRange(startDate: string, endDate: string) {
    const dates: string[] = [];
    const currentDate = this.parseDateOnly(startDate);
    const finalDate = this.parseDateOnly(endDate);

    while (currentDate.getTime() <= finalDate.getTime()) {
      dates.push(currentDate.toISOString().slice(0, 10));
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return dates;
  }

  private parseDateOnly(dateValue: string) {
    return new Date(`${dateValue}T00:00:00.000Z`);
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
}
