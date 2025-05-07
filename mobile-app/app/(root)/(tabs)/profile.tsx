import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    Image,
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Animated, { 
    FadeInDown, 
    FadeIn, 
    useAnimatedStyle, 
    withSpring,
    interpolate,
    useSharedValue
} from 'react-native-reanimated';
import { styles } from '@/styles/profile_styles';
import { useTabBarVisibility } from './_layout';

interface UserData {
    id: string;
    name: string;
    clerk_id: string;
    requests_completed: number;
    requests_pending: number;
    member_since: string;
}

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

const Profile = () => {
    const router = useRouter();
    const { signOut, userId } = useAuth();
    const { setIsTabBarVisible } = useTabBarVisibility();
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tempName, setTempName] = useState('');
    const lastScrollY = useRef(0);
    const scrollY = useSharedValue(0);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                if (!userId) {
                    throw new Error('User not authenticated');
                }

                const response = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${userId}`);
                setUser(response.data);
                setTempName(response.data.name);
            } catch (err) {
                console.error('Failed to fetch user data:', err);
                setError('Failed to load profile data');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [userId]);

    const handleLogout = async () => {
        try {
            await signOut();
            router.replace('/sign-in');
        } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to logout. Please try again.');
        }
    };

    const showLogoutConfirmation = () => {
        setLogoutModalVisible(true);
    };

    const handleEditProfile = () => {
        setEditModalVisible(true);
    };

    const handleUpdateProfile = async () => {
        try {
            if (!tempName.trim()) {
                Alert.alert('Error', 'Name cannot be empty');
                return;
            }

            const response = await axios.patch(
                `${process.env.EXPO_PUBLIC_API_URL}/api/users/${userId}`,
                { name: tempName }
            );

            setUser(response.data);
            setEditModalVisible(false);
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile');
        }
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        scrollY.value = currentScrollY;
        
        // Show tab bar when scrolling up, hide when scrolling down
        if (currentScrollY < lastScrollY.current) {
            setIsTabBarVisible(true);
        } else if (currentScrollY > 50) { // Reduced threshold to make it more sensitive
            setIsTabBarVisible(false);
        }
        
        lastScrollY.current = currentScrollY;
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={[styles.container, styles.loadingContainer]}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={[styles.optionButton, { marginTop: 20 }]}
                    onPress={() => {
                        setLoading(true);
                        setError(null);
                    }}
                >
                    <Text style={styles.optionText}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (!user) {
        return (
            <SafeAreaView style={[styles.container, styles.loadingContainer]}>
                <Text style={styles.emptyText}>No user data available</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <LinearGradient
                colors={['#e0f2fe', '#bae6fd', '#7dd3fc']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBackground}
            />

            <ScrollView 
                contentContainerStyle={[
                    styles.scrollContainer,
                    { minHeight: SCREEN_HEIGHT + 200 } // Ensure content is taller than screen
                ]}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                bounces={true}
            >
                <Animated.View 
                    entering={FadeInDown.duration(600).springify()}
                    style={styles.header}
                >
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={handleEditProfile}
                    >
                        <Feather name="edit" size={24} color="#3b82f6" />
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View 
                    entering={FadeInDown.duration(600).delay(100).springify()}
                    style={styles.profileContainer}
                >
                    <View style={styles.avatarContainer}>
                        <LinearGradient
                            colors={['#3b82f6', '#60a5fa']}
                            style={styles.avatarGradient}
                        >
                            <Text style={styles.avatarText}>
                                {user.name.charAt(0).toUpperCase()}
                            </Text>
                        </LinearGradient>
                    </View>

                    <Text style={styles.name}>{user.name}</Text>
                    <Text style={styles.phone}>ID: {user.clerk_id}</Text>

                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{user.requests_completed}</Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{user.requests_pending}</Text>
                            <Text style={styles.statLabel}>Pending</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                                {new Date(user.member_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </Text>
                            <Text style={styles.statLabel}>Member Since</Text>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View 
                    entering={FadeInDown.duration(600).delay(200).springify()}
                    style={styles.sectionContainer}
                >
                    <Text style={styles.sectionTitle}>Account Settings</Text>

                    <TouchableOpacity style={styles.optionButton}>
                        <View style={styles.optionTextContainer}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="notifications-outline" size={24} color="#3b82f6" />
                            </View>
                            <Text style={styles.optionText}>Notification Settings</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionButton}>
                        <View style={styles.optionTextContainer}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="shield-account" size={24} color="#3b82f6" />
                            </View>
                            <Text style={styles.optionText}>Privacy & Security</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionButton}>
                        <View style={styles.optionTextContainer}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="help-circle-outline" size={24} color="#3b82f6" />
                            </View>
                            <Text style={styles.optionText}>Help & Support</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionButton}>
                        <View style={styles.optionTextContainer}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="information-circle-outline" size={24} color="#3b82f6" />
                            </View>
                            <Text style={styles.optionText}>About</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
                    </TouchableOpacity>
                </Animated.View>

                <SafeAreaView edges={['bottom']} style={styles.bottomContainer}>
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={showLogoutConfirmation}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </ScrollView>

            {/* Logout Confirmation Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={logoutModalVisible}
                onRequestClose={() => setLogoutModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View 
                        entering={FadeIn.duration(200)}
                        style={styles.modalContainer}
                    >
                        <View style={styles.modalIconContainer}>
                            <Ionicons name="warning" size={48} color="#f59e0b" />
                        </View>
                        <Text style={styles.modalTitle}>Log Out</Text>
                        <Text style={styles.modalText}>
                            Are you sure you want to log out? You'll need to sign in again to
                            access your account.
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalCancelButton]}
                                onPress={() => setLogoutModalVisible(false)}
                            >
                                <Text style={[styles.modalButtonText, styles.modalCancelText]}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalConfirmButton]}
                                onPress={handleLogout}
                            >
                                <Text style={[styles.modalButtonText, styles.modalConfirmText]}>
                                    Log Out
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* Edit Profile Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={editModalVisible}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View 
                        entering={FadeInDown.duration(300).springify()}
                        style={styles.modalContainer}
                    >
                        <Text style={styles.modalTitle}>Edit Profile</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                value={tempName}
                                onChangeText={setTempName}
                                placeholder="Enter your name"
                                placeholderTextColor="#94a3b8"
                            />
                        </View>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalCancelButton]}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={[styles.modalButtonText, styles.modalCancelText]}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalConfirmButton]}
                                onPress={handleUpdateProfile}
                            >
                                <Text style={[styles.modalButtonText, styles.modalConfirmText]}>
                                    Save
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default Profile;