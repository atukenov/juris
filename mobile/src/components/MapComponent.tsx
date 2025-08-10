import { Platform } from 'react-native';

let MapComponent: any;

if (Platform.OS === 'web') {
  const { MapComponentWeb } = require('./MapComponentWeb');
  MapComponent = MapComponentWeb;
} else {
  const { MapComponent: NativeMapComponent } = require('./MapComponent.native');
  MapComponent = NativeMapComponent;
}

export { MapComponent };
