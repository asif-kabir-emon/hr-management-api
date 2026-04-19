import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permissions } from '../../common/constants/permissions';
import { CurrentUser } from '../auth/interfaces/current-user.interface';
import { PayrollRun, PayrollRunStatus } from '../payroll/entities/payroll-run.entity';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';
import { ListWorkflowInstancesDto } from './dto/list-workflow-instances.dto';
import { ReviewWorkflowInstanceDto } from './dto/review-workflow-instance.dto';
import { UpdateWorkflowDefinitionDto } from './dto/update-workflow-definition.dto';
import {
  WorkflowDefinition,
  WorkflowStepDefinition,
} from './entities/workflow-definition.entity';
import {
  WorkflowInstance,
  WorkflowStepAction,
  WorkflowInstanceStatus,
} from './entities/workflow-instance.entity';

export interface StartWorkflowInstanceInput {
  definitionCode: string;
  referenceType: string;
  referenceId: string;
  requestedByUserId: string;
  requestedByEmail: string;
}

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(WorkflowDefinition)
    private readonly workflowDefinitionRepository: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowInstance)
    private readonly workflowInstanceRepository: Repository<WorkflowInstance>,
    @InjectRepository(PayrollRun)
    private readonly payrollRunRepository: Repository<PayrollRun>,
  ) {}

  async createDefinition(createWorkflowDefinitionDto: CreateWorkflowDefinitionDto) {
    const steps = this.normalizeSteps(createWorkflowDefinitionDto.steps);
    const definition = this.workflowDefinitionRepository.create({
      ...createWorkflowDefinitionDto,
      steps,
    });

    return this.workflowDefinitionRepository.save(definition);
  }

  findDefinitions() {
    return this.workflowDefinitionRepository.find({
      order: { module: 'ASC', name: 'ASC' },
    });
  }

  async updateDefinition(
    id: string,
    updateWorkflowDefinitionDto: UpdateWorkflowDefinitionDto,
  ) {
    const definition = await this.workflowDefinitionRepository.findOne({
      where: { id },
    });

    if (!definition) {
      throw new NotFoundException('Workflow definition not found');
    }

    Object.assign(definition, {
      ...updateWorkflowDefinitionDto,
      steps: updateWorkflowDefinitionDto.steps
        ? this.normalizeSteps(updateWorkflowDefinitionDto.steps)
        : definition.steps,
    });

    return this.workflowDefinitionRepository.save(definition);
  }

  findInstances(listWorkflowInstancesDto: ListWorkflowInstancesDto) {
    const query = this.workflowInstanceRepository
      .createQueryBuilder('instance')
      .leftJoinAndSelect('instance.definition', 'definition')
      .orderBy('instance.createdAt', 'DESC');

    if (listWorkflowInstancesDto.referenceType) {
      query.andWhere('instance.referenceType = :referenceType', {
        referenceType: listWorkflowInstancesDto.referenceType,
      });
    }

    if (listWorkflowInstancesDto.referenceId) {
      query.andWhere('instance.referenceId = :referenceId', {
        referenceId: listWorkflowInstancesDto.referenceId,
      });
    }

    if (listWorkflowInstancesDto.status) {
      query.andWhere('instance.status = :status', {
        status: listWorkflowInstancesDto.status,
      });
    }

    return query.getMany();
  }

  async findInstance(id: string) {
    const instance = await this.workflowInstanceRepository.findOne({
      where: { id },
    });

    if (!instance) {
      throw new NotFoundException('Workflow instance not found');
    }

    return instance;
  }

  async startInstance(startWorkflowInstanceInput: StartWorkflowInstanceInput) {
    const definition = await this.workflowDefinitionRepository.findOne({
      where: {
        code: startWorkflowInstanceInput.definitionCode,
        isActive: true,
      },
    });

    if (!definition) {
      throw new NotFoundException('Workflow definition not found');
    }

    const existingPendingInstance = await this.workflowInstanceRepository.findOne({
      where: {
        referenceType: startWorkflowInstanceInput.referenceType,
        referenceId: startWorkflowInstanceInput.referenceId,
        status: WorkflowInstanceStatus.Pending,
      },
    });

    if (existingPendingInstance) {
      throw new BadRequestException(
        'A pending workflow already exists for this reference',
      );
    }

    const firstStep = definition.steps[0];
    const steps: WorkflowStepAction[] = definition.steps.map((step) => ({
      order: step.order,
      name: step.name,
      requiredPermission: step.requiredPermission,
      status: 'pending',
      canSelfApprove: step.canSelfApprove,
    }));

    const instance = this.workflowInstanceRepository.create({
      definition,
      referenceType: startWorkflowInstanceInput.referenceType,
      referenceId: startWorkflowInstanceInput.referenceId,
      requestedByUserId: startWorkflowInstanceInput.requestedByUserId,
      requestedByEmail: startWorkflowInstanceInput.requestedByEmail,
      currentStepOrder: firstStep?.order ?? null,
      status: WorkflowInstanceStatus.Pending,
      steps,
    });

    return this.workflowInstanceRepository.save(instance);
  }

  async reviewInstance(
    id: string,
    reviewWorkflowInstanceDto: ReviewWorkflowInstanceDto,
    currentUser: CurrentUser,
  ) {
    const instance = await this.findInstance(id);

    if (instance.status !== WorkflowInstanceStatus.Pending) {
      throw new BadRequestException('Only pending workflow instances can be reviewed');
    }

    const currentStep = instance.steps.find(
      (step) => step.order === instance.currentStepOrder,
    );

    if (!currentStep) {
      throw new BadRequestException('Workflow current step not found');
    }

    if (!this.hasPermission(currentUser, currentStep.requiredPermission)) {
      throw new ForbiddenException(
        'You do not have permission to review this workflow step',
      );
    }

    if (
      currentStep.canSelfApprove === false
      && instance.requestedByUserId === (currentUser.id ?? currentUser.sub)
    ) {
      throw new ForbiddenException('Self approval is not allowed for this step');
    }

    currentStep.status = reviewWorkflowInstanceDto.action;
    currentStep.comments = reviewWorkflowInstanceDto.comments;
    currentStep.actedAt = new Date().toISOString();
    currentStep.actedByUserId = currentUser.id ?? currentUser.sub;
    currentStep.actedByEmail = currentUser.email;

    if (reviewWorkflowInstanceDto.action === 'rejected') {
      instance.status = WorkflowInstanceStatus.Rejected;
      instance.currentStepOrder = null;
      instance.finalDecisionAt = new Date();
      instance.finalDecisionByUserId = currentUser.id ?? currentUser.sub;
      instance.finalDecisionByEmail = currentUser.email;
      instance.finalComments = reviewWorkflowInstanceDto.comments;
    } else {
      const nextStep = instance.steps
        .filter((step) => step.order > currentStep.order)
        .sort((leftStep, rightStep) => leftStep.order - rightStep.order)[0];

      if (nextStep) {
        instance.currentStepOrder = nextStep.order;
      } else {
        instance.status = WorkflowInstanceStatus.Approved;
        instance.currentStepOrder = null;
        instance.finalDecisionAt = new Date();
        instance.finalDecisionByUserId = currentUser.id ?? currentUser.sub;
        instance.finalDecisionByEmail = currentUser.email;
        instance.finalComments = reviewWorkflowInstanceDto.comments;
      }
    }

    const savedInstance = await this.workflowInstanceRepository.save(instance);
    await this.syncReferenceStatus(savedInstance);

    return savedInstance;
  }

  async ensureDefaultPayrollApprovalDefinition() {
    const existingDefinition = await this.workflowDefinitionRepository.findOne({
      where: { code: 'payroll-approval' },
    });

    if (existingDefinition) {
      return existingDefinition;
    }

    const definition = this.workflowDefinitionRepository.create({
      code: 'payroll-approval',
      name: 'Payroll Approval Workflow',
      module: 'payroll',
      description: 'Default payroll run approval workflow',
      isActive: true,
      steps: [
        {
          order: 1,
          name: 'Payroll approval',
          requiredPermission: Permissions.PayrollApprove,
          canSelfApprove: false,
        },
      ],
    });

    return this.workflowDefinitionRepository.save(definition);
  }

  private async syncReferenceStatus(instance: WorkflowInstance) {
    if (instance.referenceType !== 'payroll_run') {
      return;
    }

    const payrollRun = await this.payrollRunRepository.findOne({
      where: { id: instance.referenceId },
    });

    if (!payrollRun) {
      return;
    }

    if (instance.status === WorkflowInstanceStatus.Pending) {
      payrollRun.status = PayrollRunStatus.PendingApproval;
    }

    if (instance.status === WorkflowInstanceStatus.Approved) {
      payrollRun.status = PayrollRunStatus.Approved;
    }

    if (instance.status === WorkflowInstanceStatus.Rejected) {
      payrollRun.status = PayrollRunStatus.Rejected;
    }

    await this.payrollRunRepository.save(payrollRun);
  }

  private normalizeSteps(steps: WorkflowStepDefinition[]) {
    const normalizedSteps = [...steps].sort(
      (leftStep, rightStep) => leftStep.order - rightStep.order,
    );

    normalizedSteps.forEach((step, index) => {
      if (step.order !== index + 1) {
        throw new BadRequestException(
          'Workflow step order must be sequential starting from 1',
        );
      }
    });

    return normalizedSteps;
  }

  private hasPermission(currentUser: CurrentUser, permission: string) {
    return currentUser.permissions.includes(Permissions.All)
      || currentUser.permissions.includes(permission);
  }
}
