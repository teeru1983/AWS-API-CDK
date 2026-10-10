import * as cdk from 'aws-cdk-lib';
import * as wafv2
  from 'aws-cdk-lib/aws-wafv2';

import { Construct } from 'constructs';

import {
  ApiStack,
} from './api-stack';

export interface WafStackProps
  extends cdk.StackProps {

  apiStack: ApiStack;
}

/*
 * =====================================================
 * WAF (regional, attached directly to the API stage)
 *
 * Kept as its own stack - separate from ApiStack - so a
 * routine `cdk deploy --all` does NOT create it. AWS WAF
 * has no free tier: this stack costs ~$6/month ($5 Web
 * ACL + $1 managed rule group) plus $0.60 per million
 * requests inspected, starting the moment it's deployed.
 *
 * No CloudFront needed: WAFv2 can associate with a
 * Regional API Gateway stage directly.
 *
 * Deploy explicitly, opting in with a context flag:
 *   npx cdk deploy WafStack -c enableWaf=true
 *
 * Tear down when done to stop the charge:
 *   npx cdk destroy WafStack -c enableWaf=true
 * =====================================================
 */

export class WafStack
  extends cdk.Stack {

  constructor(
    scope: Construct,
    id: string,
    props: WafStackProps
  ) {
    super(scope, id, props);

    const {
      apiStack,
    } = props;

    const webAcl =
      new wafv2.CfnWebACL(
        this,
        'ApiWebAcl',
        {
          scope: 'REGIONAL',

          defaultAction: {
            allow: {},
          },

          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'ApiWebAcl',
          },

          rules: [
            {
              name: 'AWS-AWSManagedRulesCommonRuleSet',
              priority: 0,

              overrideAction: {
                none: {},
              },

              statement: {
                managedRuleGroupStatement: {
                  vendorName: 'AWS',
                  name: 'AWSManagedRulesCommonRuleSet',
                },
              },

              visibilityConfig: {
                sampledRequestsEnabled: true,
                cloudWatchMetricsEnabled: true,
                metricName: 'AWSManagedRulesCommonRuleSet',
              },
            },
          ],
        }
      );

    new wafv2.CfnWebACLAssociation(
      this,
      'ApiWebAclAssociation',
      {
        resourceArn:
          apiStack.api.deploymentStage.stageArn,

        webAclArn:
          webAcl.attrArn,
      }
    );

    new cdk.CfnOutput(
      this,
      'WebAclArn',
      {
        value:
          webAcl.attrArn,
      }
    );
  }
}
