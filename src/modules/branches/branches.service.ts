import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Company } from "../companies/entities/company.entity";
import { Department } from "../departments/entities/department.entity";
import { Employee } from "../employees/entities/employee.entity";
import { Notice } from "../notices/entities/notice.entity";
import { OfficeLocation } from "../office-locations/entities/office-location.entity";
import { PayrollRun } from "../payroll/entities/payroll-run.entity";
import { AssignBranchDepartmentDto } from "./dto/assign-branch-department.dto";
import { CreateBranchLocationDto } from "./dto/create-branch-location.dto";
import { CreateBranchNetworkDto } from "./dto/create-branch-network.dto";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { CreateOfficeTypeDto } from "./dto/create-office-type.dto";
import { UpdateBranchLocationDto } from "./dto/update-branch-location.dto";
import { UpdateBranchNetworkDto } from "./dto/update-branch-network.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";
import { UpdateOfficeTypeDto } from "./dto/update-office-type.dto";
import { BranchDepartment } from "./entities/branch-department.entity";
import { Branch } from "./entities/branch.entity";
import { BranchLocation } from "./entities/branch-location.entity";
import { BranchNetwork } from "./entities/branch-network.entity";
import { OfficeType } from "./entities/office-type.entity";

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(BranchLocation)
    private readonly branchLocationRepository: Repository<BranchLocation>,
    @InjectRepository(BranchNetwork)
    private readonly branchNetworkRepository: Repository<BranchNetwork>,
    @InjectRepository(BranchDepartment)
    private readonly branchDepartmentRepository: Repository<BranchDepartment>,
    @InjectRepository(OfficeType)
    private readonly officeTypeRepository: Repository<OfficeType>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Notice)
    private readonly noticeRepository: Repository<Notice>,
    @InjectRepository(OfficeLocation)
    private readonly officeLocationRepository: Repository<OfficeLocation>,
    @InjectRepository(PayrollRun)
    private readonly payrollRunRepository: Repository<PayrollRun>,
  ) {}

  async createBranch(createBranchDto: CreateBranchDto) {
    const { companyId, officeTypeId, ...branchPayload } = createBranchDto;
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    const officeType = officeTypeId
      ? await this.findActiveOfficeType(officeTypeId)
      : undefined;

    if (officeTypeId && officeType) {
      if (officeType.company && officeType.company.id !== company.id) {
        throw new BadRequestException(
          "Office type does not belong to the specified company",
        );
      }
    }

    const branch = this.branchRepository.create({
      ...branchPayload,
      company,
      officeType,
      branchType: officeType?.code ?? branchPayload.branchType,
    });

    return this.branchRepository.save(branch);
  }

  listBranches() {
    return this.branchRepository.find({
      where: { isDeleted: false },
      relations: {
        locations: true,
        networks: true,
        branchDepartments: true,
      },
      order: { name: "ASC" },
    });
  }

  async findBranch(id: string) {
    const branch = await this.branchRepository.findOne({
      where: { id, isDeleted: false },
      relations: {
        locations: true,
        networks: true,
        branchDepartments: true,
      },
    });

    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    return branch;
  }

  async updateBranch(id: string, updateBranchDto: UpdateBranchDto) {
    const branch = await this.branchRepository.findOne({
      where: { id, isDeleted: false },
      relations: { company: true },
    });

    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    const { companyId, officeTypeId, ...branchPayload } = updateBranchDto;

    if (companyId) {
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
      });

      if (!company) {
        throw new NotFoundException("Company not found");
      }

      branch.company = company;
    }

    if (officeTypeId) {
      const officeType = await this.findActiveOfficeType(officeTypeId);
      branch.officeType = officeType;
      branch.branchType = officeType.code;
    }

    Object.assign(branch, branchPayload);
    return this.branchRepository.save(branch);
  }

  listOfficeTypes() {
    return this.officeTypeRepository.find({
      where: { isDeleted: false },
      order: { isDefault: "DESC", name: "ASC" },
    });
  }

  async findOfficeType(id: string) {
    const officeType = await this.officeTypeRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!officeType) {
      throw new NotFoundException("Office type not found");
    }

    return officeType;
  }

  async createOfficeType(createOfficeTypeDto: CreateOfficeTypeDto) {
    const { companyId, ...officeTypePayload } = createOfficeTypeDto;
    const company = companyId
      ? await this.findActiveCompany(companyId)
      : undefined;
    const officeType = this.officeTypeRepository.create({
      ...officeTypePayload,
      code: officeTypePayload.code.trim().toLowerCase(),
      company,
    });

    return this.officeTypeRepository.save(officeType);
  }

  async updateOfficeType(id: string, updateOfficeTypeDto: UpdateOfficeTypeDto) {
    const officeType = await this.findOfficeType(id);
    const { companyId, ...officeTypePayload } = updateOfficeTypeDto;

    if (companyId) {
      officeType.company = await this.findActiveCompany(companyId);
    }

    Object.assign(officeType, {
      ...officeTypePayload,
      // if pass companyId as null or empty string, it will be removed in company
      company:
        companyId === null || companyId === "" ? null : officeType.company,
      code: officeTypePayload.code
        ? officeTypePayload.code.trim().toLowerCase()
        : officeType.code,
    });

    return this.officeTypeRepository.save(officeType);
  }

  async removeOfficeType(id: string) {
    const officeType = await this.findOfficeType(id);
    const branchesCount = await this.branchRepository.count({
      where: { officeType: { id: officeType.id }, isDeleted: false },
    });

    if (branchesCount > 0) {
      throw new BadRequestException(
        `Office type cannot be deleted because it is used by ${branchesCount} branch${branchesCount !== 1 ? "es" : ""}. Reassign branches first.`,
      );
    }

    await this.officeTypeRepository.update(officeType.id, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    return {
      message: "Office type deleted successfully",
    };
  }

  private async findActiveOfficeType(identifier: string) {
    const officeType = await this.officeTypeRepository.findOne({
      where: [
        { id: identifier, isDeleted: false },
        { code: identifier, isDeleted: false },
      ],
    });

    if (!officeType) {
      throw new NotFoundException("Office type not found");
    }

    return officeType;
  }

  private async findActiveCompany(id: string) {
    const company = await this.companyRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    return company;
  }

  async removeBranch(id: string) {
    const branch = await this.findBranch(id);
    await this.assertBranchCanBeDeleted(branch.id);
    await this.branchRepository.update(branch.id, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    return {
      message: "Branch deleted successfully",
    };
  }

  remove(id: string) {
    return this.removeBranch(id);
  }

  private async assertBranchCanBeDeleted(branchId: string) {
    const [
      employeesCount,
      locationsCount,
      networksCount,
      branchDepartmentsCount,
      officeLocationsCount,
      payrollRunsCount,
      noticesCount,
    ] = await Promise.all([
      this.employeeRepository.count({
        where: { branch: { id: branchId, isDeleted: false } },
      }),
      this.branchLocationRepository.count({
        where: { branch: { id: branchId, isDeleted: false } },
      }),
      this.branchNetworkRepository.count({
        where: { branch: { id: branchId, isDeleted: false } },
      }),
      this.branchDepartmentRepository.count({
        where: { branch: { id: branchId, isDeleted: false } },
      }),
      this.officeLocationRepository.count({
        where: { branch: { id: branchId, isDeleted: false } },
      }),
      this.payrollRunRepository.count({
        where: { branch: { id: branchId, isDeleted: false } },
      }),
      this.noticeRepository.count({ where: { branchId } }),
    ]);

    const blockers = [
      employeesCount
        ? `${employeesCount} employee${employeesCount !== 1 ? "s" : ""}`
        : null,
      locationsCount
        ? `${locationsCount} branch location${locationsCount !== 1 ? "s" : ""}`
        : null,
      networksCount
        ? `${networksCount} branch network/IP record${networksCount !== 1 ? "s" : ""}`
        : null,
      branchDepartmentsCount
        ? `${branchDepartmentsCount} branch department assignment${branchDepartmentsCount !== 1 ? "s" : ""}`
        : null,
      officeLocationsCount
        ? `${officeLocationsCount} office location${officeLocationsCount !== 1 ? "s" : ""}`
        : null,
      payrollRunsCount
        ? `${payrollRunsCount} payroll run${payrollRunsCount !== 1 ? "s" : ""}`
        : null,
      noticesCount
        ? `${noticesCount} notice${noticesCount !== 1 ? "s" : ""}`
        : null,
    ].filter(Boolean);

    if (blockers.length > 0) {
      throw new BadRequestException(
        `Branch cannot be deleted because it is used by ${blockers.join(
          ", ",
        )}. Delete or reassign related data first.`,
      );
    }
  }

  async listLocations(branchId: string) {
    const branch = await this.findBranch(branchId);

    return this.branchLocationRepository.find({
      where: { branch: { id: branch.id, isDeleted: false } },
      order: { isPrimary: "DESC", locationLabel: "ASC" },
    });
  }

  async createLocation(
    branchId: string,
    createBranchLocationDto: CreateBranchLocationDto,
  ) {
    const branch = await this.findBranch(branchId);
    const location = this.branchLocationRepository.create({
      ...createBranchLocationDto,
      branch,
    });

    return this.branchLocationRepository.save(location);
  }

  async updateLocation(
    branchId: string,
    locationId: string,
    updateBranchLocationDto: UpdateBranchLocationDto,
  ) {
    await this.findBranch(branchId);
    const location = await this.branchLocationRepository.findOne({
      where: { id: locationId, branch: { id: branchId, isDeleted: false } },
    });

    if (!location) {
      throw new NotFoundException("Branch location not found");
    }

    Object.assign(location, updateBranchLocationDto);
    return this.branchLocationRepository.save(location);
  }

  async removeLocation(branchId: string, locationId: string) {
    await this.findBranch(branchId);
    const location = await this.branchLocationRepository.findOne({
      where: { id: locationId, branch: { id: branchId, isDeleted: false } },
    });

    if (!location) {
      throw new NotFoundException("Branch location not found");
    }

    await this.branchLocationRepository.update(location.id, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    return {
      message: "Branch location deleted successfully",
    };
  }

  async listNetworks(branchId: string) {
    const branch = await this.findBranch(branchId);

    return this.branchNetworkRepository.find({
      where: { branch: { id: branch.id, isDeleted: false } },
      order: { networkType: "ASC", label: "ASC" },
    });
  }

  async createNetwork(
    branchId: string,
    createBranchNetworkDto: CreateBranchNetworkDto,
  ) {
    const branch = await this.findBranch(branchId);
    const network = this.branchNetworkRepository.create({
      ...createBranchNetworkDto,
      branch,
    });

    return this.branchNetworkRepository.save(network);
  }

  async updateNetwork(
    branchId: string,
    networkId: string,
    updateBranchNetworkDto: UpdateBranchNetworkDto,
  ) {
    await this.findBranch(branchId);
    const network = await this.branchNetworkRepository.findOne({
      where: { id: networkId, branch: { id: branchId, isDeleted: false } },
    });

    if (!network) {
      throw new NotFoundException("Branch network not found");
    }

    Object.assign(network, updateBranchNetworkDto);
    return this.branchNetworkRepository.save(network);
  }

  async removeNetwork(branchId: string, networkId: string) {
    await this.findBranch(branchId);
    const network = await this.branchNetworkRepository.findOne({
      where: { id: networkId, branch: { id: branchId, isDeleted: false } },
    });

    if (!network) {
      throw new NotFoundException("Branch network not found");
    }

    await this.branchNetworkRepository.update(network.id, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    return {
      message: "Branch network deleted successfully",
    };
  }

  async listDepartments(branchId: string) {
    const branch = await this.findBranch(branchId);

    return this.branchDepartmentRepository.find({
      where: { branch: { id: branch.id, isDeleted: false } },
      order: { localName: "ASC", createdAt: "ASC" },
    });
  }

  async assignDepartment(
    branchId: string,
    assignBranchDepartmentDto: AssignBranchDepartmentDto,
  ) {
    const branch = await this.findBranch(branchId);

    const department = await this.departmentRepository.findOne({
      where: { id: assignBranchDepartmentDto.departmentId, isDeleted: false },
    });

    if (!department) {
      throw new NotFoundException("Department not found");
    }

    const existingAssignment = await this.branchDepartmentRepository.findOne({
      where: {
        branch: { id: branch.id },
        department: { id: department.id },
      },
    });
    const assignment = existingAssignment ?? new BranchDepartment();

    Object.assign(assignment, {
      branch,
      department,
      localName: assignBranchDepartmentDto.localName,
      floorNo: assignBranchDepartmentDto.floorNo,
      roomNo: assignBranchDepartmentDto.roomNo,
      status: assignBranchDepartmentDto.status ?? assignment.status,
    });

    return this.branchDepartmentRepository.save(assignment);
  }

  async removeDepartmentAssignment(branchId: string, assignmentId: string) {
    await this.findBranch(branchId);
    const assignment = await this.branchDepartmentRepository.findOne({
      where: { id: assignmentId, branch: { id: branchId, isDeleted: false } },
    });

    if (!assignment) {
      throw new NotFoundException("Branch department assignment not found");
    }

    const employeesCount = await this.employeeRepository.count({
      where: {
        branch: { id: branchId, isDeleted: false },
        department: { id: assignment.department.id, isDeleted: false },
      },
    });

    if (employeesCount > 0) {
      throw new BadRequestException(
        `Branch department assignment cannot be deleted because it is used by ${employeesCount} employee${employeesCount !== 1 ? "s" : ""}. Reassign employees first.`,
      );
    }

    await this.branchDepartmentRepository.update(assignment.id, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    return {
      message: "Branch department assignment deleted successfully",
    };
  }
}
