import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfficeLocation } from './entities/office-location.entity';
import { OfficeLocationsController } from './office-locations.controller';
import { OfficeLocationsService } from './office-locations.service';

@Module({
  imports: [TypeOrmModule.forFeature([OfficeLocation])],
  controllers: [OfficeLocationsController],
  providers: [OfficeLocationsService],
  exports: [OfficeLocationsService],
})
export class OfficeLocationsModule {}
