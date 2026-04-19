import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance.entity';
import { DepartmentsModule } from '../departments/departments.module';
import { EmployeesModule } from '../employees/employees.module';
import { Holiday } from './entities/holiday.entity';
import { HolidaysController } from './holidays.controller';
import { HolidaysService } from './holidays.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Holiday, AttendanceRecord]),
    DepartmentsModule,
    EmployeesModule,
  ],
  controllers: [HolidaysController],
  providers: [HolidaysService],
  exports: [HolidaysService],
})
export class HolidaysModule {}
