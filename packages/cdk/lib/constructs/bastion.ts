import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

type BastionConstructProps = {
  vpc: ec2.Vpc;
};

export class BastionConstruct extends Construct {
  public readonly instance: ec2.BastionHostLinux;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: BastionConstructProps) {
    super(scope, id);

    this.securityGroup = new ec2.SecurityGroup(this, 'Sg', {
      vpc: props.vpc,
    });

    this.instance = new ec2.BastionHostLinux(this, 'Instance', {
      vpc: props.vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      securityGroup: this.securityGroup,
    });
  }
}
