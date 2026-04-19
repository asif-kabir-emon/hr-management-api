import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepartmentsService } from '../departments/departments.service';
import { EmployeesService } from '../employees/employees.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { Holiday, HolidayScopeType } from './entities/holiday.entity';

@Injectable()
export class HolidaysService {
  constructor(
    @InjectRepository(Holiday)
    private readonly holidayRepository: Repository<Holiday>,
    private readonly departmentsService: DepartmentsService,
    private readonly employeesService: EmployeesService,
  ) {}

  async create(createHolidayDto: CreateHolidayDto) {
    const holiday = await this.buildHolidayEntity(createHolidayDto);
    return this.holidayRepository.save(holiday);
  }

  findAll() {
    return this.holidayRepository.find({
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const holiday = await this.holidayRepository.findOne({ where: { id } });

    if (!holiday) {
      throw new NotFoundException('Holiday not found');
    }

    return holiday;
  }

  async update(id: string, updateHolidayDto: UpdateHolidayDto) {
    const holiday = await this.findOne(id);
    const updatedHoliday = await this.buildHolidayEntity(updateHolidayDto, holiday);
    return this.holidayRepository.save(updatedHoliday);
  }

  async remove(id: string) {
    const holiday = await this.findOne(id);
    await this.holidayRepository.remove(holiday);

    return {
      message: 'Holiday deleted successfully',
    };
  }

  private async buildHolidayEntity(
    holidayDto: Partial<CreateHolidayDto>,
    existingHoliday?: Holiday,
  ) {
    const scopeType = holidayDto.scopeType ?? existingHoliday?.scopeType;

    if (!scopeType) {
      throw new BadRequestException('scopeType is required');
    }

    const holiday = existingHoliday ?? this.holidayRepository.create();
    holiday.name = holidayDto.name ?? holiday.name;
    holiday.date = holidayDto.date ?? holiday.date;
    holiday.type = holidayDto.type ?? holiday.type;
    holiday.scopeType = scopeType;
    holiday.stateCode = holidayDto.stateCode ?? holiday.stateCode;
    holiday.isOptional = holidayDto.isOptional ?? holiday.isOptional ?? false;
    holiday.isPaid = holidayDto.isPaid ?? holiday.isPaid ?? true;
    holiday.isActive = holidayDto.isActive ?? holiday.isActive ?? true;
    holiday.description = holidayDto.description ?? holiday.description;

    if (scopeType === HolidayScopeType.Department) {
      if (!holidayDto.departmentId && !existingHoliday?.department?.id) {
        throw new BadRequestException(
          'departmentId is required for department-scoped holidays',
        );
      }

      holiday.department = await this.departmentsService.findOne(
        holidayDto.departmentId ?? existingHoliday!.department!.id,
      );
      holiday.employee = undefined;
      holiday.stateCode = undefined;
    } else if (scopeType === HolidayScopeType.Employee) {
      if (!holidayDto.employeeId && !existingHoliday?.employee?.id) {
        throw new BadRequestException(
          'employeeId is required for employee-scoped holidays',
        );
      }

      holiday.employee = await this.employeesService.findOne(
        holidayDto.employeeId ?? existingHoliday!.employee!.id,
      );
      holiday.department = undefined;
      holiday.stateCode = undefined;
    } else if (scopeType === HolidayScopeType.State) {
      if (!holiday.stateCode) {
        throw new BadRequestException(
          'stateCode is required for state-scoped holidays',
        );
      }

      holiday.department = undefined;
      holiday.employee = undefined;
    } else {
      holiday.department = undefined;
      holiday.employee = undefined;
      holiday.stateCode = undefined;
    }

    return holiday;
  }
}
