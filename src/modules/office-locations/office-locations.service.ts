import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceLocationDto } from '../attendance/dto/attendance-location.dto';
import { AttendanceRecord } from '../attendance/entities/attendance.entity';
import { Branch } from '../branches/entities/branch.entity';
import { BranchNetwork } from '../branches/entities/branch-network.entity';
import { CreateOfficeLocationDto } from './dto/create-office-location.dto';
import { UpdateOfficeLocationDto } from './dto/update-office-location.dto';
import { OfficeLocation } from './entities/office-location.entity';

interface OfficeLocationMatch {
  officeLocation: OfficeLocation;
  distanceMeters: number;
  isInside: boolean;
  matchedBy: 'ip' | 'location';
}

@Injectable()
export class OfficeLocationsService {
  constructor(
    @InjectRepository(OfficeLocation)
    private readonly officeLocationRepository: Repository<OfficeLocation>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(BranchNetwork)
    private readonly branchNetworkRepository: Repository<BranchNetwork>,
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRecordRepository: Repository<AttendanceRecord>,
  ) {}

  async create(createOfficeLocationDto: CreateOfficeLocationDto) {
    const { branchId, ...officeLocationPayload } = createOfficeLocationDto;
    const branch = branchId ? await this.findBranch(branchId) : undefined;
    const officeLocation = this.officeLocationRepository.create({
      ...officeLocationPayload,
      branch,
      trustedIps: createOfficeLocationDto.trustedIps ?? [],
    });

    return this.officeLocationRepository.save(officeLocation);
  }

  findAll() {
    return this.officeLocationRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const officeLocation = await this.officeLocationRepository.findOne({
      where: { id },
    });

    if (!officeLocation) {
      throw new NotFoundException('Office location not found');
    }

    return officeLocation;
  }

  async update(id: string, updateOfficeLocationDto: UpdateOfficeLocationDto) {
    const officeLocation = await this.findOne(id);
    const { branchId, ...officeLocationPayload } = updateOfficeLocationDto;

    if (branchId) {
      officeLocation.branch = await this.findBranch(branchId);
    }

    Object.assign(officeLocation, {
      ...officeLocationPayload,
      trustedIps: updateOfficeLocationDto.trustedIps ?? officeLocation.trustedIps,
    });

    return this.officeLocationRepository.save(officeLocation);
  }

  async remove(id: string) {
    const officeLocation = await this.findOne(id);
    await this.assertOfficeLocationCanBeDeleted(officeLocation.id);
    await this.officeLocationRepository.softRemove(officeLocation);

    return {
      message: 'Office location deleted successfully',
    };
  }

  private async assertOfficeLocationCanBeDeleted(officeLocationId: string) {
    const attendanceRecordsCount = await this.attendanceRecordRepository
      .createQueryBuilder('attendance')
      .where('attendance.checkInOfficeLocationId = :officeLocationId', {
        officeLocationId,
      })
      .orWhere('attendance.checkOutOfficeLocationId = :officeLocationId', {
        officeLocationId,
      })
      .getCount();

    if (attendanceRecordsCount > 0) {
      throw new BadRequestException(
        `Office location cannot be deleted because it is used by ${attendanceRecordsCount} attendance record(s). Keep it inactive instead.`,
      );
    }
  }

  async findMatchingOffice(
    location?: AttendanceLocationDto,
    ip?: string,
  ): Promise<OfficeLocationMatch | null> {
    const officeLocations = await this.officeLocationRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    if (officeLocations.length === 0) {
      return null;
    }

    const normalizedIp = ip?.trim();

    if (normalizedIp) {
      const ipMatchedOfficeLocation = officeLocations.find((officeLocation) =>
        (officeLocation.trustedIps ?? [])
          .filter(Boolean)
          .includes(normalizedIp),
      );

      if (ipMatchedOfficeLocation) {
        return {
          officeLocation: ipMatchedOfficeLocation,
          distanceMeters: 0,
          isInside: true,
          matchedBy: 'ip',
        };
      }

      const branchNetwork = await this.findMatchingBranchNetwork(normalizedIp);
      const branchOfficeLocation = branchNetwork?.branch
        ? officeLocations.find(
            (officeLocation) =>
              officeLocation.branch?.id === branchNetwork.branch.id,
          )
        : undefined;

      if (branchOfficeLocation) {
        return {
          officeLocation: branchOfficeLocation,
          distanceMeters: 0,
          isInside: true,
          matchedBy: 'ip',
        };
      }
    }

    if (!location) {
      return null;
    }

    let nearestMatch: OfficeLocationMatch | null = null;

    for (const officeLocation of officeLocations) {
      const distanceMeters = this.calculateDistanceInMeters(
        location.latitude,
        location.longitude,
        Number(officeLocation.latitude),
        Number(officeLocation.longitude),
      );
      const isInside = distanceMeters <= officeLocation.allowedRadiusMeters;

      if (!nearestMatch || distanceMeters < nearestMatch.distanceMeters) {
        nearestMatch = {
          officeLocation,
          distanceMeters,
          isInside,
          matchedBy: 'location',
        };
      }
    }

    return nearestMatch;
  }

  private async findBranch(branchId: string) {
    const branch = await this.branchRepository.findOne({ where: { id: branchId } });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  private async findMatchingBranchNetwork(ip: string) {
    const branchNetworks = await this.branchNetworkRepository.find({
      where: { isActive: true },
      relations: { branch: true },
    });

    return branchNetworks.find((network) => {
      if (network.ipAddress?.trim() === ip) {
        return true;
      }

      return network.cidr ? this.isIpv4InsideCidr(ip, network.cidr) : false;
    });
  }

  private isIpv4InsideCidr(ip: string, cidr: string) {
    const [rangeIp, prefixLengthText] = cidr.split('/');
    const prefixLength = Number(prefixLengthText);

    if (!rangeIp || !Number.isInteger(prefixLength)) {
      return false;
    }

    const ipNumber = this.ipv4ToNumber(ip);
    const rangeNumber = this.ipv4ToNumber(rangeIp);

    if (ipNumber === null || rangeNumber === null || prefixLength < 0) {
      return false;
    }

    if (prefixLength > 32) {
      return false;
    }

    const mask = prefixLength === 0 ? 0 : 0xffffffff << (32 - prefixLength);

    return (ipNumber & mask) === (rangeNumber & mask);
  }

  private ipv4ToNumber(ip: string) {
    const parts = ip.split('.').map(Number);

    if (
      parts.length !== 4 ||
      parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
    ) {
      return null;
    }

    return (
      ((parts[0] << 24) |
        (parts[1] << 16) |
        (parts[2] << 8) |
        parts[3]) >>>
      0
    );
  }

  private calculateDistanceInMeters(
    startLatitude: number,
    startLongitude: number,
    endLatitude: number,
    endLongitude: number,
  ) {
    const earthRadiusInMeters = 6371000;
    const latitudeDelta = this.toRadians(endLatitude - startLatitude);
    const longitudeDelta = this.toRadians(endLongitude - startLongitude);
    const normalizedStartLatitude = this.toRadians(startLatitude);
    const normalizedEndLatitude = this.toRadians(endLatitude);

    const haversine =
      Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
      Math.cos(normalizedStartLatitude) *
        Math.cos(normalizedEndLatitude) *
        Math.sin(longitudeDelta / 2) *
        Math.sin(longitudeDelta / 2);

    const angularDistance =
      2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    return Math.round(earthRadiusInMeters * angularDistance);
  }

  private toRadians(value: number) {
    return (value * Math.PI) / 180;
  }
}
