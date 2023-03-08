import * as cdk from 'aws-cdk-lib';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

type ApplicationConstructProps = {
  readonly vpc: ec2.Vpc;
  readonly cluster: ecs.Cluster;
  readonly imageRepository: ecr.IRepository;
  readonly imageTag: string;
  readonly cpu: number;
  readonly memoryLimitMiB: number;
  readonly port: number;
  readonly healthCheckPath: string;
  readonly desireCount: number;
  readonly minCapacity: number;
  readonly maxCapacity: number;
  readonly scaleOnCpuTargetUtilizationPercent: number;
  readonly scaleOnMemoryTargetUtilizationPercent: number;
  readonly logGroupName: string;
  readonly defaultRetentionDays: number;
  readonly environments: { [key: string]: string };
  readonly secrets: { [key: string]: ecs.Secret };
  readonly customHeader: { key: string; value: string };
};

export class ApplicationConstruct extends Construct {
  public readonly fargate: ecsPatterns.ApplicationLoadBalancedFargateService;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: ApplicationConstructProps) {
    super(scope, id);

    const sg = new ec2.SecurityGroup(this, 'Sg', {
      vpc: props.vpc,
    });

    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/ecs/${props.logGroupName}`,
      retention: props.defaultRetentionDays,
    });

    this.fargate = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster: props.cluster,
      cpu: props.cpu,
      memoryLimitMiB: props.memoryLimitMiB,
      desiredCount: props.desireCount,
      circuitBreaker: {
        rollback: true,
      },
      securityGroups: [sg],
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(props.imageRepository, props.imageTag),
        containerPort: props.port,
        environment: props.environments,
        secrets: props.secrets,
        logDriver: new ecs.AwsLogDriver({
          streamPrefix: 'Service',
          logGroup: this.logGroup,
        }),
      },
    });

    this.fargate.targetGroup.configureHealthCheck({
      path: props.healthCheckPath,
      protocol: elbv2.Protocol.HTTP,
      healthyHttpCodes: '200',
      healthyThresholdCount: 5,
      unhealthyThresholdCount: 2,
      timeout: cdk.Duration.seconds(5),
      interval: cdk.Duration.seconds(10),
    });

    const scalableTarget = this.fargate.service.autoScaleTaskCount({
      minCapacity: props.minCapacity,
      maxCapacity: props.maxCapacity,
    });

    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: props.scaleOnCpuTargetUtilizationPercent,
    });

    scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: props.scaleOnMemoryTargetUtilizationPercent,
    });

    const listener = this.fargate.listener.node.defaultChild as elbv2.CfnListener;
    listener.defaultActions = [
      {
        type: 'fixed-response',
        fixedResponseConfig: {
          statusCode: '403',
          contentType: 'text/html',
          messageBody: '<h1>403 Forbidden</h1>',
        },
      },
    ];

    const listenerRule = new elbv2.CfnListenerRule(this, `ListenerRule`, {
      actions: [
        {
          type: `forward`,
          targetGroupArn: this.fargate.targetGroup.targetGroupArn,
        },
      ],
      conditions: [
        {
          field: 'http-header',
          httpHeaderConfig: {
            httpHeaderName: props.customHeader.key,
            values: [props.customHeader.value],
          },
        },
      ],
      listenerArn: listener.ref,
      priority: 1,
    });

    const service = this.fargate.service.node.defaultChild as ecs.CfnService;
    service.addDependsOn(listener);
    service.addDependsOn(listenerRule);
  }
}
