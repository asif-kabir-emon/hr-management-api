import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditModel: Model<AuditLogDocument>,
  ) {}

  create(createAuditLogDto: CreateAuditLogDto) {
    return this.auditModel.create(createAuditLogDto);
  }

  findLatest(limit = 50) {
    return this.auditModel.find().sort({ createdAt: -1 }).limit(limit).lean();
  }
}
