const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .mov as an asset extension for video files
config.resolver.assetExts.push('mov');

module.exports = config;
