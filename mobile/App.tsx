import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Navigation } from "./src/navigation/Navigation";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Navigation />
        <StatusBar style="auto" />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
