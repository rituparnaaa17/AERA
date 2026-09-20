import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigwv2Authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export class AeraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─────────────────────────────────────────────
    // COGNITO USER POOL
    // ─────────────────────────────────────────────
    const userPool = new cognito.UserPool(this, 'AeraUserPool', {
      userPoolName: 'aera-user-pool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true },
        phoneNumber: { required: false, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      userVerification: {
        emailSubject: 'AERA — Verify your email',
        emailBody:
          'Welcome to AERA! Your verification code is {####}. This code expires in 24 hours.',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Mobile app client — NO client secret (required for React Native)
    const userPoolClient = userPool.addClient('AeraMobileClient', {
      userPoolClientName: 'aera-mobile',
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      preventUserExistenceErrors: true,
    });

    // ─────────────────────────────────────────────
    // DYNAMODB TABLES
    // ─────────────────────────────────────────────
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'aera-users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const contactsTable = new dynamodb.Table(this, 'ContactsTable', {
      tableName: 'aera-contacts',
      partitionKey: { name: 'contactId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    contactsTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    const tripsTable = new dynamodb.Table(this, 'TripsTable', {
      tableName: 'aera-trips',
      partitionKey: { name: 'tripId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      // TTL: auto-delete trips older than 90 days; keeps storage costs near zero
      timeToLiveAttribute: 'ttl',
    });
    tripsTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    const incidentsTable = new dynamodb.Table(this, 'IncidentsTable', {
      tableName: 'aera-incidents',
      partitionKey: { name: 'incidentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      // TTL: auto-delete resolved incidents older than 1 year
      timeToLiveAttribute: 'ttl',
    });
    incidentsTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });
    incidentsTable.addGlobalSecondaryIndex({
      indexName: 'clientId-index',
      partitionKey: { name: 'clientIncidentId', type: dynamodb.AttributeType.STRING },
    });

    // ─────────────────────────────────────────────
    // SNS TOPIC FOR EMERGENCY NOTIFICATIONS
    // ─────────────────────────────────────────────
    const emergencyTopic = new sns.Topic(this, 'EmergencyAlertTopic', {
      topicName: 'aera-emergency-alerts',
      displayName: 'AERA Emergency Alerts',
    });

    // ─────────────────────────────────────────────
    // SHARED LAMBDA ENVIRONMENT VARIABLES
    // ─────────────────────────────────────────────
    const lambdaEnv: Record<string, string> = {
      USERS_TABLE: usersTable.tableName,
      CONTACTS_TABLE: contactsTable.tableName,
      TRIPS_TABLE: tripsTable.tableName,
      INCIDENTS_TABLE: incidentsTable.tableName,
      SNS_TOPIC_ARN: emergencyTopic.topicArn,
      USER_POOL_ID: userPool.userPoolId,
      DEMO_MODE: process.env.DEMO_MODE ?? 'true',
      NODE_ENV: 'production',
    };

    // ─────────────────────────────────────────────
    // LAMBDA FUNCTIONS
    // ─────────────────────────────────────────────
    // Explicit log group: avoids the deprecated logRetention custom resource Lambda
    const lambdaLogGroup = new logs.LogGroup(this, 'AeraLambdaLogGroup', {
      retention: logs.RetentionDays.THREE_DAYS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const lambdaDefaults: Omit<lambda.FunctionProps, 'handler' | 'code'> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(29),
      // 128 MB is sufficient for DynamoDB/SNS fanout; saves ~50% Lambda cost
      memorySize: 128,
      environment: lambdaEnv,
      // Explicit log group with 3-day retention (no deprecated logRetention custom resource)
      logGroup: lambdaLogGroup,
      tracing: lambda.Tracing.ACTIVE,
    };

    // ─────────────────────────────────────────────
    // LAMBDA DEPLOYMENT PACKAGE
    // ─────────────────────────────────────────────
    // On Windows, CDK Docker-based bundling requires Docker Desktop.
    // We use a LOCAL bundler strategy instead:
    //   1. `npm run build` (tsc) pre-compiles all Lambda handlers to dist/lambda/
    //   2. CDK uploads dist/lambda/ + node_modules as the deployment package
    // This eliminates Docker as a build dependency and works on all platforms.
    const lambdaCode = lambda.Code.fromAsset(path.join(__dirname, '..'), {
      bundling: {
        // Local bundler: runs tsc + copies artifacts on the host machine
        local: {
          tryBundle(outputDir: string) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const cp = require('child_process') as typeof import('child_process');
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const fs = require('fs') as typeof import('fs');
            const cwd = path.join(__dirname, '..');
            try {
              // Step 1: Compile TypeScript handlers
              cp.execSync('npm run build', { cwd, stdio: 'inherit' });
              // Step 2: Copy compiled lambda JS to asset output
              const distLambda = path.join(cwd, 'dist', 'lambda');
              fs.cpSync(distLambda, outputDir, { recursive: true });
              // Step 3: Copy node_modules into asset output
              fs.cpSync(path.join(cwd, 'node_modules'), path.join(outputDir, 'node_modules'), { recursive: true });
              return true;
            } catch {
              return false;
            }
          },
        },
        // Fallback: Docker image (used in CI with Docker available)
        image: lambda.Runtime.NODEJS_20_X.bundlingImage,
        command: [
          'bash', '-c',
          [
            'npm ci --omit=dev',
            'npx tsc --project tsconfig.json',
            'cp -r dist/lambda/* /asset-output/',
            'cp -r node_modules /asset-output/',
          ].join(' && '),
        ],
      },
    });


    const healthFn = new lambda.Function(this, 'HealthFn', {
      ...lambdaDefaults,
      functionName: 'aera-health',
      handler: 'health/handler.handler',
      code: lambdaCode,
      description: 'GET /health — public health check',
    });

    const profileFn = new lambda.Function(this, 'ProfileFn', {
      ...lambdaDefaults,
      functionName: 'aera-profile',
      handler: 'profile/handler.handler',
      code: lambdaCode,
      description: 'GET/PUT /profile — user profile management',
    });

    const contactsFn = new lambda.Function(this, 'ContactsFn', {
      ...lambdaDefaults,
      functionName: 'aera-contacts',
      handler: 'contacts/handler.handler',
      code: lambdaCode,
      description: 'GET/POST/DELETE /contacts — emergency contacts CRUD',
    });

    const tripsFn = new lambda.Function(this, 'TripsFn', {
      ...lambdaDefaults,
      functionName: 'aera-trips',
      handler: 'trips/handler.handler',
      code: lambdaCode,
      description: 'GET/POST/PUT /trips — trip persistence',
    });

    const incidentsFn = new lambda.Function(this, 'IncidentsFn', {
      ...lambdaDefaults,
      functionName: 'aera-incidents',
      handler: 'incidents/handler.handler',
      code: lambdaCode,
      description: 'GET/POST /incidents — incident escalation + SNS orchestration',
    });

    // ─────────────────────────────────────────────
    // IAM PERMISSIONS (LEAST PRIVILEGE)
    // ─────────────────────────────────────────────
    usersTable.grantReadWriteData(profileFn);
    contactsTable.grantReadWriteData(contactsFn);
    tripsTable.grantReadWriteData(tripsFn);
    incidentsTable.grantReadWriteData(incidentsFn);
    contactsTable.grantReadData(incidentsFn);
    usersTable.grantReadData(incidentsFn);
    emergencyTopic.grantPublish(incidentsFn);

    incidentsFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['sns:Publish'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'sns:Protocol': 'sms',
        },
      },
    }));

    // ─────────────────────────────────────────────
    // API GATEWAY HTTP API
    // ─────────────────────────────────────────────
    const api = new apigwv2.HttpApi(this, 'AeraApi', {
      apiName: 'aera-api',
      description: 'AERA HTTP API — mobile emergency safety backend',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // JWT Authorizer using Cognito
    const authorizer = new apigwv2Authorizers.HttpJwtAuthorizer(
      'AeraAuthorizer',
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      {
        jwtAudience: [userPoolClient.userPoolClientId],
        authorizerName: 'aera-cognito-jwt',
        identitySource: ['$request.header.Authorization'],
      },
    );

    // ─────────────────────────────────────────────
    // API ROUTES
    // ─────────────────────────────────────────────

    // Public: health check
    api.addRoutes({
      path: '/health',
      methods: [apigwv2.HttpMethod.GET],
      integration: new apigwv2Integrations.HttpLambdaIntegration('HealthIntegration', healthFn),
    });

    // Protected: profile
    api.addRoutes({
      path: '/profile',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT],
      integration: new apigwv2Integrations.HttpLambdaIntegration('ProfileIntegration', profileFn),
      authorizer,
    });

    // Protected: contacts
    api.addRoutes({
      path: '/contacts',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      integration: new apigwv2Integrations.HttpLambdaIntegration('ContactsIntegration', contactsFn),
      authorizer,
    });
    api.addRoutes({
      path: '/contacts/{contactId}',
      methods: [apigwv2.HttpMethod.DELETE, apigwv2.HttpMethod.PUT],
      integration: new apigwv2Integrations.HttpLambdaIntegration('ContactsByIdIntegration', contactsFn),
      authorizer,
    });

    // Protected: trips
    api.addRoutes({
      path: '/trips',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      integration: new apigwv2Integrations.HttpLambdaIntegration('TripsIntegration', tripsFn),
      authorizer,
    });
    api.addRoutes({
      path: '/trips/{tripId}',
      methods: [apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.GET],
      integration: new apigwv2Integrations.HttpLambdaIntegration('TripsByIdIntegration', tripsFn),
      authorizer,
    });

    // Protected: incidents
    api.addRoutes({
      path: '/incidents',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      integration: new apigwv2Integrations.HttpLambdaIntegration('IncidentsIntegration', incidentsFn),
      authorizer,
    });
    api.addRoutes({
      path: '/incidents/{incidentId}',
      methods: [apigwv2.HttpMethod.GET],
      integration: new apigwv2Integrations.HttpLambdaIntegration('IncidentsByIdIntegration', incidentsFn),
      authorizer,
    });

    // ─────────────────────────────────────────────
    // CLOUDFORMATION OUTPUTS
    // ─────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiBaseUrl', {
      value: api.apiEndpoint,
      description: 'API Gateway base URL → set as EXPO_PUBLIC_API_GATEWAY_URL',
      exportName: 'AeraApiBaseUrl',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID → set as EXPO_PUBLIC_COGNITO_USER_POOL_ID',
      exportName: 'AeraUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito App Client ID → set as EXPO_PUBLIC_COGNITO_CLIENT_ID',
      exportName: 'AeraUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'EmergencyTopicArn', {
      value: emergencyTopic.topicArn,
      description: 'SNS Emergency Alert Topic ARN',
      exportName: 'AeraEmergencyTopicArn',
    });

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: usersTable.tableName,
      exportName: 'AeraUsersTable',
    });

    new cdk.CfnOutput(this, 'ContactsTableName', {
      value: contactsTable.tableName,
      exportName: 'AeraContactsTable',
    });

    new cdk.CfnOutput(this, 'TripsTableName', {
      value: tripsTable.tableName,
      exportName: 'AeraTripsTable',
    });

    new cdk.CfnOutput(this, 'IncidentsTableName', {
      value: incidentsTable.tableName,
      exportName: 'AeraIncidentsTable',
    });
  }
}
