import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceLocationDto } from '../attendance/dto/attendance-location.dto';
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
  ) {}

  create(createOfficeLocationDto: CreateOfficeLocationDto) {
    const officeLocation = this.officeLocationRepository.create({
      ...createOfficeLocationDto,
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
    Object.assign(officeLocation, {
      ...updateOfficeLocationDto,
      trustedIps: updateOfficeLocationDto.trustedIps ?? officeLocation.trustedIps,
    });
    return this.officeLocationRepository.save(officeLocation);
  }

  async remove(id: string) {
    const officeLocation = await this.findOne(id);
    await this.officeLocationRepository.remove(officeLocation);

    return {
      message: 'Office location deleted successfully',
    };
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
        (officeLocation.trustedIps ?? []).includes(normalizedIp),
      );

      if (ipMatchedOfficeLocation) {
        return {
          officeLocation: ipMatchedOfficeLocation,
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
