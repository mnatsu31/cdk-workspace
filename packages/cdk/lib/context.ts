export type StageValue = 'staging' | 'production';

export type Context = {
  stage: StageValue;
  project: string;
  version: string;
  baseDomain: string;
  account?: string;
  region?: string;
};

export const defaultContext: Context = {
  stage: 'staging',
  project: 'example',
  version: 'latest',
  baseDomain: 'example.com',
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};
