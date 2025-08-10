const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = ['ios', 'android', 'native', 'web'];

config.resolver.alias = {
  'react-native-maps': path.resolve(__dirname, 'src/components/MapComponentWeb.tsx'),
};

config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

config.resolver.blockList = [
  /node_modules\/react-native-maps\/.*/,
];

module.exports = config;
