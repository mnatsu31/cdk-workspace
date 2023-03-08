import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { Config } from '../config';
import { ApplicationConstruct } from '../constructs/application';
import { BaseStack } from './base-stack';
import { CommonStack } from './common-stack';

type FrontendStackProps = cdk.StackProps & {
  config: Config;
  commonStack: CommonStack;
  baseStack: BaseStack;
};

export class FrontendStack extends cdk.Stack {
  public readonly application: ApplicationConstruct;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const secrets = secretsmanager.Secret.fromSecretNameV2(
      this,
      'Secrets',
      props.config.stageConfig.secretsName,
    );

    const frontendConfig = props.config.stageConfig.services.frontend;
    this.application = new ApplicationConstruct(this, 'Frontend', {
      vpc: props.baseStack.network.vpc,
      cluster: props.baseStack.cluster,
      imageRepository: props.commonStack.repositories['frontend'],
      imageTag: props.config.version,
      cpu: frontendConfig.cpu,
      memoryLimitMiB: frontendConfig.memoryLimitMiB,
      port: frontendConfig.port,
      healthCheckPath: '/',
      desireCount: frontendConfig.desireCount,
      minCapacity: frontendConfig.minCapacity,
      maxCapacity: frontendConfig.maxCapacity,
      scaleOnCpuTargetUtilizationPercent: frontendConfig.scaleOnCpuTargetUtilizationPercent,
      scaleOnMemoryTargetUtilizationPercent: frontendConfig.scaleOnMemoryTargetUtilizationPercent,
      logGroupName: `${props.config.project}-${props.config.stage}-frontend`,
      defaultRetentionDays: frontendConfig.defaultRetentionDays,
      environments: {
        ...frontendConfig.environments,
      },
      secrets: {
        ...frontendConfig.secrets.reduce<Record<string, ecs.Secret>>((obj, key) => {
          obj[key] = ecs.Secret.fromSecretsManager(secrets, key);
          return obj;
        }, {}),
      },
      customHeader: props.config.stageConfig.security.customHeader,
    });
  }
}
