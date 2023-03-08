#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CommonStack } from '../lib/stacks/common-stack';
import { BaseStack } from '../lib/stacks/base-stack';
import { StorageStack } from '../lib/stacks/storage-stack';
import { defaultContext } from '../lib/context';
import { Config } from '../lib/config';
import { BackendStack } from '../lib/stacks/backend-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';
import { DistributionStack } from '../lib/stacks/distribution-stack';

const app = new cdk.App({
  context: defaultContext,
});

const config = new Config(app);

const env = {
  account: app.node.tryGetContext('account') as string,
  region: app.node.tryGetContext('region') as string,
};

const commonStack = new CommonStack(app, config.commonStackName('CommonStack'), {
  env,
  config,
});

const baseStack = new BaseStack(app, config.stagedStackName('BaseStack'), {
  env,
  config,
  commonStack,
});
baseStack.addDependency(commonStack);

const storageStack = new StorageStack(app, config.stagedStackName('StorageStack'), {
  env,
  config,
  baseStack,
});
storageStack.addDependency(baseStack);

const backendStack = new BackendStack(app, config.stagedStackName('BackendStack'), {
  env,
  config,
  commonStack,
  baseStack,
  storageStack,
});
backendStack.addDependency(commonStack);
backendStack.addDependency(baseStack);
backendStack.addDependency(storageStack);

const frontendStack = new FrontendStack(app, config.stagedStackName('FrontendStack'), {
  env,
  config,
  commonStack,
  baseStack,
});
frontendStack.addDependency(commonStack);
frontendStack.addDependency(baseStack);

const distributionStack = new DistributionStack(app, config.stagedStackName('DistributionStack'), {
  env,
  config,
  commonStack,
  storageStack,
  backendStack,
  frontendStack,
});
distributionStack.addDependency(commonStack);
distributionStack.addDependency(storageStack);
distributionStack.addDependency(backendStack);
distributionStack.addDependency(frontendStack);

cdk.Tags.of(app).add('Project', config.project);
cdk.Tags.of(app).add('Stage', config.stage);
cdk.Tags.of(commonStack).remove('Stage');
