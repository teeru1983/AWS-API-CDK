#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';

import { NetworkStack } from '../lib/network-stack';
import { DatabaseStack } from '../lib/database-stack';
import { ComputeStack } from '../lib/compute-stack';
import { ApiStack } from '../lib/api-stack';

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

new ApiStack(
  app,
  'ApiStack',
  {
    env,
    computeStack,
  }
);