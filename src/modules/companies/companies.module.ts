import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { Department } from '../departments/entities/department.entity';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { Company } from './entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company, Branch, Department])],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
