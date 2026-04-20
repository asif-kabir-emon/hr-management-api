import { PartialType } from "@nestjs/swagger";
import { CreateOfficeTypeDto } from "./create-office-type.dto";

export class UpdateOfficeTypeDto extends PartialType(CreateOfficeTypeDto) {}
