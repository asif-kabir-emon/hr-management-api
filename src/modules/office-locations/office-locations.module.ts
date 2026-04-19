import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance.entity';
import { Branch } from '../branches/entities/branch.entity';
import { BranchNetwork } from '../branches/entities/branch-network.entity';
import { OfficeLocation } from './entities/office-location.entity';
import { OfficeLocationsController } from './office-locations.controller';
import { OfficeLocationsService } from './office-locations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OfficeLocation,
      Branch,
      BranchNetwork,
      AttendanceRecord,
    ]),
  ],
  controllers: [OfficeLocationsController],
  providers: [OfficeLocationsService],
  exports: [OfficeLocationsService],
})
export class OfficeLocationsModule {}
