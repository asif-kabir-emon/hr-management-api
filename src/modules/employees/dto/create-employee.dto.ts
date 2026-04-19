import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { EmploymentStatus } from '../entities/employee.entity';
import { EmployeeAddressInformationDto } from './employee-address-information.dto';
import { EmployeeBankInformationDto } from './employee-bank-information.dto';
import { EmployeeJoiningInformationDto } from './employee-joining-information.dto';
import { EmployeePersonalInformationDto } from './employee-personal-information.dto';
import { EmployeeSalaryInformationDto } from './employee-salary-information.dto';

export class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  employeeCode: string;

  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stateCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joinDate?: string;

  @ApiPropertyOptional({ type: EmployeePersonalInformationDto })
  @IsOptional()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => EmployeePersonalInformationDto)
  personalInformation?: EmployeePersonalInformationDto;

  @ApiPropertyOptional({ type: EmployeeBankInformationDto })
  @IsOptional()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => EmployeeBankInformationDto)
  bankInformation?: EmployeeBankInformationDto;

  @ApiPropertyOptional({ type: EmployeeSalaryInformationDto })
  @IsOptional()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => EmployeeSalaryInformationDto)
  salaryInformation?: EmployeeSalaryInformationDto;

  @ApiPropertyOptional({ type: EmployeeAddressInformationDto })
  @IsOptional()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => EmployeeAddressInformationDto)
  addressInformation?: EmployeeAddressInformationDto;

  @ApiPropertyOptional({ type: EmployeeJoiningInformationDto })
  @IsOptional()
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => EmployeeJoiningInformationDto)
  joiningInformation?: EmployeeJoiningInformationDto;

  @ApiPropertyOptional({ enum: EmploymentStatus })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  status?: EmploymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
