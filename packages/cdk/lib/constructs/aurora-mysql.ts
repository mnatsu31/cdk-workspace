import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

type AuroraMysqlConstructProps = {
  vpc: ec2.Vpc;
  readonly port: number;
  readonly databaseName: string;
  readonly minCapacity: number;
  readonly maxCapacity: number;
  readonly autoPause?: cdk.Duration;
  readonly allowSgs?: ec2.ISecurityGroup[];
};

export class AuroraMysqlConstruct extends Construct {
  public readonly cluster: rds.ServerlessCluster;

  constructor(scope: Construct, id: string, props: AuroraMysqlConstructProps) {
    super(scope, id);

    const sg = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
    });
    props.vpc.privateSubnets.map((subnet) => {
      sg.addIngressRule(ec2.Peer.ipv4(subnet.ipv4CidrBlock), ec2.Port.tcp(props.port));
    });
    sg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.allTcp());
    if (props.allowSgs) {
      props.allowSgs.map((allowSg) => {
        sg.addIngressRule(allowSg, ec2.Port.tcp(props.port));
      });
    }

    const engine = rds.DatabaseClusterEngine.auroraMysql({
      version: rds.AuroraMysqlEngineVersion.VER_2_08_3,
    });

    const parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine: engine,
      parameters: {
        character_set_client: 'utf8mb4',
        character_set_connection: 'utf8mb4',
        character_set_database: 'utf8mb4',
        character_set_results: 'utf8mb4',
        character_set_server: 'utf8mb4',
        collation_connection: 'utf8mb4_bin',
        slow_query_log: '1',
        long_query_time: '1',
        log_output: 'FILE',
        innodb_large_prefix: '1',
        innodb_file_format: 'Barracuda',
        innodb_file_per_table: '1',
      },
    });

    this.cluster = new rds.ServerlessCluster(this, 'ServerlessCluster', {
      engine: engine,
      enableDataApi: true,
      defaultDatabaseName: props.databaseName,
      parameterGroup: parameterGroup,
      vpc: props.vpc,
      vpcSubnets: {
        subnets: props.vpc.privateSubnets,
      },
      securityGroups: [sg],
      scaling: {
        minCapacity: props.minCapacity,
        maxCapacity: props.maxCapacity,
        autoPause: props.autoPause,
      },
    });
  }
}
