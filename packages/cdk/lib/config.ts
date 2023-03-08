import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { StageValue } from './context';

export class Config {
  public readonly stage: StageValue;
  public readonly project: string;
  public readonly version: string;
  public readonly baseDomain: string;
  public readonly stageConfig: StageConfig;

  constructor(app: cdk.App) {
    this.stage = app.node.tryGetContext('stage') as StageValue;
    if (!this.stage) {
      throw new Error(
        'Context variable missing on CDK command. Pass in as `-c stage=production|staging`',
      );
    }
    this.project = app.node.tryGetContext('project') as string;
    this.version = app.node.tryGetContext('version') as string;
    this.baseDomain = app.node.tryGetContext('baseDomain') as string;
    this.stageConfig = getStageConfig(this.stage, this.project);
  }

  commonStackName(name: string): string {
    return `${this.project}-${name}`;
  }

  stagedStackName(name: string): string {
    return `${this.project}-${this.stage}-${name}`;
  }

  certificateArn(): string {
    if (this.stage === 'production') {
      return 'FIXME';
    } else {
      return 'FIXME';
    }
  }
}

export type StageConfig = {
  readonly secretsName: string;
  readonly domain: string;
  readonly backendDomain: string;
  readonly network: {
    cidr: string;
    cidrMask: number;
  };
  readonly dns: {
    records: {
      cname: { host: string; value: string }[];
      mx: route53.MxRecordValue[];
      txt: string[];
    };
  };
  readonly database: {
    port: number;
    minCapacity: number;
    maxCapacity: number;
    autoPause?: cdk.Duration;
  };
  readonly cache: {
    port: number;
    nodeType: string;
    numNodeGrpups: number;
    replicasPerNodeGroup: number;
    preferredMaintenanceWindow: string;
    properties: { [key: string]: string };
  };
  readonly security: {
    basicAuth: {
      enabled: boolean;
      user?: string;
      password?: string;
    };
    customHeader: {
      key: string;
      value: string;
    };
  };
  readonly services: Record<ServiceName, ServiceConfig>;
};

export type ServiceName = 'backend' | 'frontend';
export type ServiceConfig = {
  readonly port: number;
  readonly cpu: number;
  readonly memoryLimitMiB: number;
  readonly desireCount: number;
  readonly minCapacity: number;
  readonly maxCapacity: number;
  readonly scaleOnCpuTargetUtilizationPercent: number;
  readonly scaleOnMemoryTargetUtilizationPercent: number;
  readonly defaultRetentionDays: number;
  readonly environments: Record<string, string>;
  readonly secrets: string[];
};

export const getStageConfig = (stage: StageValue, project: string): StageConfig => {
  return {
    secretsName: `${project}/${stage}/Secrets`,
    ...stageConfig[stage],
  };
};

type DynamicStageConfig = 'secretsName';
const stageConfig: Record<StageValue, Omit<StageConfig, DynamicStageConfig>> = {
  staging: {
    domain: 'dev.example.com',
    backendDomain: 'api.dev.example.com',
    network: {
      cidr: '10.0.0.0/16',
      cidrMask: 24,
    },
    dns: {
      records: {
        cname: [],
        mx: [],
        txt: [],
      },
    },
    database: {
      port: 3306,
      minCapacity: 1,
      maxCapacity: 1,
      autoPause: cdk.Duration.minutes(0),
    },
    cache: {
      port: 6379,
      nodeType: 'cache.t2.micro',
      numNodeGrpups: 1,
      replicasPerNodeGroup: 1,
      preferredMaintenanceWindow: 'sat:16:30-sat:17:30',
      properties: {
        'cluster-enabled': 'yes',
      },
    },
    security: {
      basicAuth: {
        enabled: true,
        user: 'user',
        password: 'password',
      },
      customHeader: {
        key: 'x-pre-shared-key',
        value: 'FIXME: random string key',
      },
    },
    services: {
      backend: {
        port: 3000,
        cpu: 512,
        memoryLimitMiB: 1024,
        desireCount: 1,
        minCapacity: 1,
        maxCapacity: 1,
        scaleOnCpuTargetUtilizationPercent: 75,
        scaleOnMemoryTargetUtilizationPercent: 75,
        defaultRetentionDays: logs.RetentionDays.ONE_WEEK,
        environments: {
          LOG_LEVEL: 'info',
        },
        secrets: ['JWT_SECRET'],
      },
      frontend: {
        port: 3000,
        cpu: 512,
        memoryLimitMiB: 1024,
        desireCount: 1,
        minCapacity: 1,
        maxCapacity: 1,
        scaleOnCpuTargetUtilizationPercent: 75,
        scaleOnMemoryTargetUtilizationPercent: 75,
        defaultRetentionDays: logs.RetentionDays.ONE_WEEK,
        environments: {},
        secrets: [],
      },
    },
  },
  production: {
    domain: 'example.com',
    backendDomain: 'api.example.com',
    network: {
      cidr: '10.0.0.0/16',
      cidrMask: 24,
    },
    dns: {
      records: {
        cname: [],
        mx: [],
        txt: [],
      },
    },
    database: {
      port: 3306,
      minCapacity: 1,
      maxCapacity: 1,
      autoPause: cdk.Duration.minutes(0),
    },
    cache: {
      port: 6379,
      nodeType: 'cache.m6g.large',
      numNodeGrpups: 1,
      replicasPerNodeGroup: 1,
      preferredMaintenanceWindow: 'sat:16:30-sat:17:30',
      properties: {
        'cluster-enabled': 'yes',
      },
    },
    security: {
      basicAuth: {
        enabled: true,
        user: 'user',
        password: 'password',
      },
      customHeader: {
        key: 'x-pre-shared-key',
        value: 'FIXME: random string key',
      },
    },
    services: {
      backend: {
        port: 3000,
        cpu: 512,
        memoryLimitMiB: 1024,
        desireCount: 1,
        minCapacity: 1,
        maxCapacity: 1,
        scaleOnCpuTargetUtilizationPercent: 75,
        scaleOnMemoryTargetUtilizationPercent: 75,
        defaultRetentionDays: logs.RetentionDays.THIRTEEN_MONTHS,
        environments: {
          LOG_LEVEL: 'info',
        },
        secrets: ['JWT_SECRET'],
      },
      frontend: {
        port: 3000,
        cpu: 512,
        memoryLimitMiB: 1024,
        desireCount: 1,
        minCapacity: 1,
        maxCapacity: 1,
        scaleOnCpuTargetUtilizationPercent: 75,
        scaleOnMemoryTargetUtilizationPercent: 75,
        defaultRetentionDays: logs.RetentionDays.THIRTEEN_MONTHS,
        environments: {},
        secrets: [],
      },
    },
  },
};
