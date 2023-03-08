import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

type ElasticacheConstructProps = {
  readonly vpc: ec2.Vpc;
  readonly port: number;
  readonly clusterName: string;
  readonly nodeType: string;
  readonly numNodeGroups: number; // shard数
  readonly replicasPerNodeGroup: number; // shard内のreplica数
  readonly preferredMaintenanceWindow: string;
  readonly properties: { [key: string]: string };
  readonly allowSgs?: ec2.ISecurityGroup[];
};

export class ElasticacheConstruct extends Construct {
  public readonly cluster: elasticache.CfnReplicationGroup;

  constructor(scope: Construct, id: string, props: ElasticacheConstructProps) {
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

    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'SubnetGroup', {
      description: `${props.clusterName}-redis-subnet-group`,
      subnetIds: props.vpc.privateSubnets.map((subnet) => subnet.subnetId),
    });

    const parameterGroup = new elasticache.CfnParameterGroup(this, 'ParameterGroup', {
      description: `${props.clusterName}-redis-parameter-group`,
      cacheParameterGroupFamily: 'redis6.x',
      properties: props.properties,
    });

    this.cluster = new elasticache.CfnReplicationGroup(this, 'ElastiCache', {
      replicationGroupDescription: `${props.clusterName}-redis`,
      autoMinorVersionUpgrade: false,
      automaticFailoverEnabled: true,
      cacheNodeType: props.nodeType,
      cacheParameterGroupName: parameterGroup.ref,
      // subnetGroup.cacheSubnetGroupNameだとうまく設定できないためrefを指定する
      // https://gitlab.com/verbose-equals-true/django-postgres-vue-gitlab-ecs/-/issues/32
      cacheSubnetGroupName: subnetGroup.ref,
      engine: 'redis',
      engineVersion: '6.2',
      multiAzEnabled: true,
      numNodeGroups: props.numNodeGroups,
      port: props.port,
      preferredMaintenanceWindow: props.preferredMaintenanceWindow,
      replicasPerNodeGroup: props.replicasPerNodeGroup,
      securityGroupIds: [sg.securityGroupId],
    });
    this.cluster.addDependsOn(subnetGroup);
    this.cluster.addDependsOn(parameterGroup);
  }
}
