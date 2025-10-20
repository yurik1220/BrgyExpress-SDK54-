// lib/notifications/notificationHandler.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import axios from 'axios';

// Feature flag to temporarily disable all notification behavior
const NOTIFICATIONS_DISABLED = process.env.EXPO_PUBLIC_DISABLE_NOTIFICATIONS === 'true';

// Configure notification handler only when enabled
if (!NOTIFICATIONS_DISABLED) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }),
    });
}

/**
 * Register device for push notifications and return token
 */
export const registerForPushNotifications = async () => {
    if (NOTIFICATIONS_DISABLED) {
        return null;
    }
    if (!Device.isDevice) {
        console.warn('Must use physical device for Push Notifications');
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return null;
    }

    try {
        const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || process.env.EXPO_PUBLIC_PROJECT_ID;
        const token = (await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined as any
        )).data;

        console.log('Expo push token:', token);
        return token;
    } catch (error) {
        console.error('Error getting push token:', error);
        return null;
    }
};

/**
 * Save push token to backend
 */
// Replace the hardcoded URL in savePushTokenToBackend
export const savePushTokenToBackend = async (userId: string, token: string) => {
    if (NOTIFICATIONS_DISABLED) {
        return;
    }
    try {
        const response = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/api/save-push-token`, {
            userId,
            pushToken: token
        });
        console.log('Token save response:', response.data);
    } catch (error) {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as any;
            console.error('Error saving push token:', axiosError.response?.data || axiosError.message);
        } else {
            console.error('Error saving push token:', error);
        }
    }
};

/**
 * Setup notification listeners
 */
export const setupNotificationHandlers = (navigation: any) => {
    if (NOTIFICATIONS_DISABLED) {
        return () => {};
    }
    // Handle notifications received in foreground
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
    });

    // Handle notification taps
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        console.log('Notification tapped:', data);

        if (data.requestId && data.type) {
            navigation.navigate('details', {
                id: data.requestId,
                type: data.type,
                status: data.status
            });
        }
    });

    // Android specific config
    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    // Return cleanup function
    return () => {
        receivedSubscription.remove();
        responseSubscription.remove();
    };
};

/**
 * Initialize complete notification system
 */
export const initNotificationSystem = async (userId: string, navigation: any) => {
    if (NOTIFICATIONS_DISABLED) {
        return undefined;
    }
    try {
        // 1. Register for push notifications
        const token = await registerForPushNotifications();

        // 2. Save token to backend if we got one and have a userId
        if (token && userId) {
            await savePushTokenToBackend(userId, token);
        }

        // 3. Setup notification handlers
        return setupNotificationHandlers(navigation);
    } catch (error) {
        console.error('Notification initialization failed:', error);
        throw error; // Re-throw to handle in component
    }
};