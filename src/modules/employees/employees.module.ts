import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesModule } from '../branches/branches.module';
import { EmployeeBranchHistory } from './entities/employee-branch-history.entity';
import { DepartmentsModule } from '../departments/departments.module';
import { EmployeeDepartmentHistory } from './entities/employee-department-history.entity';
import { EmployeeEmploymentHistory } from './entities/employee-employment-history.entity';
import { Employee } from './entities/employee.entity';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      EmployeeBranchHistory,
      EmployeeDepartmentHistory,
      EmployeeEmploymentHistory,
    ]),
    BranchesModule,
    DepartmentsModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
