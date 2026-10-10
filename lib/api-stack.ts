import * as cdk from 'aws-cdk-lib';
import * as apigateway
  from 'aws-cdk-lib/aws-apigateway';
import * as iam
  from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';

import {
  ComputeStack,
} from './compute-stack';

export interface ApiStackProps
  extends cdk.StackProps {

  computeStack: ComputeStack;
}

export class ApiStack
  extends cdk.Stack {

  public readonly api:
    apigateway.RestApi;

  constructor(
    scope: Construct,
    id: string,
    props: ApiStackProps
  ) {
    super(scope, id, props);

    const {
      computeStack,
    } = props;

    /*
     * =====================================================
     * Regional REST API
     * =====================================================
     */

    const api =
      new apigateway.RestApi(
        this,
        'ApplicationApi',
        {
          restApiName:
            'AWS CDK Application API',

          endpointTypes: [
            apigateway.EndpointType.REGIONAL,
          ],

          deployOptions: {
            stageName: 'prod',

            tracingEnabled: true,

            metricsEnabled: true,

            loggingLevel:
              apigateway.MethodLoggingLevel.INFO,

            dataTraceEnabled: false,
          },
        }
      );

    this.api = api;

    /*
     * =====================================================
     * Lambda Authorizer
     *
     * An explicit assumeRole is used (instead of the
     * default resource-based Lambda permission) so the
     * invoke permission is attached as an inline policy
     * on this role, scoped to ApiStack. The default
     * behavior would add a permission scoped to the
     * authorizer Lambda's own stack (ComputeStack) that
     * references this API's Ref attribute, creating a
     * ComputeStack <-> ApiStack dependency cycle.
     * =====================================================
     */

    const authorizerInvocationRole =
      new iam.Role(
        this,
        'AuthorizerInvocationRole',
        {
          assumedBy:
            new iam.ServicePrincipal(
              'apigateway.amazonaws.com'
            ),
        }
      );

    const authorizer =
      new apigateway.TokenAuthorizer(
        this,
        'LambdaAuthorizer',
        {
          handler:
            computeStack.authorizerLambda,

          identitySource:
            'method.request.header.Authorization',

          resultsCacheTtl:
            cdk.Duration.seconds(0),

          assumeRole:
            authorizerInvocationRole,
        }
      );

    /*
     * =====================================================
     * /hello
     * =====================================================
     */

    const hello =
      api.root.addResource('hello');

    /*
     * =====================================================
     * Business Lambda Integration
     * =====================================================
     */

    const businessIntegration =
      new apigateway.LambdaIntegration(
        computeStack.businessLambda,
        {
          proxy: true,
        }
      );

    /*
     * =====================================================
     * GET /hello
     * =====================================================
     */

    hello.addMethod(
      'GET',
      businessIntegration,
      {
        authorizationType:
          apigateway.AuthorizationType.CUSTOM,

        authorizer,
      }
    );

    /*
     * =====================================================
     * Outputs
     * =====================================================
     */

    new cdk.CfnOutput(
      this,
      'ApiEndpoint',
      {
        value:
          `${api.url}hello`,
      }
    );
  }
}