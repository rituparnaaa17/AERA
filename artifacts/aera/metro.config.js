const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the workspace root so monorepo packages resolve correctly
config.watchFolders = [workspaceRoot];

// Resolve modules from local node_modules first, then workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Ensure Metro can resolve the workspace api-client-react package
config.resolver.extraNodeModules = {
  '@workspace/api-client-react': path.resolve(workspaceRoot, 'lib/api-client-react'),
};

module.exports = config;
