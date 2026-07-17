import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BranchesService } from "../branches/branches.service";
import { DepartmentsService } from "../departments/departments.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { EmployeeEmploymentEventDto } from "./dto/employee-employment-event.dto";
import { TransferEmployeeBranchDto } from "./dto/transfer-employee-branch.dto";
import { TransferEmployeeDepartmentDto } from "./dto/transfer-employee-department.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import {
  EmployeeBranchChangeType,
  EmployeeBranchHistory,
} from "./entities/employee-branch-history.entity";
import {
  EmployeeDepartmentChangeType,
  EmployeeDepartmentHistory,
} from "./entities/employee-department-history.entity";
import {
  EmployeeEmploymentEventType,
  EmployeeEmploymentHistory,
} from "./entities/employee-employment-history.entity";
import { Employee } from "./entities/employee.entity";
import { EmploymentStatus } from "./entities/employee.entity";

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(EmployeeDepartmentHistory)
    private readonly employeeDepartmentHistoryRepository: Repository<EmployeeDepartmentHistory>,
    @InjectRepository(EmployeeBranchHistory)
    private readonly employeeBranchHistoryRepository: Repository<EmployeeBranchHistory>,
    @InjectRepository(EmployeeEmploymentHistory)
    private readonly employeeEmploymentHistoryRepository: Repository<EmployeeEmploymentHistory>,
    private readonly branchesService: BranchesService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    const initialJoinDate =
      createEmployeeDto.joiningInformation?.currentJoinDate ??
      createEmployeeDto.joinDate ??
      new Date().toISOString().slice(0, 10);
    const employee = this.employeeRepository.create({
      employeeCode: createEmployeeDto.employeeCode,
      fullName: createEmployeeDto.fullName,
      email: createEmployeeDto.email,
      phone: createEmployeeDto.phone,
      jobTitle: createEmployeeDto.jobTitle,
      countryCode: createEmployeeDto.countryCode,
      stateCode: createEmployeeDto.stateCode,
      joinDate: initialJoinDate,
      personalInformation: createEmployeeDto.personalInformation ?? {},
      bankInformation: createEmployeeDto.bankInformation ?? {},
      salaryInformation: createEmployeeDto.salaryInformation ?? {},
      addressInformation: createEmployeeDto.addressInformation ?? {},
      joiningInformation: {
        originalJoinDate:
          createEmployeeDto.joiningInformation?.originalJoinDate ??
          initialJoinDate,
        currentJoinDate: initialJoinDate,
        confirmationDate:
          createEmployeeDto.joiningInformation?.confirmationDate,
        probationEndDate:
          createEmployeeDto.joiningInformation?.probationEndDate,
        lastWorkingDate: createEmployeeDto.joiningInformation?.lastWorkingDate,
        resignationDate: createEmployeeDto.joiningInformation?.resignationDate,
        employmentType: createEmployeeDto.joiningInformation?.employmentType,
        rejoinCount: createEmployeeDto.joiningInformation?.rejoinCount ?? 0,
      },
      status: createEmployeeDto.status,
    });

    if (createEmployeeDto.departmentId) {
      employee.department = await this.departmentsService.findOne(
        createEmployeeDto.departmentId,
      );
    }

    if (createEmployeeDto.branchId) {
      employee.branch = await this.branchesService.findBranch(
        createEmployeeDto.branchId,
      );
    }

    const savedEmployee = await this.employeeRepository.save(employee);

    if (savedEmployee.department) {
      await this.employeeDepartmentHistoryRepository.save(
        this.employeeDepartmentHistoryRepository.create({
          employee: savedEmployee,
          toDepartment: savedEmployee.department,
          changeType: EmployeeDepartmentChangeType.Assigned,
          effectiveDate: initialJoinDate,
          reason: "Initial department assignment",
        }),
      );
    }

    if (savedEmployee.branch) {
      await this.employeeBranchHistoryRepository.save(
        this.employeeBranchHistoryRepository.create({
          employee: savedEmployee,
          toBranch: savedEmployee.branch,
          changeType: EmployeeBranchChangeType.Assigned,
          effectiveDate: initialJoinDate,
          reason: "Initial branch assignment",
        }),
      );
    }

    await this.employeeEmploymentHistoryRepository.save(
      this.employeeEmploymentHistoryRepository.create({
        employee: savedEmployee,
        eventType: EmployeeEmploymentEventType.Joined,
        effectiveDate: initialJoinDate,
        employmentStatus: savedEmployee.status ?? EmploymentStatus.Active,
        notes: "Initial employee onboarding",
      }),
    );

    return savedEmployee;
  }

  findAll() {
    return this.employeeRepository.find({
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    const employee = await this.findOne(id);
    const previousDepartmentId = employee.department?.id;
    const previousBranchId = employee.branch?.id;

    Object.assign(employee, {
      employeeCode: updateEmployeeDto.employeeCode ?? employee.employeeCode,
      fullName: updateEmployeeDto.fullName ?? employee.fullName,
      email: updateEmployeeDto.email ?? employee.email,
      phone: updateEmployeeDto.phone ?? employee.phone,
      jobTitle: updateEmployeeDto.jobTitle ?? employee.jobTitle,
      countryCode: updateEmployeeDto.countryCode ?? employee.countryCode,
      stateCode: updateEmployeeDto.stateCode ?? employee.stateCode,
      joinDate: updateEmployeeDto.joinDate ?? employee.joinDate,
      status: updateEmployeeDto.status ?? employee.status,
      personalInformation: {
        ...(employee.personalInformation ?? {}),
        ...(updateEmployeeDto.personalInformation ?? {}),
      },
      bankInformation: {
        ...(employee.bankInformation ?? {}),
        ...(updateEmployeeDto.bankInformation ?? {}),
      },
      salaryInformation: {
        ...(employee.salaryInformation ?? {}),
        ...(updateEmployeeDto.salaryInformation ?? {}),
      },
      addressInformation: {
        ...(employee.addressInformation ?? {}),
        ...(updateEmployeeDto.addressInformation ?? {}),
      },
      joiningInformation: {
        ...(employee.joiningInformation ?? {}),
        ...(updateEmployeeDto.joiningInformation ?? {}),
      },
    });

    if (updateEmployeeDto.departmentId !== undefined) {
      employee.department = updateEmployeeDto.departmentId
        ? await this.departmentsService.findOne(updateEmployeeDto.departmentId)
        : undefined;
    }

    if (updateEmployeeDto.branchId !== undefined) {
      employee.branch = updateEmployeeDto.branchId
        ? await this.branchesService.findBranch(updateEmployeeDto.branchId)
        : undefined;
    }

    const updatedEmployee = await this.employeeRepository.save(employee);

    if (
      updateEmployeeDto.departmentId !== undefined &&
      previousDepartmentId !== updatedEmployee.department?.id
    ) {
      await this.employeeDepartmentHistoryRepository.save(
        this.employeeDepartmentHistoryRepository.create({
          employee: updatedEmployee,
          fromDepartment: previousDepartmentId
            ? await this.departmentsService.findOne(previousDepartmentId)
            : undefined,
          toDepartment: updatedEmployee.department,
          changeType: updatedEmployee.department
            ? EmployeeDepartmentChangeType.Transferred
            : EmployeeDepartmentChangeType.Removed,
          effectiveDate:
            updatedEmployee.joiningInformation?.currentJoinDate ??
            updatedEmployee.joinDate ??
            new Date().toISOString().slice(0, 10),
          reason: "Department updated from employee profile",
        }),
      );
    }

    if (
      updateEmployeeDto.branchId !== undefined &&
      previousBranchId !== updatedEmployee.branch?.id
    ) {
      await this.employeeBranchHistoryRepository.save(
        this.employeeBranchHistoryRepository.create({
          employee: updatedEmployee,
          fromBranch: previousBranchId
            ? await this.branchesService.findBranch(previousBranchId)
            : undefined,
          toBranch: updatedEmployee.branch,
          changeType: updatedEmployee.branch
            ? EmployeeBranchChangeType.Transferred
            : EmployeeBranchChangeType.Removed,
          effectiveDate:
            updatedEmployee.joiningInformation?.currentJoinDate ??
            updatedEmployee.joinDate ??
            new Date().toISOString().slice(0, 10),
          reason: "Branch updated from employee profile",
        }),
      );
    }

    return updatedEmployee;
  }

  async transferDepartment(
    id: string,
    transferEmployeeDepartmentDto: TransferEmployeeDepartmentDto,
  ) {
    const employee = await this.findOne(id);
    const fromDepartment = employee.department;
    const toDepartment = transferEmployeeDepartmentDto.departmentId
      ? await this.departmentsService.findOne(
          transferEmployeeDepartmentDto.departmentId,
        )
      : undefined;

    if (fromDepartment?.id === toDepartment?.id) {
      throw new BadRequestException("Employee is already in this department");
    }

    employee.department = toDepartment;
    const updatedEmployee = await this.employeeRepository.save(employee);

    await this.employeeDepartmentHistoryRepository.save(
      this.employeeDepartmentHistoryRepository.create({
        employee: updatedEmployee,
        fromDepartment,
        toDepartment,
        changeType: toDepartment
          ? fromDepartment
            ? EmployeeDepartmentChangeType.Transferred
            : EmployeeDepartmentChangeType.Assigned
          : EmployeeDepartmentChangeType.Removed,
        effectiveDate: transferEmployeeDepartmentDto.effectiveDate,
        reason: transferEmployeeDepartmentDto.reason,
      }),
    );

    return updatedEmployee;
  }

  async transferBranch(
    id: string,
    transferEmployeeBranchDto: TransferEmployeeBranchDto,
  ) {
    const employee = await this.findOne(id);
    const fromBranch = employee.branch;
    const toBranch = transferEmployeeBranchDto.branchId
      ? await this.branchesService.findBranch(
          transferEmployeeBranchDto.branchId,
        )
      : undefined;

    if (fromBranch?.id === toBranch?.id) {
      throw new BadRequestException("Employee is already in this branch");
    }

    employee.branch = toBranch;
    const updatedEmployee = await this.employeeRepository.save(employee);

    await this.employeeBranchHistoryRepository.save(
      this.employeeBranchHistoryRepository.create({
        employee: updatedEmployee,
        fromBranch,
        toBranch,
        changeType: toBranch
          ? fromBranch
            ? EmployeeBranchChangeType.Transferred
            : EmployeeBranchChangeType.Assigned
          : EmployeeBranchChangeType.Removed,
        effectiveDate: transferEmployeeBranchDto.effectiveDate,
        reason: transferEmployeeBranchDto.reason,
      }),
    );

    return updatedEmployee;
  }

  async recordEmploymentEvent(
    id: string,
    employeeEmploymentEventDto: EmployeeEmploymentEventDto,
  ) {
    const employee = await this.findOne(id);
    const joiningInformation = {
      ...(employee.joiningInformation ?? {}),
    };

    if (
      employeeEmploymentEventDto.eventType ===
      EmployeeEmploymentEventType.Resigned
    ) {
      employee.status = EmploymentStatus.Resigned;
      joiningInformation.resignationDate =
        employeeEmploymentEventDto.effectiveDate;
      joiningInformation.lastWorkingDate =
        employeeEmploymentEventDto.lastWorkingDate ??
        employeeEmploymentEventDto.effectiveDate;
    } else if (
      employeeEmploymentEventDto.eventType ===
      EmployeeEmploymentEventType.Terminated
    ) {
      employee.status = EmploymentStatus.Terminated;
      joiningInformation.lastWorkingDate =
        employeeEmploymentEventDto.lastWorkingDate ??
        employeeEmploymentEventDto.effectiveDate;
    } else if (
      employeeEmploymentEventDto.eventType ===
      EmployeeEmploymentEventType.Rejoined
    ) {
      employee.status = EmploymentStatus.Active;
      joiningInformation.currentJoinDate =
        employeeEmploymentEventDto.effectiveDate;
      joiningInformation.rejoinCount =
        (joiningInformation.rejoinCount ?? 0) + 1;
      joiningInformation.resignationDate = undefined;
      joiningInformation.lastWorkingDate = undefined;
      employee.joinDate = employeeEmploymentEventDto.effectiveDate;
    } else {
      employee.status = EmploymentStatus.Active;
      joiningInformation.currentJoinDate =
        employeeEmploymentEventDto.effectiveDate;
      joiningInformation.originalJoinDate =
        joiningInformation.originalJoinDate ??
        employeeEmploymentEventDto.effectiveDate;
      employee.joinDate = employeeEmploymentEventDto.effectiveDate;
    }

    employee.joiningInformation = joiningInformation;
    const updatedEmployee = await this.employeeRepository.save(employee);

    await this.employeeEmploymentHistoryRepository.save(
      this.employeeEmploymentHistoryRepository.create({
        employee: updatedEmployee,
        eventType: employeeEmploymentEventDto.eventType,
        effectiveDate: employeeEmploymentEventDto.effectiveDate,
        employmentStatus: updatedEmployee.status,
        reason: employeeEmploymentEventDto.reason,
        notes: employeeEmploymentEventDto.notes,
      }),
    );

    return updatedEmployee;
  }

  getDepartmentHistory(employeeId: string) {
    return this.employeeDepartmentHistoryRepository.find({
      where: {
        employee: { id: employeeId },
      },
      order: { effectiveDate: "DESC", createdAt: "DESC" },
    });
  }

  getBranchHistory(employeeId: string) {
    return this.employeeBranchHistoryRepository.find({
      where: {
        employee: { id: employeeId },
      },
      order: { effectiveDate: "DESC", createdAt: "DESC" },
    });
  }

  getEmploymentHistory(employeeId: string) {
    return this.employeeEmploymentHistoryRepository.find({
      where: {
        employee: { id: employeeId },
      },
      order: { effectiveDate: "DESC", createdAt: "DESC" },
    });
  }
}
