import { IsOptional, IsString } from "class-validator";
import { LoginDto } from "./login.dto";

export class SwaggerLoginDto extends LoginDto {
  @IsString()
  email: string;
  @IsString()
  password: string;
  @IsOptional()
  @IsString()
  returnTo?: string;
}
