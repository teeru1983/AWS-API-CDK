import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { Construct } from 'constructs';

import {
  NetworkStack,
} from './network-stack';

import {
  DatabaseStack,
} from './database-stack';

export interface ComputeStackProps
  extends cdk.StackProps {

  networkStack: NetworkStack;

  databaseStack: DatabaseStack;
}

export class ComputeStack
  extends cdk.Stack {

  public readonly businessLambda:
    lambda.Function;

  public readonly authorizerLambda:
    lambda.Function;

  constructor(
    scope: Construct,
    id: string,
    props: ComputeStackProps
  ) {
    super(scope, id, props);

    const {
      networkStack,
      databaseStack,
    } = props;

    /*
     * =====================================================
     * Business Lambda
     * =====================================================
     */

    this.businessLambda =
      new lambda.Function(
        this,
        'BusinessLambda',
        {
          runtime:
            lambda.Runtime.NODEJS_22_X,

          handler:
            'index.handler',

          code:
            lambda.Code.fromAsset(
              'lambda/business'
            ),

          timeout:
            cdk.Duration.seconds(30),

          memorySize: 512,

          /*
           * Lambda runs inside the VPC.
           */
          vpc:
            networkStack.vpc,

          vpcSubnets: {
            subnetType:
              ec2.SubnetType.PRIVATE_WITH_EGRESS,
          },

          securityGroups: [
            networkStack.lambdaSecurityGroup,
          ],

          /*
           * Database configuration.
           */
          environment: {
            DB_SECRET_ARN:
              databaseStack
                .databaseSecret
                .secretArn,

            DB_ENDPOINT:
              databaseStack
                .database
                .dbInstanceEndpointAddress,
          },
        }
      );

    /*
     * =====================================================
     * Lambda -> Secrets Manager
     * =====================================================
     */

    databaseStack.databaseSecret
      .grantRead(
        this.businessLambda
      );

    /*
     * =====================================================
     * Authorizer Lambda
     * =====================================================
     */

    this.authorizerLambda =
      new lambda.Function(
        this,
        'AuthorizerLambda',
        {
          runtime:
            lambda.Runtime.NODEJS_22_X,

          handler:
            'index.handler',

          code:
            lambda.Code.fromAsset(
              'lambda/authorizer'
            ),

          timeout:
            cdk.Duration.seconds(10),

          memorySize: 256,
        }
      );

    /*
     * =====================================================
     * Outputs
     * =====================================================
     */

    new cdk.CfnOutput(
      this,
      'BusinessLambdaName',
      {
        value:
          this.businessLambda
            .functionName,
      }
    );

    new cdk.CfnOutput(
      this,
      'AuthorizerLambdaName',
      {
        value:
          this.authorizerLambda
            .functionName,
      }
    );
  }
}