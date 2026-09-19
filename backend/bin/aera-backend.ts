#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AeraStack } from '../lib/aera-stack';

const app = new cdk.App();

new AeraStack(app, 'AeraStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-south-1',
  },
  description: 'AERA AWS Serverless Backend — Cognito + API Gateway + Lambda + DynamoDB + SNS',
});
