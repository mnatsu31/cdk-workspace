import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import { Config } from '../config';

type CommonStackProps = cdk.StackProps & {
  config: Config;
};

export class CommonStack extends cdk.Stack {
  public readonly publicZone: route53.HostedZone;
  public readonly devPublicZone: route53.HostedZone;
  public readonly certificate: acm.ICertificate;
  public readonly repositories: Record<string, ecr.Repository> = {};

  constructor(scope: Construct, id: string, props: CommonStackProps) {
    super(scope, id, props);

    this.publicZone = new route53.HostedZone(this, 'PublicZone', {
      zoneName: props.config.baseDomain,
    });
    this.devPublicZone = new route53.HostedZone(this, 'DevPublicZone', {
      zoneName: `dev.${props.config.baseDomain}`,
    });
    new route53.NsRecord(this, 'DevNsRecord', {
      zone: this.publicZone,
      recordName: 'dev',
      values: this.devPublicZone.hostedZoneNameServers || [],
      ttl: cdk.Duration.minutes(30),
    });

    if (props.config.certificateArn()) {
      this.certificate = acm.Certificate.fromCertificateArn(
        this,
        'Certificate',
        props.config.certificateArn(),
      );
    }

    const namespace = props.config.project;
    const services = Object.keys(props.config.stageConfig.services);
    services.map((service: string) => {
      this.repositories[service] = new ecr.Repository(this, service, {
        repositoryName: `${namespace}/${service}`,
      });
    });

    this.exportValue(this.publicZone.hostedZoneId);
    this.exportValue(this.devPublicZone.hostedZoneId);
  }

  getHostedZone(config: Config): route53.IHostedZone {
    if (config.stageConfig.domain === this.publicZone.zoneName) {
      return this.publicZone;
    } else if (config.stageConfig.domain === this.devPublicZone.zoneName) {
      return this.devPublicZone;
    } else {
      throw new Error('stageConfig.domain is invalid value.');
    }
  }
}
