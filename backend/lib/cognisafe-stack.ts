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

export class CognisafeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─────────────────────────────────────────────
    // COGNITO USER POOL
    // ─────────────────────────────────────────────
    const userPool = new cognito.UserPool(this, 'CognisafeUserPool', {
      userPoolName: 'cognisafe-q-user-pool',
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
        emailSubject: 'COGNISAFE-Q — Verify your email',
        emailBody:
          'Welcome to COGNISAFE-Q! Your verification code is {####}. This code expires in 24 hours.',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Mobile app client — NO client secret (required for React Native)
    const userPoolClient = userPool.addClient('CognisafeMobileClient', {
      userPoolClientName: 'cognisafe-q-mobile',
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
      tableName: 'cognisafe-users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const contactsTable = new dynamodb.Table(this, 'ContactsTable', {
      tableName: 'cognisafe-contacts',
      partitionKey: { name: 'contactId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    contactsTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    const tripsTable = new dynamodb.Table(this, 'TripsTable', {
      tableName: 'cognisafe-trips',
      partitionKey: { name: 'tripId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    tripsTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    const incidentsTable = new dynamodb.Table(this, 'IncidentsTable', {
      tableName: 'cognisafe-incidents',
      partitionKey: { name: 'incidentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
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
      topicName: 'cognisafe-emergency-alerts',
      displayName: 'COGNISAFE-Q Emergency Alerts',
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
    const lambdaDefaults: Omit<lambda.FunctionProps, 'handler' | 'code'> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(29),
      memorySize: 256,
      environment: lambdaEnv,
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
    };

    const healthFn = new lambda.Function(this, 'HealthFn', {
      ...lambdaDefaults,
      functionName: 'cognisafe-health',
      handler: 'health/handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda'), {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'bash', '-c',
            'npm ci --omit=dev && npx tsc --project tsconfig.json && cp -r dist/lambda/* /asset-output/ && cp -r node_modules /asset-output/',
          ],
        },
      }),
      description: 'GET /health — public health check',
    });

    const profileFn = new lambda.Function(this, 'ProfileFn', {
      ...lambdaDefaults,
      functionName: 'cognisafe-profile',
      handler: 'profile/handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda'), {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'bash', '-c',
            'npm ci --omit=dev && npx tsc --project tsconfig.json && cp -r dist/lambda/* /asset-output/ && cp -r node_modules /asset-output/',
          ],
        },
      }),
      description: 'GET/PUT /profile — user profile management',
    });

    const contactsFn = new lambda.Function(this, 'ContactsFn', {
      ...lambdaDefaults,
      functionName: 'cognisafe-contacts',
      handler: 'contacts/handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda'), {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'bash', '-c',
            'npm ci --omit=dev && npx tsc --project tsconfig.json && cp -r dist/lambda/* /asset-output/ && cp -r node_modules /asset-output/',
          ],
        },
      }),
      description: 'GET/POST/DELETE /contacts — emergency contacts CRUD',
    });

    const tripsFn = new lambda.Function(this, 'TripsFn', {
      ...lambdaDefaults,
      functionName: 'cognisafe-trips',
      handler: 'trips/handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda'), {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'bash', '-c',
            'npm ci --omit=dev && npx tsc --project tsconfig.json && cp -r dist/lambda/* /asset-output/ && cp -r node_modules /asset-output/',
          ],
        },
      }),
      description: 'GET/POST/PUT /trips — trip persistence',
    });

    const incidentsFn = new lambda.Function(this, 'IncidentsFn', {
      ...lambdaDefaults,
      functionName: 'cognisafe-incidents',
      handler: 'incidents/handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda'), {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'bash', '-c',
            'npm ci --omit=dev && npx tsc --project tsconfig.json && cp -r dist/lambda/* /asset-output/ && cp -r node_modules /asset-output/',
          ],
        },
      }),
      description: 'GET/POST /incidents — incident escalation + SNS orchestration',
    });

    // ─────────────────────────────────────────────
    // IAM PERMISSIONS (LEAST PRIVILEGE)
    // ─────────────────────────────────────────────
    // Profile: read/write UsersTable
    usersTable.grantReadWriteData(profileFn);

    // Contacts: read/write ContactsTable
    contactsTable.grantReadWriteData(contactsFn);

    // Trips: read/write TripsTable
    tripsTable.grantReadWriteData(tripsFn);

    // Incidents: read/write IncidentsTable + read ContactsTable + publish to SNS
    incidentsTable.grantReadWriteData(incidentsFn);
    contactsTable.grantReadData(incidentsFn);
    usersTable.grantReadData(incidentsFn);
    emergencyTopic.grantPublish(incidentsFn);

    // SNS SMS permissions for incidents Lambda
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
    const api = new apigwv2.HttpApi(this, 'CognisafeApi', {
      apiName: 'cognisafe-q-api',
      description: 'COGNISAFE-Q HTTP API — mobile emergency safety backend',
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
      'CognisafeAuthorizer',
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      {
        jwtAudience: [userPoolClient.userPoolClientId],
        authorizerName: 'cognisafe-cognito-jwt',
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
      exportName: 'CognisafeApiBaseUrl',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID → set as EXPO_PUBLIC_COGNITO_USER_POOL_ID',
      exportName: 'CognisafeUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito App Client ID → set as EXPO_PUBLIC_COGNITO_CLIENT_ID',
      exportName: 'CognisafeUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'EmergencyTopicArn', {
      value: emergencyTopic.topicArn,
      description: 'SNS Emergency Alert Topic ARN',
      exportName: 'CognisafeEmergencyTopicArn',
    });

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: usersTable.tableName,
      exportName: 'CognisafeUsersTable',
    });

    new cdk.CfnOutput(this, 'ContactsTableName', {
      value: contactsTable.tableName,
      exportName: 'CognisafeContactsTable',
    });

    new cdk.CfnOutput(this, 'TripsTableName', {
      value: tripsTable.tableName,
      exportName: 'CognisafeTripsTable',
    });

    new cdk.CfnOutput(this, 'IncidentsTableName', {
      value: incidentsTable.tableName,
      exportName: 'CognisafeIncidentsTable',
    });
  }
}
