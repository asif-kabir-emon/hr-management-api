import { PartialType } from '@nestjs/swagger';
import { CreateBranchNetworkDto } from './create-branch-network.dto';

export class UpdateBranchNetworkDto extends PartialType(
  CreateBranchNetworkDto,
) {}
