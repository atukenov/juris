import { Platform } from 'react-native';

let MapComponent: any;

if (Platform.OS === 'web') {
  MapComponent = require('./MapComponentWeb').MapComponentWeb;
} else {
  MapComponent = require('./MapComponent.native').MapComponent;
}

export { MapComponent };
