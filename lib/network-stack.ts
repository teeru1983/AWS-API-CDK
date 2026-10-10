import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface NetworkStackProps extends cdk.StackProps {}

export class NetworkStack extends cdk.Stack {

  public readonly vpc: ec2.Vpc;

  public readonly lambdaSecurityGroup:
    ec2.SecurityGroup;

  public readonly endpointSecurityGroup:
    ec2.SecurityGroup;

  public readonly secretsManagerEndpoint:
    ec2.InterfaceVpcEndpoint;

  constructor(
    scope: Construct,
    id: string,
    props?: NetworkStackProps
  ) {
    super(scope, id, props);

    /*
     * =====================================================
     * VPC
     * =====================================================
     */

    this.vpc = new ec2.Vpc(
      this,
      'ApplicationVpc',
      {
        maxAzs: 2,

        /*
         * One NAT Gateway for learning/dev.
         *
         * Production may use multiple NAT gateways
         * for higher availability.
         */
        natGateways: 1,

        subnetConfiguration: [
          {
            name: 'Public',

            subnetType:
              ec2.SubnetType.PUBLIC,

            cidrMask: 24,
          },

          {
            name: 'Private',

            subnetType:
              ec2.SubnetType.PRIVATE_WITH_EGRESS,

            cidrMask: 24,
          },

          {
            name: 'Database',

            subnetType:
              ec2.SubnetType.PRIVATE_ISOLATED,

            cidrMask: 24,
          },
        ],
      }
    );

    /*
     * =====================================================
     * Lambda Security Group
     * =====================================================
     */

    this.lambdaSecurityGroup =
      new ec2.SecurityGroup(
        this,
        'LambdaSecurityGroup',
        {
          vpc: this.vpc,

          description:
            'Security group for Lambda functions',

          allowAllOutbound: true,
        }
      );

    /*
     * =====================================================
     * RDS Security Group is created in DatabaseStack.
     *
     * The RDS Proxy construct automatically adds an
     * ingress rule referencing the DB instance's
     * Endpoint.Port attribute. If that security group
     * lived here in NetworkStack, it would create a
     * NetworkStack -> DatabaseStack dependency, which
     * conflicts with DatabaseStack -> NetworkStack (for
     * VPC/subnets) and forms a cyclic reference.
     * =====================================================
     */

    /*
     * =====================================================
     * VPC Endpoint Security Group
     * =====================================================
     */

    this.endpointSecurityGroup =
      new ec2.SecurityGroup(
        this,
        'EndpointSecurityGroup',
        {
          vpc: this.vpc,

          description:
            'Security group for VPC interface endpoints',

          allowAllOutbound: true,
        }
      );

    /*
     * =====================================================
     * Lambda -> Secrets Manager VPC Endpoint
     *
     * Lambda SG
     *     |
     *     | TCP 443
     *     v
     * Endpoint SG
     * =====================================================
     */

    this.endpointSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,

      ec2.Port.tcp(443),

      'Allow Lambda to access Secrets Manager endpoint'
    );

    /*
     * =====================================================
     * Secrets Manager VPC Interface Endpoint
     * =====================================================
     */

    this.secretsManagerEndpoint =
      this.vpc.addInterfaceEndpoint(
        'SecretsManagerEndpoint',
        {
          service:
            ec2.InterfaceVpcEndpointAwsService
              .SECRETS_MANAGER,

          privateDnsEnabled: true,

          securityGroups: [
            this.endpointSecurityGroup,
          ],
        }
      );

    /*
     * =====================================================
     * Outputs
     * =====================================================
     */

    new cdk.CfnOutput(
      this,
      'VpcId',
      {
        value:
          this.vpc.vpcId,
      }
    );
  }
}