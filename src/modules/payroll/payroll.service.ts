import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CurrentUser } from "../auth/interfaces/current-user.interface";
import { BranchesService } from "../branches/branches.service";
import { DepartmentsService } from "../departments/departments.service";
import {
  Employee,
  EmploymentStatus,
} from "../employees/entities/employee.entity";
import { WorkflowsService } from "../workflows/workflows.service";
import { CreatePayrollRunDto } from "./dto/create-payroll-run.dto";
import { ListPayrollRunsDto } from "./dto/list-payroll-runs.dto";
import { UpdatePayrollItemDto } from "./dto/update-payroll-item.dto";
import { PayrollItem } from "./entities/payroll-item.entity";
import { PayrollRun, PayrollRunStatus } from "./entities/payroll-run.entity";

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(PayrollRun)
    private readonly payrollRunRepository: Repository<PayrollRun>,
    @InjectRepository(PayrollItem)
    private readonly payrollItemRepository: Repository<PayrollItem>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly branchesService: BranchesService,
    private readonly departmentsService: DepartmentsService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  async createPayrollRun(
    createPayrollRunDto: CreatePayrollRunDto,
    currentUser: CurrentUser,
  ) {
    this.validateDateRange(
      createPayrollRunDto.periodStart,
      createPayrollRunDto.periodEnd,
    );

    const payrollRun = this.payrollRunRepository.create({
      name: createPayrollRunDto.name,
      periodStart: createPayrollRunDto.periodStart,
      periodEnd: createPayrollRunDto.periodEnd,
      payDate: createPayrollRunDto.payDate,
      currency: createPayrollRunDto.currency,
      notes: createPayrollRunDto.notes,
      status: PayrollRunStatus.Draft,
      createdByUserId: currentUser.id ?? currentUser.sub,
      createdByEmail: currentUser.email,
    });

    if (createPayrollRunDto.branchId) {
      payrollRun.branch = await this.branchesService.findBranch(
        createPayrollRunDto.branchId,
      );
    }

    if (createPayrollRunDto.departmentId) {
      payrollRun.department = await this.departmentsService.findOne(
        createPayrollRunDto.departmentId,
      );
    }

    const savedPayrollRun = await this.payrollRunRepository.save(payrollRun);
    const employees = await this.findEmployeesForPayrollRun(savedPayrollRun);

    if (employees.length === 0) {
      throw new BadRequestException(
        "No eligible employees found for the selected payroll filters",
      );
    }

    const payrollItems = employees.map((employee) => {
      const baseSalary = Number(employee.salaryInformation?.baseSalary ?? 0);
      const allowanceAmount = Number(
        employee.salaryInformation?.allowanceAmount ?? 0,
      );
      const grossAmount = baseSalary + allowanceAmount;

      return this.payrollItemRepository.create({
        payrollRun: savedPayrollRun,
        employee,
        salarySnapshot: {
          baseSalary,
          allowanceAmount,
          currency:
            createPayrollRunDto.currency ??
            employee.salaryInformation?.currency,
          payFrequency: employee.salaryInformation?.payFrequency,
          branchName: employee.branch?.name,
          departmentName: employee.department?.name,
          employeeStatus: employee.status,
        },
        baseSalary,
        allowanceAmount,
        bonusAmount: 0,
        deductionAmount: 0,
        grossAmount,
        netAmount: grossAmount,
      });
    });

    await this.payrollItemRepository.save(payrollItems);
    await this.recalculatePayrollRunTotals(savedPayrollRun.id);

    return this.findPayrollRun(savedPayrollRun.id);
  }

  findPayrollRuns(listPayrollRunsDto: ListPayrollRunsDto) {
    const query = this.payrollRunRepository
      .createQueryBuilder("payrollRun")
      .leftJoinAndSelect("payrollRun.branch", "branch")
      .leftJoinAndSelect("payrollRun.department", "department")
      .orderBy("payrollRun.createdAt", "DESC");

    if (listPayrollRunsDto.branchId) {
      query.andWhere("branch.id = :branchId", {
        branchId: listPayrollRunsDto.branchId,
      });
    }

    if (listPayrollRunsDto.departmentId) {
      query.andWhere("department.id = :departmentId", {
        departmentId: listPayrollRunsDto.departmentId,
      });
    }

    if (listPayrollRunsDto.status) {
      query.andWhere("payrollRun.status = :status", {
        status: listPayrollRunsDto.status,
      });
    }

    if (listPayrollRunsDto.startDate) {
      query.andWhere("payrollRun.periodEnd >= :startDate", {
        startDate: listPayrollRunsDto.startDate,
      });
    }

    if (listPayrollRunsDto.endDate) {
      query.andWhere("payrollRun.periodStart <= :endDate", {
        endDate: listPayrollRunsDto.endDate,
      });
    }

    if (listPayrollRunsDto.search) {
      query.andWhere("LOWER(payrollRun.name) LIKE LOWER(:search)", {
        search: `%${listPayrollRunsDto.search}%`,
      });
    }

    return query.getMany();
  }

  async findPayrollRun(id: string) {
    const payrollRun = await this.payrollRunRepository.findOne({
      where: { id },
    });

    if (!payrollRun) {
      throw new NotFoundException("Payroll run not found");
    }

    const items = await this.payrollItemRepository.find({
      where: { payrollRun: { id } },
      order: {
        employee: {
          fullName: "ASC",
        },
      },
    });

    return {
      ...payrollRun,
      items,
    };
  }

  async updatePayrollItem(
    payrollRunId: string,
    payrollItemId: string,
    updatePayrollItemDto: UpdatePayrollItemDto,
  ) {
    const payrollRun = await this.ensureMutablePayrollRun(payrollRunId);
    const payrollItem = await this.payrollItemRepository.findOne({
      where: {
        id: payrollItemId,
        payrollRun: { id: payrollRun.id },
      },
    });

    if (!payrollItem) {
      throw new NotFoundException("Payroll item not found");
    }

    payrollItem.bonusAmount =
      updatePayrollItemDto.bonusAmount ?? Number(payrollItem.bonusAmount);
    payrollItem.deductionAmount =
      updatePayrollItemDto.deductionAmount ??
      Number(payrollItem.deductionAmount);
    payrollItem.remarks = updatePayrollItemDto.remarks ?? payrollItem.remarks;
    payrollItem.netAmount =
      Number(payrollItem.grossAmount) +
      Number(payrollItem.bonusAmount) -
      Number(payrollItem.deductionAmount);

    await this.payrollItemRepository.save(payrollItem);
    await this.recalculatePayrollRunTotals(payrollRun.id);

    return this.findPayrollRun(payrollRun.id);
  }

  async submitPayrollRun(id: string, currentUser: CurrentUser) {
    const payrollRun = await this.ensureMutablePayrollRun(id);
    const payrollItems = await this.payrollItemRepository.find({
      where: { payrollRun: { id: payrollRun.id } },
    });

    if (payrollItems.length === 0) {
      throw new BadRequestException("Payroll run has no items to submit");
    }

    await this.workflowsService.ensureDefaultPayrollApprovalDefinition();
    const workflowInstance = await this.workflowsService.startInstance({
      definitionCode: "payroll-approval",
      referenceType: "payroll_run",
      referenceId: payrollRun.id,
      requestedByUserId: currentUser.id ?? currentUser.sub,
      requestedByEmail: currentUser.email,
    });

    payrollRun.workflowInstanceId = workflowInstance.id;
    payrollRun.status = PayrollRunStatus.PendingApproval;

    await this.payrollRunRepository.save(payrollRun);

    return this.findPayrollRun(payrollRun.id);
  }

  private async findEmployeesForPayrollRun(payrollRun: PayrollRun) {
    const query = this.employeeRepository
      .createQueryBuilder("employee")
      .leftJoinAndSelect("employee.branch", "branch")
      .leftJoinAndSelect("employee.department", "department")
      .where("employee.status IN (:...statuses)", {
        statuses: [
          EmploymentStatus.Active,
          EmploymentStatus.Probation,
          EmploymentStatus.OnLeave,
        ],
      })
      .orderBy("employee.fullName", "ASC");

    if (payrollRun.branch?.id) {
      query.andWhere("branch.id = :branchId", {
        branchId: payrollRun.branch.id,
      });
    }

    if (payrollRun.department?.id) {
      query.andWhere("department.id = :departmentId", {
        departmentId: payrollRun.department.id,
      });
    }

    return query.getMany();
  }

  private async ensureMutablePayrollRun(id: string) {
    const payrollRun = await this.payrollRunRepository.findOne({
      where: { id },
    });

    if (!payrollRun) {
      throw new NotFoundException("Payroll run not found");
    }

    if (payrollRun.status !== PayrollRunStatus.Draft) {
      throw new BadRequestException("Only draft payroll runs can be modified");
    }

    return payrollRun;
  }

  private async recalculatePayrollRunTotals(payrollRunId: string) {
    const payrollRun = await this.payrollRunRepository.findOne({
      where: { id: payrollRunId },
    });

    if (!payrollRun) {
      throw new NotFoundException("Payroll run not found");
    }

    const payrollItems = await this.payrollItemRepository.find({
      where: { payrollRun: { id: payrollRunId } },
    });

    payrollRun.employeeCount = payrollItems.length;
    payrollRun.grossAmount = payrollItems.reduce(
      (sum, payrollItem) => sum + Number(payrollItem.grossAmount),
      0,
    );
    payrollRun.deductionAmount = payrollItems.reduce(
      (sum, payrollItem) => sum + Number(payrollItem.deductionAmount),
      0,
    );
    payrollRun.bonusAmount = payrollItems.reduce(
      (sum, payrollItem) => sum + Number(payrollItem.bonusAmount),
      0,
    );
    payrollRun.netAmount = payrollItems.reduce(
      (sum, payrollItem) => sum + Number(payrollItem.netAmount),
      0,
    );

    await this.payrollRunRepository.save(payrollRun);
  }

  private validateDateRange(periodStart: string, periodEnd: string) {
    const startDate = new Date(`${periodStart}T00:00:00.000Z`);
    const endDate = new Date(`${periodEnd}T00:00:00.000Z`);

    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException(
        "periodEnd must be on or after periodStart",
      );
    }
  }
}
