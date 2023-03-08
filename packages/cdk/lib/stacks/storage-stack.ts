import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { BaseStack } from './base-stack';
import { AuroraMysqlConstruct } from '../constructs/aurora-mysql';
import { Config } from '../config';
import { ElasticacheConstruct } from '../constructs/elasticache';

type StorageStackProps = cdk.StackProps & {
  readonly config: Config;
  readonly baseStack: BaseStack;
};

export class StorageStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly database: AuroraMysqlConstruct;
  public readonly elasticache: ElasticacheConstruct;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: `sf-${props.config.project}-${props.config.stage}`,
      publicReadAccess: false,
      blockPublicAccess: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
    });

    this.database = new AuroraMysqlConstruct(this, 'AuroraMysql', {
      vpc: props.baseStack.network.vpc,
      databaseName: `${props.config.project}_${props.config.stage}`,
      port: props.config.stageConfig.database.port,
      minCapacity: props.config.stageConfig.database.minCapacity,
      maxCapacity: props.config.stageConfig.database.maxCapacity,
      autoPause: props.config.stageConfig.database.autoPause,
      allowSgs: [props.baseStack.bastion.securityGroup],
    });

    this.elasticache = new ElasticacheConstruct(this, 'Redis', {
      vpc: props.baseStack.network.vpc,
      port: props.config.stageConfig.cache.port,
      clusterName: `${props.config.project}-${props.config.stage}`,
      nodeType: props.config.stageConfig.cache.nodeType,
      numNodeGroups: props.config.stageConfig.cache.numNodeGrpups,
      replicasPerNodeGroup: props.config.stageConfig.cache.replicasPerNodeGroup,
      preferredMaintenanceWindow: props.config.stageConfig.cache.preferredMaintenanceWindow,
      properties: props.config.stageConfig.cache.properties,
      allowSgs: [props.baseStack.bastion.securityGroup],
    });
  }
}
