import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../common/constants/permissions";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { BranchesService } from "./branches.service";
import { AssignBranchDepartmentDto } from "./dto/assign-branch-department.dto";
import { CreateBranchLocationDto } from "./dto/create-branch-location.dto";
import { CreateBranchNetworkDto } from "./dto/create-branch-network.dto";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchLocationDto } from "./dto/update-branch-location.dto";
import { UpdateBranchNetworkDto } from "./dto/update-branch-network.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

@ApiTags("branches")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({
  path: "branches",
  version: "1",
})
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @RequirePermissions(Permissions.BranchRead)
  findAll() {
    return this.branchesService.findAll();
  }

  @Get(":id")
  @RequirePermissions(Permissions.BranchRead)
  findOne(@Param("id") id: string) {
    return this.branchesService.findBranch(id);
  }

  @Post()
  @RequirePermissions(Permissions.BranchCreate)
  create(@Body() createBranchDto: CreateBranchDto) {
    return this.branchesService.create(createBranchDto);
  }

  @Patch(":id")
  @RequirePermissions(Permissions.BranchUpdate)
  update(@Param("id") id: string, @Body() updateBranchDto: UpdateBranchDto) {
    return this.branchesService.update(id, updateBranchDto);
  }

  @Delete(":id")
  @RequirePermissions(Permissions.BranchDelete)
  remove(@Param("id") id: string) {
    return this.branchesService.remove(id);
  }

  @Get(":id/locations")
  @RequirePermissions(Permissions.BranchRead)
  listLocations(@Param("id") id: string) {
    return this.branchesService.listLocations(id);
  }

  @Post(":id/locations")
  @RequirePermissions(Permissions.BranchCreate)
  createLocation(
    @Param("id") id: string,
    @Body() createBranchLocationDto: CreateBranchLocationDto,
  ) {
    return this.branchesService.createLocation(id, createBranchLocationDto);
  }

  @Patch(":id/locations/:locationId")
  @RequirePermissions(Permissions.BranchUpdate)
  updateLocation(
    @Param("id") id: string,
    @Param("locationId") locationId: string,
    @Body() updateBranchLocationDto: UpdateBranchLocationDto,
  ) {
    return this.branchesService.updateLocation(
      id,
      locationId,
      updateBranchLocationDto,
    );
  }

  @Delete(":id/locations/:locationId")
  @RequirePermissions(Permissions.BranchDelete)
  removeLocation(
    @Param("id") id: string,
    @Param("locationId") locationId: string,
  ) {
    return this.branchesService.removeLocation(id, locationId);
  }

  @Get(":id/networks")
  @RequirePermissions(Permissions.BranchRead)
  listNetworks(@Param("id") id: string) {
    return this.branchesService.listNetworks(id);
  }

  @Post(":id/networks")
  @RequirePermissions(Permissions.BranchCreate)
  createNetwork(
    @Param("id") id: string,
    @Body() createBranchNetworkDto: CreateBranchNetworkDto,
  ) {
    return this.branchesService.createNetwork(id, createBranchNetworkDto);
  }

  @Patch(":id/networks/:networkId")
  @RequirePermissions(Permissions.BranchUpdate)
  updateNetwork(
    @Param("id") id: string,
    @Param("networkId") networkId: string,
    @Body() updateBranchNetworkDto: UpdateBranchNetworkDto,
  ) {
    return this.branchesService.updateNetwork(
      id,
      networkId,
      updateBranchNetworkDto,
    );
  }

  @Delete(":id/networks/:networkId")
  @RequirePermissions(Permissions.BranchDelete)
  removeNetwork(
    @Param("id") id: string,
    @Param("networkId") networkId: string,
  ) {
    return this.branchesService.removeNetwork(id, networkId);
  }

  @Get(":id/departments")
  @RequirePermissions(Permissions.BranchRead)
  listDepartments(@Param("id") id: string) {
    return this.branchesService.listDepartments(id);
  }

  @Post(":id/departments")
  @RequirePermissions(Permissions.BranchUpdate)
  assignDepartment(
    @Param("id") id: string,
    @Body() assignBranchDepartmentDto: AssignBranchDepartmentDto,
  ) {
    return this.branchesService.assignDepartment(id, assignBranchDepartmentDto);
  }

  @Delete(":id/departments/:assignmentId")
  @RequirePermissions(Permissions.BranchDelete)
  removeDepartmentAssignment(
    @Param("id") id: string,
    @Param("assignmentId") assignmentId: string,
  ) {
    return this.branchesService.removeDepartmentAssignment(id, assignmentId);
  }
}
