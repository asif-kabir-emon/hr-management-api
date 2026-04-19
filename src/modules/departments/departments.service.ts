import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchDepartment } from '../branches/entities/branch-department.entity';
import { Company } from '../companies/entities/company.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Holiday } from '../holidays/entities/holiday.entity';
import { Notice } from '../notices/entities/notice.entity';
import { PayrollRun } from '../payroll/entities/payroll-run.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Department } from './entities/department.entity';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(BranchDepartment)
    private readonly branchDepartmentRepository: Repository<BranchDepartment>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Holiday)
    private readonly holidayRepository: Repository<Holiday>,
    @InjectRepository(Notice)
    private readonly noticeRepository: Repository<Notice>,
    @InjectRepository(PayrollRun)
    private readonly payrollRunRepository: Repository<PayrollRun>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    const { companyId, parentDepartmentId, ...departmentPayload } =
      createDepartmentDto;
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const parentDepartment = parentDepartmentId
      ? await this.findOne(parentDepartmentId)
      : undefined;
    const department = this.departmentRepository.create({
      ...departmentPayload,
      company,
      parentDepartment,
    });

    return this.departmentRepository.save(department);
  }

  findAll() {
    return this.departmentRepository.find({
      relations: { parentDepartment: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: { parentDepartment: true },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    const department = await this.findOne(id);
    const { companyId, parentDepartmentId, ...departmentPayload } =
      updateDepartmentDto;

    if (companyId) {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      department.company = company;
    }

    if (parentDepartmentId) {
      department.parentDepartment = await this.findOne(parentDepartmentId);
    }

    Object.assign(department, departmentPayload);
    return this.departmentRepository.save(department);
  }

  async remove(id: string) {
    const department = await this.findOne(id);
    await this.assertDepartmentCanBeDeleted(department.id);
    await this.departmentRepository.softRemove(department);

    return {
      message: 'Department deleted successfully',
    };
  }

  private async assertDepartmentCanBeDeleted(departmentId: string) {
    const [
      employeesCount,
      childDepartmentsCount,
      branchDepartmentsCount,
      holidaysCount,
      payrollRunsCount,
      noticesCount,
    ] = await Promise.all([
      this.employeeRepository.count({
        where: { department: { id: departmentId } },
      }),
      this.departmentRepository.count({
        where: { parentDepartment: { id: departmentId } },
      }),
      this.branchDepartmentRepository.count({
        where: { department: { id: departmentId } },
      }),
      this.holidayRepository.count({
        where: { department: { id: departmentId } },
      }),
      this.payrollRunRepository.count({
        where: { department: { id: departmentId } },
      }),
      this.noticeRepository.count({ where: { departmentId } }),
    ]);
    const blockers = [
      employeesCount ? `${employeesCount} employee(s)` : null,
      childDepartmentsCount ? `${childDepartmentsCount} child department(s)` : null,
      branchDepartmentsCount
        ? `${branchDepartmentsCount} branch department assignment(s)`
        : null,
      holidaysCount ? `${holidaysCount} holiday(s)` : null,
      payrollRunsCount ? `${payrollRunsCount} payroll run(s)` : null,
      noticesCount ? `${noticesCount} notice(s)` : null,
    ].filter(Boolean);

    if (blockers.length > 0) {
      throw new BadRequestException(
        `Department cannot be deleted because it is used by ${blockers.join(
          ', ',
        )}. Delete or reassign related data first.`,
      );
    }
  }
}
