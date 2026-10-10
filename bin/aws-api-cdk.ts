#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';

import { NetworkStack } from '../lib/network-stack';
import { DatabaseStack } from '../lib/database-stack';
import { ComputeStack } from '../lib/compute-stack';
import { ApiStack } from '../lib/api-stack';
import { WafStack } from '../lib/waf-stack';

const app = new cdk.App();

const env = {
  account:
    process.env.CDK_DEFAULT_ACCOUNT,

  region:
    process.env.CDK_DEFAULT_REGION,
};

/*
 * =====================================================
 * Network Stack
 * =====================================================
 */

const networkStack =
  new NetworkStack(
    app,
    'NetworkStack',
    {
      env,
    }
  );

/*
 * =====================================================
 * Database Stack
 * =====================================================
 */

const databaseStack =
  new DatabaseStack(
    app,
    'DatabaseStack',
    {
      env,
      networkStack,
    }
  );

/*
 * =====================================================
 * Compute Stack
 * =====================================================
 */

const computeStack =
  new ComputeStack(
    app,
    'ComputeStack',
    {
      env,
      networkStack,
      databaseStack,
    }
  );

/*
 * =====================================================
 * API Stack
 * =====================================================
 */

const apiStack =
  new ApiStack(
    app,
    'ApiStack',
    {
      env,
      computeStack,
    }
  );

/*
 * =====================================================
 * WAF Stack (optional, opt-in only)
 *
 * AWS WAF has no free tier (~$6/month baseline). This
 * stack is only added to the app - and only deployable -
 * when explicitly enabled, so a routine
 * `cdk deploy --all` never creates it:
 *
 *   npx cdk deploy WafStack -c enableWaf=true
 * =====================================================
 */

if (
  app.node.tryGetContext('enableWaf') === 'true'
) {

  new WafStack(
    app,
    'WafStack',
    {
      env,
      apiStack,
    }
  );
}