import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchDepartment } from '../branches/entities/branch-department.entity';
import { Company } from '../companies/entities/company.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Holiday } from '../holidays/entities/holiday.entity';
import { Notice } from '../notices/entities/notice.entity';
import { PayrollRun } from '../payroll/entities/payroll-run.entity';
import { Department } from './entities/department.entity';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Department,
      Company,
      BranchDepartment,
      Employee,
      Holiday,
      Notice,
      PayrollRun,
    ]),
  ],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
