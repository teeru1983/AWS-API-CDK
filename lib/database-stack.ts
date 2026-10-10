import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager
  from 'aws-cdk-lib/aws-secretsmanager';

import { Construct } from 'constructs';

import {
  NetworkStack,
} from './network-stack';

export interface DatabaseStackProps
  extends cdk.StackProps {

  networkStack: NetworkStack;
}

export class DatabaseStack
  extends cdk.Stack {

  public readonly rdsSecurityGroup:
    ec2.SecurityGroup;

  public readonly database:
    rds.DatabaseInstance;

  public readonly databaseSecret:
    secretsmanager.ISecret;

  constructor(
    scope: Construct,
    id: string,
    props: DatabaseStackProps
  ) {
    super(scope, id, props);

    const {
      networkStack,
    } = props;

    /*
     * =====================================================
     * RDS Security Group
     *
     * Created here (not in NetworkStack) to keep any
     * future ingress rules referencing the DB instance's
     * attributes within a single stack and avoid a
     * cyclic NetworkStack <-> DatabaseStack dependency.
     * =====================================================
     */

    this.rdsSecurityGroup =
      new ec2.SecurityGroup(
        this,
        'RdsSecurityGroup',
        {
          vpc:
            networkStack.vpc,

          description:
            'Security group for RDS PostgreSQL',

          allowAllOutbound: true,
        }
      );

    /*
     * =====================================================
     * Lambda -> RDS
     *
     * Lambda
     *    |
     *    | TCP 5432
     *    v
     * RDS PostgreSQL
     * =====================================================
     */

    this.rdsSecurityGroup.addIngressRule(
      networkStack.lambdaSecurityGroup,

      ec2.Port.tcp(5432),

      'Allow Lambda to access PostgreSQL'
    );

    /*
     * =====================================================
     * RDS PostgreSQL
     * =====================================================
     */

    this.database =
      new rds.DatabaseInstance(
        this,
        'PostgresDatabase',
        {
          engine:
            rds.DatabaseInstanceEngine
              .postgres({
                version:
                  rds.PostgresEngineVersion
                    .VER_16,
              }),

          /*
           * VPC comes from NetworkStack.
           */
          vpc:
            networkStack.vpc,

          /*
           * RDS goes into isolated database subnets.
           */
          vpcSubnets: {
            subnetType:
              ec2.SubnetType.PRIVATE_ISOLATED,
          },

          securityGroups: [
            this.rdsSecurityGroup,
          ],

          databaseName:
            'appdb',

          credentials:
            rds.Credentials.fromGeneratedSecret(
              'appadmin'
            ),

          allocatedStorage: 20,

          maxAllocatedStorage: 100,

          instanceType:
            ec2.InstanceType.of(
              ec2.InstanceClass.T4G,
              ec2.InstanceSize.MICRO
            ),

          multiAz: false,

          publiclyAccessible: false,

          backupRetention:
            cdk.Duration.days(1),

          deletionProtection: false,

          removalPolicy:
            cdk.RemovalPolicy.DESTROY,

          deleteAutomatedBackups: true,
        }
      );

    /*
     * =====================================================
     * RDS Secret
     * =====================================================
     */

    this.databaseSecret =
      this.database.secret!;

    /*
     * =====================================================
     * Outputs
     * =====================================================
     */

    new cdk.CfnOutput(
      this,
      'DatabaseEndpoint',
      {
        value:
          this.database
            .dbInstanceEndpointAddress,
      }
    );

    new cdk.CfnOutput(
      this,
      'DatabaseSecretArn',
      {
        value:
          this.databaseSecret.secretArn,
      }
    );
  }
}