import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Config } from '../lib/config';
import { CommonStack } from '../lib/stacks/common-stack';
import { BaseStack } from '../lib/stacks/base-stack';
import { StorageStack } from '../lib/stacks/storage-stack';
import { BackendStack } from '../lib/stacks/backend-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';
import { DistributionStack } from '../lib/stacks/distribution-stack';
import { defaultContext } from '../lib/context';

describe('All stacks created', () => {
  test('CommonStack created', () => {
    const app = new cdk.App({ context: defaultContext });
    const config = new Config(app);
    const commonStack = new CommonStack(app, `CommonStack`, { config });
    const template = Template.fromStack(commonStack);
    template.resourceCountIs('AWS::Route53::HostedZone', 2);
  });

  test('BaseStack created', () => {
    const app = new cdk.App({ context: defaultContext });
    const config = new Config(app);
    const commonStack = new CommonStack(app, `CommonStack`, { config });
    const baseStack = new BaseStack(app, 'BaseStack', { config, commonStack });
    const template = Template.fromStack(baseStack);
    template.resourceCountIs('AWS::EC2::VPC', 1);
  });

  test('StorageStack created', () => {
    const app = new cdk.App({ context: defaultContext });
    const config = new Config(app);
    const commonStack = new CommonStack(app, `CommonStack`, { config });
    const baseStack = new BaseStack(app, 'BaseStack', { config, commonStack });
    const storageStack = new StorageStack(app, `StorageStack`, {
      config,
      baseStack,
    });
    const template = Template.fromStack(storageStack);
    template.resourceCountIs('AWS::RDS::DBCluster', 1);
    template.resourceCountIs('AWS::ElastiCache::ReplicationGroup', 1);
  });

  test('BackendStack created', () => {
    const app = new cdk.App({ context: defaultContext });
    const config = new Config(app);
    const commonStack = new CommonStack(app, `CommonStack`, { config });
    const baseStack = new BaseStack(app, 'BaseStack', { config, commonStack });
    const storageStack = new StorageStack(app, `StorageStack`, {
      config,
      baseStack,
    });
    const backendStack = new BackendStack(app, `BackendStack`, {
      config,
      commonStack,
      baseStack,
      storageStack,
    });
    const template = Template.fromStack(backendStack);
    template.resourceCountIs('AWS::ECS::Service', 1);
  });

  test('FrontendStack created', () => {
    const app = new cdk.App({ context: defaultContext });
    const config = new Config(app);
    const commonStack = new CommonStack(app, `CommonStack`, { config });
    const baseStack = new BaseStack(app, 'BaseStack', { config, commonStack });
    const frontendStack = new FrontendStack(app, `FrontendStack`, {
      config,
      commonStack,
      baseStack,
    });
    const template = Template.fromStack(frontendStack);
    template.resourceCountIs('AWS::ECS::Service', 1);
  });

  test('DistributionStack created', () => {
    const app = new cdk.App({ context: defaultContext });
    const config = new Config(app);
    const commonStack = new CommonStack(app, `CommonStack`, { config });
    const baseStack = new BaseStack(app, 'BaseStack', { config, commonStack });
    const storageStack = new StorageStack(app, `StorageStack`, {
      config,
      baseStack,
    });
    const backendStack = new BackendStack(app, `BackendStack`, {
      config,
      commonStack,
      baseStack,
      storageStack,
    });
    const frontendStack = new FrontendStack(app, `FrontendStack`, {
      config,
      commonStack,
      baseStack,
    });
    const distributionStack = new DistributionStack(app, 'DistributionStack', {
      config,
      commonStack,
      storageStack,
      backendStack,
      frontendStack,
    });
    const template = Template.fromStack(distributionStack);
    template.resourceCountIs('AWS::CloudFront::Distribution', 2);
  });
});
