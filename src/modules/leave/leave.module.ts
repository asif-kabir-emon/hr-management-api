import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from '../employees/employees.module';
import { EmployeeLeaveBalance } from './entities/employee-leave-balance.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { LeaveTypeEntity } from './entities/leave-type.entity';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeaveTypeEntity,
      EmployeeLeaveBalance,
      LeaveRequest,
    ]),
    EmployeesModule,
  ],
  controllers: [LeaveController],
  providers: [LeaveService],
})
export class LeaveModule {}
