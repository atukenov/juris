import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { View } from "react-native";
import { MapScreen } from "../screens/MapScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RunScreen } from "../screens/RunScreen";
import { TeamScreen } from "../screens/TeamScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { TabBarBadge } from "../components/TabBarBadge";
import { useChatStore } from "../store/chatStore";
import { theme } from "../theme/theme";
import { RootStackParamList } from "./types";

const Tab = createBottomTabNavigator<RootStackParamList>();

export const MainNavigator = () => {
  const { unreadCount } = useChatStore();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textLight,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTitleStyle: {
          color: theme.colors.text,
        },
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Run"
        component={RunScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="walk" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Team"
        component={TeamScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="chatbubbles" size={size} color={color} />
              <TabBarBadge count={unreadCount} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
