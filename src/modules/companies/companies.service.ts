import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Branch } from "../branches/entities/branch.entity";
import { Department } from "../departments/entities/department.entity";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { UpdateCompanyDto } from "./dto/update-company.dto";
import { Company } from "./entities/company.entity";

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  create(createCompanyDto: CreateCompanyDto) {
    const company = this.companyRepository.create(createCompanyDto);
    return this.companyRepository.save(company);
  }

  findAll() {
    return this.companyRepository.find({
      where: { isDeleted: false },
      order: { name: "ASC" },
    });
  }

  async findOne(id: string) {
    const company = await this.companyRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.companyRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    Object.assign(company, updateCompanyDto);
    return this.companyRepository.save(company);
  }

  async remove(id: string) {
    const company = await this.findOne(id);
    await this.assertCompanyCanBeDeleted(company.id);

    // Soft delete the company and let isDeleted flag and deletedAt timestamp indicate deletion
    await this.companyRepository.update(company.id, {
      isDeleted: true,
      deletedAt: new Date(),
    });

    return {
      message: "Company deleted successfully",
    };
  }

  private async assertCompanyCanBeDeleted(companyId: string) {
    const [branchesCount, departmentsCount] = await Promise.all([
      this.branchRepository.count({
        where: { company: { id: companyId, isDeleted: false } },
      }),
      this.departmentRepository.count({
        where: { company: { id: companyId, isDeleted: false } },
      }),
    ]);

    const blockers = [
      branchesCount
        ? `${branchesCount} branch${branchesCount > 1 ? "es" : ""}`
        : null,
      departmentsCount
        ? `${departmentsCount} department${departmentsCount > 1 ? "s" : ""}`
        : null,
    ].filter(Boolean);

    if (blockers.length > 0) {
      throw new BadRequestException(
        `Company cannot be deleted because it is used by ${blockers.join(
          ", ",
        )}. Delete or reassign related data first.`,
      );
    }
  }
}
