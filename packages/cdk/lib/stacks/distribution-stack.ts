import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import { Config } from '../config';
import { BackendStack } from './backend-stack';
import { CommonStack } from './common-stack';
import { FrontendStack } from './frontend-stack';
import { StorageStack } from './storage-stack';

type DistributionStackProps = cdk.StackProps & {
  config: Config;
  commonStack: CommonStack;
  storageStack: StorageStack;
  backendStack: BackendStack;
  frontendStack: FrontendStack;
};

export class DistributionStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;
  public readonly backendDistribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: DistributionStackProps) {
    super(scope, id, props);

    const cachePolicy = new cloudfront.CachePolicy(this, 'CachePolicyForService', {
      defaultTtl: cdk.Duration.seconds(1),
      minTtl: cdk.Duration.seconds(1),
      maxTtl: cdk.Duration.minutes(5),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'Authorization',
        'Host',
        'CloudFront-Viewer-Country',
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
    });

    const functionAssociations: cloudfront.FunctionAssociation[] = [];
    if (props.config.stageConfig.security.basicAuth.enabled) {
      const basicAuthFunction = new cloudfront.Function(this, 'BasicAuthFunction', {
        code: cloudfront.FunctionCode.fromFile({
          filePath: path.join(__dirname, '../../lambda/basic-auth/index.js'),
        }),
      });
      functionAssociations.push({
        eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        function: basicAuthFunction,
      });
    }

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.LoadBalancerV2Origin(
          props.frontendStack.application.fargate.loadBalancer,
          {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            customHeaders: {
              [props.config.stageConfig.security.customHeader.key]:
                props.config.stageConfig.security.customHeader.value,
            },
          },
        ),
        functionAssociations: functionAssociations,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cachePolicy,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
      },
      additionalBehaviors: {
        '/assets/*': {
          origin: new origins.S3Origin(props.storageStack.bucket),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        },
      },
      enabled: true,
      certificate: props.commonStack.certificate,
      domainNames: [props.config.stageConfig.domain],
      httpVersion: cloudfront.HttpVersion.HTTP2,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      sslSupportMethod: cloudfront.SSLMethod.SNI,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      enableIpv6: true,
    });

    new route53.ARecord(this, 'CloudFrontAlias', {
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
      zone: props.commonStack.getHostedZone(props.config),
      ttl: cdk.Duration.minutes(10),
    });

    this.backendDistribution = new cloudfront.Distribution(this, 'BackendDistribution', {
      defaultBehavior: {
        origin: new origins.LoadBalancerV2Origin(
          props.backendStack.application.fargate.loadBalancer,
          {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            customHeaders: {
              [props.config.stageConfig.security.customHeader.key]:
                props.config.stageConfig.security.customHeader.value,
            },
          },
        ),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cachePolicy,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
      },
      additionalBehaviors: {},
      enabled: true,
      certificate: props.commonStack.certificate,
      domainNames: [props.config.stageConfig.backendDomain],
      httpVersion: cloudfront.HttpVersion.HTTP2,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      sslSupportMethod: cloudfront.SSLMethod.SNI,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      enableIpv6: true,
    });

    new route53.ARecord(this, 'BackendCloudFrontAlias', {
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(this.backendDistribution),
      ),
      zone: props.commonStack.getHostedZone(props.config),
      recordName: props.config.stageConfig.backendDomain,
      ttl: cdk.Duration.minutes(10),
    });
  }
}
