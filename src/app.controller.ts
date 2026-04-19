import { Controller, Get, Version } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AppService } from "./app.service";

@ApiTags("health")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("health")
  @Version("1")
  getHealth() {
    return this.appService.getHealth();
  }
}
