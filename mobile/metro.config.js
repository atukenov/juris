const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = ['ios', 'android', 'native', 'web'];

config.resolver.alias = {
  'react-native-maps': false,
};

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
