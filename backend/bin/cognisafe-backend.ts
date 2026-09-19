#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CognisafeStack } from '../lib/cognisafe-stack';

const app = new cdk.App();

new CognisafeStack(app, 'CognisafeStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-south-1',
  },
  description: 'COGNISAFE-Q AWS Serverless Backend — Cognito + API Gateway + Lambda + DynamoDB + SNS',
});
