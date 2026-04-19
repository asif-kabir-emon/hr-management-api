import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { BranchesModule } from './modules/branches/branches.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { HolidaysModule } from './modules/holidays/holidays.module';
import { LeaveModule } from './modules/leave/leave.module';
import { NoticesModule } from './modules/notices/notices.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OfficeLocationsModule } from './modules/office-locations/office-locations.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { WorkSchedulesModule } from './modules/work-schedules/work-schedules.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.postgres.host'),
        port: configService.get<number>('database.postgres.port'),
        database: configService.get<string>('database.postgres.database'),
        username: configService.get<string>('database.postgres.username'),
        password: configService.get<string>('database.postgres.password'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.mongodb.uri'),
      }),
    }),
    AuthModule,
    BranchesModule,
    DepartmentsModule,
    DashboardModule,
    EmployeesModule,
    HolidaysModule,
    WorkSchedulesModule,
    NoticesModule,
    NotificationsModule,
    OfficeLocationsModule,
    WorkflowsModule,
    PayrollModule,
    AttendanceModule,
    LeaveModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
