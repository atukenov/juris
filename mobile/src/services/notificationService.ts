import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as any),
});

export interface NotificationData {
  type: 'team_invite' | 'member_removed' | 'ownership_transfer' | 'territory_captured';
  teamId?: string;
  teamName?: string;
  message: string;
}

class NotificationService {
  async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      throw new Error('Permission not granted for notifications');
    }
    
    return finalStatus;
  }

  async getExpoPushToken() {
    try {
      await this.requestPermissions();
      
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
      
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      throw error;
    }
  }

  async scheduleLocalNotification(title: string, body: string, data?: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null,
    });
  }

  addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  async registerPushToken() {
    try {
      const token = await this.getExpoPushToken();
      
      const authToken = await AsyncStorage.getItem('token');
      if (!authToken) {
        console.log('No auth token available for push token registration');
        return;
      }
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ pushToken: token })
      });
      
      if (response.ok) {
        console.log('Push token registered successfully');
        return token;
      } else {
        console.error('Failed to register push token:', response.status);
      }
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  }

  async initializeNotifications() {
    try {
      await this.requestPermissions();
      const token = await this.registerPushToken();
      
      this.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
      });

      this.addNotificationResponseReceivedListener((response) => {
        console.log('Notification response:', response);
      });

      return token;
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }
}

export const notificationService = new NotificationService();
