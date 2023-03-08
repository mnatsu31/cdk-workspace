import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { NetworkConstruct } from '../constructs/network';
import { Config } from '../config';
import { BastionConstruct } from '../constructs/bastion';
import { CommonStack } from './common-stack';

type BaseStackProps = cdk.StackProps & {
  config: Config;
  commonStack: CommonStack;
};

export class BaseStack extends cdk.Stack {
  public readonly network: NetworkConstruct;
  public readonly bastion: BastionConstruct;
  public readonly cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    this.network = new NetworkConstruct(this, 'Network', {
      cidr: props.config.stageConfig.network.cidr,
      cidrMask: props.config.stageConfig.network.cidrMask,
    });

    this.bastion = new BastionConstruct(this, 'Bastion', {
      vpc: this.network.vpc,
    });

    this.cluster = new ecs.Cluster(this, 'EcsCluster', {
      vpc: this.network.vpc,
    });

    props.config.stageConfig.dns.records.cname.map((record, i) => {
      new route53.CnameRecord(this, `Cname-${i}`, {
        zone: props.commonStack.getHostedZone(props.config),
        recordName: record.host,
        domainName: record.value,
        ttl: cdk.Duration.hours(1),
      });
    });

    if (props.config.stageConfig.dns.records.mx.length > 0) {
      new route53.MxRecord(this, 'MxRecords', {
        zone: props.commonStack.getHostedZone(props.config),
        values: props.config.stageConfig.dns.records.mx,
        ttl: cdk.Duration.hours(1),
      });
    }

    if (props.config.stageConfig.dns.records.txt.length > 0) {
      new route53.TxtRecord(this, 'TxtRecords', {
        zone: props.commonStack.getHostedZone(props.config),
        values: props.config.stageConfig.dns.records.txt,
        ttl: cdk.Duration.hours(1),
      });
    }
  }
}
