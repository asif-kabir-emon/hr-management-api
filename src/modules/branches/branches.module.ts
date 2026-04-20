import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/entities/company.entity';
import { Department } from '../departments/entities/department.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Notice } from '../notices/entities/notice.entity';
import { OfficeLocation } from '../office-locations/entities/office-location.entity';
import { PayrollRun } from '../payroll/entities/payroll-run.entity';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { BranchDepartment } from './entities/branch-department.entity';
import { Branch } from './entities/branch.entity';
import { BranchLocation } from './entities/branch-location.entity';
import { BranchNetwork } from './entities/branch-network.entity';
import { OfficeType } from './entities/office-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Branch,
      BranchLocation,
      BranchNetwork,
      BranchDepartment,
      OfficeType,
      Company,
      Department,
      Employee,
      Notice,
      OfficeLocation,
      PayrollRun,
    ]),
  ],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
