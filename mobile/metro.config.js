const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = ['ios', 'android', 'native', 'web'];

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

config.resolver.blockList = [
  /node_modules\/react-native-maps\/lib\/.*\.js$/,
];

module.exports = config;
