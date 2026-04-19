import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { EmployeesModule } from '../employees/employees.module';
import { LeaveRequest } from '../leave/entities/leave-request.entity';
import { OfficeLocationsModule } from '../office-locations/office-locations.module';
import { WorkSchedulesModule } from '../work-schedules/work-schedules.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceRecord } from './entities/attendance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceRecord, Employee, LeaveRequest]),
    EmployeesModule,
    OfficeLocationsModule,
    WorkSchedulesModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
