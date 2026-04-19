import { PartialType } from '@nestjs/swagger';
import { CreateBranchLocationDto } from './create-branch-location.dto';

export class UpdateBranchLocationDto extends PartialType(
  CreateBranchLocationDto,
) {}
