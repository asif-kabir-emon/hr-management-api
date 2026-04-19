import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesModule } from '../branches/branches.module';
import { DepartmentsModule } from '../departments/departments.module';
import { Employee } from '../employees/entities/employee.entity';
import { WorkflowsModule } from '../workflows/workflows.module';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollItem } from './entities/payroll-item.entity';
import { PayrollRun } from './entities/payroll-run.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayrollRun, PayrollItem, Employee]),
    BranchesModule,
    DepartmentsModule,
    WorkflowsModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
