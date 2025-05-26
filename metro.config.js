const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.sourceExts.push('cjs');

// Disable package.json exports support in Metro
defaultConfig.resolver.unstable_enablePackageExports = false;

module.exports = defaultConfig;
