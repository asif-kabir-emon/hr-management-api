import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from '../employees/employees.module';
import { Holiday } from '../holidays/entities/holiday.entity';
import { EmployeeDayOverride } from './entities/employee-day-override.entity';
import { EmployeeWorkSchedule } from './entities/employee-work-schedule.entity';
import { OffDayReplacementRequest } from './entities/off-day-replacement-request.entity';
import { WorkSchedule } from './entities/work-schedule.entity';
import { WorkSchedulesController } from './work-schedules.controller';
import { WorkSchedulesService } from './work-schedules.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkSchedule,
      EmployeeWorkSchedule,
      EmployeeDayOverride,
      OffDayReplacementRequest,
      Holiday,
    ]),
    EmployeesModule,
  ],
  controllers: [WorkSchedulesController],
  providers: [WorkSchedulesService],
  exports: [WorkSchedulesService],
})
export class WorkSchedulesModule {}
