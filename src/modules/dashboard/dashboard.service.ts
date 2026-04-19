import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permissions } from '../../common/constants/permissions';
import { CurrentUser } from '../auth/interfaces/current-user.interface';
import {
  AttendanceApprovalStatus,
  AttendanceRecord,
} from '../attendance/entities/attendance.entity';
import { Employee, EmploymentStatus } from '../employees/entities/employee.entity';
import { LeaveRequest, LeaveStatus } from '../leave/entities/leave-request.entity';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
  ) {}

  async getOverview(currentUser: CurrentUser, dashboardFiltersDto: DashboardFiltersDto) {
    const normalizedFilters = this.normalizeFilters(dashboardFiltersDto);
    const employeeQuery = this.buildEmployeeQuery(normalizedFilters);
    const attendanceQuery = this.buildAttendanceQuery(normalizedFilters);
    const leaveQuery = this.buildLeaveRequestQuery(normalizedFilters);
    const [
      totalEmployees,
      activeEmployees,
      probationEmployees,
      onLeaveEmployees,
      attendanceRecords,
      leaveRequests,
      attendanceByBranch,
      attendanceByDepartment,
      recentAttendanceRecords,
    ] = await Promise.all([
      employeeQuery.getCount(),
      this.buildEmployeeQuery(normalizedFilters)
        .andWhere('employee.status = :activeStatus', {
          activeStatus: EmploymentStatus.Active,
        })
        .getCount(),
      this.buildEmployeeQuery(normalizedFilters)
        .andWhere('employee.status = :probationStatus', {
          probationStatus: EmploymentStatus.Probation,
        })
        .getCount(),
      this.buildEmployeeQuery(normalizedFilters)
        .andWhere('employee.status = :onLeaveStatus', {
          onLeaveStatus: EmploymentStatus.OnLeave,
        })
        .getCount(),
      attendanceQuery.getMany(),
      leaveQuery.getMany(),
      this.buildAttendanceBreakdownByBranchQuery(normalizedFilters).getRawMany(),
      this.buildAttendanceBreakdownByDepartmentQuery(normalizedFilters).getRawMany(),
      this.buildAttendanceQuery(normalizedFilters)
        .limit(10)
        .getMany(),
    ]);

    const attendanceSummary = this.buildAttendanceSummary(attendanceRecords);
    const leaveSummary = this.buildLeaveSummary(leaveRequests);
    const pendingApprovals = await this.buildPendingApprovals(
      currentUser,
      normalizedFilters,
    );

    return {
      message: 'Dashboard overview fetched successfully',
      viewer: {
        id: currentUser.id ?? currentUser.sub,
        email: currentUser.email,
        role: currentUser.role,
        permissions: currentUser.permissions,
        canApproveAttendance: this.hasPermission(
          currentUser,
          Permissions.AttendanceApprove,
        ),
        canApproveLeave: this.hasPermission(currentUser, Permissions.LeaveApprove),
      },
      filters: normalizedFilters,
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        probation: probationEmployees,
        onLeave: onLeaveEmployees,
      },
      attendance: {
        summary: attendanceSummary,
        byBranch: attendanceByBranch.map((item) => ({
          branchId: item.branchId ?? null,
          branchName: item.branchName ?? 'Unassigned',
          totalRecords: Number(item.totalRecords ?? 0),
          approvedRecords: Number(item.approvedRecords ?? 0),
          pendingRecords: Number(item.pendingRecords ?? 0),
          rejectedRecords: Number(item.rejectedRecords ?? 0),
        })),
        byDepartment: attendanceByDepartment.map((item) => ({
          departmentId: item.departmentId ?? null,
          departmentName: item.departmentName ?? 'Unassigned',
          totalRecords: Number(item.totalRecords ?? 0),
          approvedRecords: Number(item.approvedRecords ?? 0),
          pendingRecords: Number(item.pendingRecords ?? 0),
          rejectedRecords: Number(item.rejectedRecords ?? 0),
        })),
        recentRecords: recentAttendanceRecords,
      },
      leave: leaveSummary,
      pendingApprovals,
    };
  }

  private async buildPendingApprovals(
    currentUser: CurrentUser,
    dashboardFiltersDto: DashboardFiltersDto,
  ) {
    const canApproveAttendance = this.hasPermission(
      currentUser,
      Permissions.AttendanceApprove,
    );
    const canApproveLeave = this.hasPermission(currentUser, Permissions.LeaveApprove);

    const [attendance, leaveRequests] = await Promise.all([
      canApproveAttendance
        ? this.buildAttendanceQuery(
            dashboardFiltersDto,
            AttendanceApprovalStatus.Pending,
          )
            .limit(10)
            .getMany()
        : Promise.resolve([]),
      canApproveLeave
        ? this.buildLeaveRequestQuery(dashboardFiltersDto, LeaveStatus.Pending)
            .limit(10)
            .getMany()
        : Promise.resolve([]),
    ]);

    return {
      attendance,
      leaveRequests,
    };
  }

  private buildAttendanceSummary(attendanceRecords: AttendanceRecord[]) {
    return attendanceRecords.reduce(
      (summary, attendanceRecord) => {
        summary.total += 1;

        if (attendanceRecord.approvalStatus === AttendanceApprovalStatus.Approved) {
          summary.approved += 1;
        }

        if (attendanceRecord.approvalStatus === AttendanceApprovalStatus.Pending) {
          summary.pending += 1;
        }

        if (attendanceRecord.approvalStatus === AttendanceApprovalStatus.Rejected) {
          summary.rejected += 1;
        }

        if (attendanceRecord.status === 'present') {
          summary.present += 1;
        }

        if (attendanceRecord.status === 'remote') {
          summary.remote += 1;
        }

        if (attendanceRecord.isOffDayAttendance) {
          summary.offDayAttendance += 1;
        }

        if (attendanceRecord.isCheckInInsideOffice) {
          summary.insideOfficeCheckIn += 1;
        }

        if (attendanceRecord.isCheckOutInsideOffice) {
          summary.insideOfficeCheckOut += 1;
        }

        return summary;
      },
      {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        present: 0,
        remote: 0,
        offDayAttendance: 0,
        insideOfficeCheckIn: 0,
        insideOfficeCheckOut: 0,
      },
    );
  }

  private buildLeaveSummary(leaveRequests: LeaveRequest[]) {
    return leaveRequests.reduce(
      (summary, leaveRequest) => {
        summary.total += 1;

        if (leaveRequest.status === LeaveStatus.Pending) {
          summary.pending += 1;
        }

        if (leaveRequest.status === LeaveStatus.Approved) {
          summary.approved += 1;
          summary.approvedDays += Number(leaveRequest.requestedDays ?? 0);
        }

        if (leaveRequest.status === LeaveStatus.Rejected) {
          summary.rejected += 1;
        }

        if (leaveRequest.status === LeaveStatus.Cancelled) {
          summary.cancelled += 1;
        }

        return summary;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
        approvedDays: 0,
      },
    );
  }

  private buildEmployeeQuery(dashboardFiltersDto: DashboardFiltersDto) {
    const query = this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoin('employee.branch', 'branch')
      .leftJoin('employee.department', 'department');

    this.applyCommonEmployeeFilters(query, dashboardFiltersDto);

    return query;
  }

  private buildAttendanceQuery(
    dashboardFiltersDto: DashboardFiltersDto,
    approvalStatus?: AttendanceApprovalStatus,
  ) {
    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .leftJoinAndSelect('employee.branch', 'branch')
      .leftJoinAndSelect('employee.department', 'department')
      .orderBy('attendance.workDate', 'DESC')
      .addOrderBy('attendance.createdAt', 'DESC');

    this.applyCommonEmployeeFilters(query, dashboardFiltersDto);

    if (dashboardFiltersDto.startDate) {
      query.andWhere('attendance.workDate >= :startDate', {
        startDate: dashboardFiltersDto.startDate,
      });
    }

    if (dashboardFiltersDto.endDate) {
      query.andWhere('attendance.workDate <= :endDate', {
        endDate: dashboardFiltersDto.endDate,
      });
    }

    if (approvalStatus) {
      query.andWhere('attendance.approvalStatus = :approvalStatus', {
        approvalStatus,
      });
    }

    return query;
  }

  private buildLeaveRequestQuery(
    dashboardFiltersDto: DashboardFiltersDto,
    status?: LeaveStatus,
  ) {
    const query = this.leaveRequestRepository
      .createQueryBuilder('leaveRequest')
      .leftJoinAndSelect('leaveRequest.employee', 'employee')
      .leftJoinAndSelect('employee.branch', 'branch')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('leaveRequest.leaveType', 'leaveType')
      .orderBy('leaveRequest.createdAt', 'DESC');

    this.applyCommonEmployeeFilters(query, dashboardFiltersDto);

    if (dashboardFiltersDto.startDate) {
      query.andWhere('leaveRequest.endDate >= :startDate', {
        startDate: dashboardFiltersDto.startDate,
      });
    }

    if (dashboardFiltersDto.endDate) {
      query.andWhere('leaveRequest.startDate <= :endDate', {
        endDate: dashboardFiltersDto.endDate,
      });
    }

    if (status) {
      query.andWhere('leaveRequest.status = :status', { status });
    }

    return query;
  }

  private buildAttendanceBreakdownByBranchQuery(dashboardFiltersDto: DashboardFiltersDto) {
    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoin('attendance.employee', 'employee')
      .leftJoin('employee.branch', 'branch')
      .leftJoin('employee.department', 'department')
      .select('branch.id', 'branchId')
      .addSelect('branch.name', 'branchName')
      .addSelect('COUNT(attendance.id)', 'totalRecords')
      .addSelect(
        `SUM(CASE WHEN attendance.approvalStatus = '${AttendanceApprovalStatus.Approved}' THEN 1 ELSE 0 END)`,
        'approvedRecords',
      )
      .addSelect(
        `SUM(CASE WHEN attendance.approvalStatus = '${AttendanceApprovalStatus.Pending}' THEN 1 ELSE 0 END)`,
        'pendingRecords',
      )
      .addSelect(
        `SUM(CASE WHEN attendance.approvalStatus = '${AttendanceApprovalStatus.Rejected}' THEN 1 ELSE 0 END)`,
        'rejectedRecords',
      )
      .groupBy('branch.id')
      .addGroupBy('branch.name')
      .orderBy('branch.name', 'ASC');

    this.applyCommonEmployeeFilters(query, dashboardFiltersDto);

    if (dashboardFiltersDto.startDate) {
      query.andWhere('attendance.workDate >= :startDate', {
        startDate: dashboardFiltersDto.startDate,
      });
    }

    if (dashboardFiltersDto.endDate) {
      query.andWhere('attendance.workDate <= :endDate', {
        endDate: dashboardFiltersDto.endDate,
      });
    }

    return query;
  }

  private buildAttendanceBreakdownByDepartmentQuery(
    dashboardFiltersDto: DashboardFiltersDto,
  ) {
    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoin('attendance.employee', 'employee')
      .leftJoin('employee.branch', 'branch')
      .leftJoin('employee.department', 'department')
      .select('department.id', 'departmentId')
      .addSelect('department.name', 'departmentName')
      .addSelect('COUNT(attendance.id)', 'totalRecords')
      .addSelect(
        `SUM(CASE WHEN attendance.approvalStatus = '${AttendanceApprovalStatus.Approved}' THEN 1 ELSE 0 END)`,
        'approvedRecords',
      )
      .addSelect(
        `SUM(CASE WHEN attendance.approvalStatus = '${AttendanceApprovalStatus.Pending}' THEN 1 ELSE 0 END)`,
        'pendingRecords',
      )
      .addSelect(
        `SUM(CASE WHEN attendance.approvalStatus = '${AttendanceApprovalStatus.Rejected}' THEN 1 ELSE 0 END)`,
        'rejectedRecords',
      )
      .groupBy('department.id')
      .addGroupBy('department.name')
      .orderBy('department.name', 'ASC');

    this.applyCommonEmployeeFilters(query, dashboardFiltersDto);

    if (dashboardFiltersDto.startDate) {
      query.andWhere('attendance.workDate >= :startDate', {
        startDate: dashboardFiltersDto.startDate,
      });
    }

    if (dashboardFiltersDto.endDate) {
      query.andWhere('attendance.workDate <= :endDate', {
        endDate: dashboardFiltersDto.endDate,
      });
    }

    return query;
  }

  private applyCommonEmployeeFilters(
    query: {
      andWhere: (sql: string, parameters?: Record<string, unknown>) => unknown;
    },
    dashboardFiltersDto: DashboardFiltersDto,
  ) {
    if (dashboardFiltersDto.employeeId) {
      query.andWhere('employee.id = :employeeId', {
        employeeId: dashboardFiltersDto.employeeId,
      });
    }

    if (dashboardFiltersDto.branchId) {
      query.andWhere('branch.id = :branchId', {
        branchId: dashboardFiltersDto.branchId,
      });
    }

    if (dashboardFiltersDto.departmentId) {
      query.andWhere('department.id = :departmentId', {
        departmentId: dashboardFiltersDto.departmentId,
      });
    }

    if (dashboardFiltersDto.search) {
      query.andWhere(
        `(
          LOWER(employee.employeeCode) LIKE LOWER(:search)
          OR LOWER(employee.fullName) LIKE LOWER(:search)
          OR LOWER(employee.email) LIKE LOWER(:search)
        )`,
        {
          search: `%${dashboardFiltersDto.search}%`,
        },
      );
    }
  }

  private hasPermission(currentUser: CurrentUser, permission: string) {
    return currentUser.permissions.includes(Permissions.All)
      || currentUser.permissions.includes(permission);
  }

  private normalizeFilters(dashboardFiltersDto: DashboardFiltersDto) {
    return {
      branchId: dashboardFiltersDto.branchId,
      departmentId: dashboardFiltersDto.departmentId,
      employeeId: dashboardFiltersDto.employeeId,
      search: dashboardFiltersDto.search,
      startDate: dashboardFiltersDto.startDate,
      endDate: dashboardFiltersDto.endDate,
    };
  }
}
