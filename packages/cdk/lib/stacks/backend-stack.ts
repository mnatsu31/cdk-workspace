import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { Config } from '../config';
import { ApplicationConstruct } from '../constructs/application';
import { BaseStack } from './base-stack';
import { CommonStack } from './common-stack';
import { StorageStack } from './storage-stack';

type BackendStackProps = cdk.StackProps & {
  config: Config;
  commonStack: CommonStack;
  baseStack: BaseStack;
  storageStack: StorageStack;
};

export class BackendStack extends cdk.Stack {
  public readonly application: ApplicationConstruct;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    const databaseSecrets = props.storageStack.database.cluster.secret;
    if (!databaseSecrets) {
      throw 'Error: Database secrets not defined.';
    }

    const secrets = secretsmanager.Secret.fromSecretNameV2(
      this,
      'Secrets',
      props.config.stageConfig.secretsName,
    );

    const backendConfig = props.config.stageConfig.services.backend;
    this.application = new ApplicationConstruct(this, 'Backend', {
      vpc: props.baseStack.network.vpc,
      cluster: props.baseStack.cluster,
      imageRepository: props.commonStack.repositories['backend'],
      imageTag: props.config.version,
      cpu: backendConfig.cpu,
      memoryLimitMiB: backendConfig.memoryLimitMiB,
      port: backendConfig.port,
      healthCheckPath: '/',
      desireCount: backendConfig.desireCount,
      minCapacity: backendConfig.minCapacity,
      maxCapacity: backendConfig.maxCapacity,
      scaleOnCpuTargetUtilizationPercent: backendConfig.scaleOnCpuTargetUtilizationPercent,
      scaleOnMemoryTargetUtilizationPercent: backendConfig.scaleOnMemoryTargetUtilizationPercent,
      logGroupName: `${props.config.project}-${props.config.stage}-backend`,
      defaultRetentionDays: backendConfig.defaultRetentionDays,
      environments: {
        ...backendConfig.environments,
        PORT: String(backendConfig.port),
        APP_NAME: props.config.project,
        AWS_S3_BUCKET: `${props.storageStack.bucket.bucketName}/assets`,
        AWS_S3_REGION: props.storageStack.bucket.env.region,
        QUEUE_HOST: props.storageStack.elasticache.cluster.attrConfigurationEndPointAddress,
        QUEUE_PORT: props.storageStack.elasticache.cluster.attrConfigurationEndPointPort,
      },
      secrets: {
        DB_HOST: ecs.Secret.fromSecretsManager(databaseSecrets, 'host'),
        DB_PORT: ecs.Secret.fromSecretsManager(databaseSecrets, 'port'),
        DB_USERNAME: ecs.Secret.fromSecretsManager(databaseSecrets, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(databaseSecrets, 'password'),
        DB_DATABASE: ecs.Secret.fromSecretsManager(databaseSecrets, 'dbname'),
        ...backendConfig.secrets.reduce<Record<string, ecs.Secret>>((obj, key) => {
          obj[key] = ecs.Secret.fromSecretsManager(secrets, key);
          return obj;
        }, {}),
      },
      customHeader: props.config.stageConfig.security.customHeader,
    });

    props.storageStack.bucket.grantReadWrite(this.application.fargate.taskDefinition.taskRole);
  }
}
