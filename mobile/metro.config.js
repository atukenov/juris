const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = ['ios', 'android', 'native', 'web'];

config.resolver.alias = {
  'react-native-maps': require.resolve('./src/components/MapComponent'),
};

module.exports = config;
