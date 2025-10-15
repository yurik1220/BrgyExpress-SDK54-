import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    Dimensions
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
    FadeInRight
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
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tempName, setTempName] = useState('');

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

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={{ color: '#6b7280', fontSize: 16, marginTop: 16, fontWeight: '500' }}>Loading profile...</Text>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: '#fef2f2',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 16,
                    shadowColor: '#ef4444',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 2,
                }}>
                    <Ionicons name="alert-circle" size={32} color="#ef4444" />
                </View>
                <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Error Loading Profile</Text>
                <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>{error}</Text>
                <TouchableOpacity
                    style={{
                        backgroundColor: '#667eea',
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 12,
                        shadowColor: '#667eea',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                        elevation: 4,
                    }}
                    onPress={() => {
                        setLoading(true);
                        setError(null);
                    }}
                >
                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (!user) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#6b7280', fontSize: 16 }}>No user data available</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'right', 'left', 'bottom']}>
            <LinearGradient
                colors={['#f8fafc', '#ffffff']}
                style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
            
            <View style={{ flex: 1, paddingHorizontal: 20 }}>
                {/* Header: Blue rectangle (edge-to-edge) */}
                <Animated.View 
                    entering={FadeInDown.duration(800).springify()}
                    style={{ marginBottom: 12 }}
                >
                    <LinearGradient
                        colors={[ 'rgba(59,130,246,0.92)', 'rgba(99,102,241,0.92)' ]}
                        style={{
                            borderBottomLeftRadius: 24,
                            borderBottomRightRadius: 24,
                            paddingTop: 28,
                            paddingBottom: 20,
                            paddingHorizontal: 20,
                            marginHorizontal: -20,
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#3b82f6',
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.2,
                            shadowRadius: 16,
                            elevation: 8,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                                width: 56,
                                height: 56,
                                borderRadius: 28,
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 10,
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.25)'
                            }}>
                                <Ionicons name="person" size={28} color="#ffffff" />
                            </View>
                            <View>
                                <Text style={{ 
                                    fontSize: 26, 
                                    fontWeight: '800', 
                                    color: '#ffffff', 
                                    letterSpacing: -0.5
                                }}>
                                    Profile
                                </Text>
                                <Text style={{ 
                                    fontSize: 14, 
                                    color: 'rgba(255,255,255,0.9)',
                                    lineHeight: 18,
                                    fontWeight: '500'
                                }}>
                                    Manage your account and preferences
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Profile Card */}
                <Animated.View 
                    entering={FadeInDown.duration(600).delay(100).springify()}
                    style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 20,
                        padding: 20,
                        marginBottom: 20,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.08,
                        shadowRadius: 16,
                        elevation: 8,
                        borderWidth: 1,
                        borderColor: 'rgba(0, 0, 0, 0.03)',
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: 28,
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 16,
                                shadowColor: '#667eea',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.2,
                                shadowRadius: 8,
                                elevation: 4,
                            }}
                        >
                            <Text style={{ fontSize: 24, fontWeight: '700', color: '#ffffff' }}>
                                {user.name.charAt(0).toUpperCase()}
                            </Text>
                        </LinearGradient>
                        
                        <View style={{ flex: 1 }}>
                            <Text style={{ 
                                fontSize: 20, 
                                fontWeight: '700', 
                                color: '#1f2937',
                                marginBottom: 4,
                                letterSpacing: -0.3
                            }}>
                                {user.name}
                            </Text>
                            <Text style={{ 
                                color: '#6b7280', 
                                fontSize: 14,
                                fontWeight: '500'
                            }}>
                                ID: {user.clerk_id.slice(-8)}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: '#f8fafc',
                                justifyContent: 'center',
                                alignItems: 'center',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.05,
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                            onPress={handleEditProfile}
                        >
                            <Feather name="edit" size={18} color="#667eea" />
                        </TouchableOpacity>
                    </View>

                    {/* Stats Row */}
                    <View style={{ 
                        flexDirection: 'row', 
                        backgroundColor: '#f8fafc',
                        borderRadius: 16,
                        padding: 16,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 2,
                    }}>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ 
                                fontSize: 24, 
                                fontWeight: '800', 
                                color: '#10b981',
                                marginBottom: 4
                            }}>
                                {user.requests_completed}
                            </Text>
                            <Text style={{ 
                                color: '#6b7280', 
                                fontSize: 12,
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5
                            }}>
                                Completed
                            </Text>
                        </View>
                        
                        <View style={{ 
                            width: 1, 
                            backgroundColor: '#e5e7eb',
                            marginHorizontal: 8
                        }} />
                        
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ 
                                fontSize: 24, 
                                fontWeight: '800', 
                                color: '#f59e0b',
                                marginBottom: 4
                            }}>
                                {user.requests_pending}
                            </Text>
                            <Text style={{ 
                                color: '#6b7280', 
                                fontSize: 12,
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5
                            }}>
                                Pending
                            </Text>
                        </View>
                        
                        <View style={{ 
                            width: 1, 
                            backgroundColor: '#e5e7eb',
                            marginHorizontal: 8
                        }} />
                        
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ 
                                fontSize: 16, 
                                fontWeight: '700', 
                                color: '#667eea',
                                marginBottom: 4
                            }}>
                                {new Date(user.member_since).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    year: 'numeric' 
                                })}
                            </Text>
                            <Text style={{ 
                                color: '#6b7280', 
                                fontSize: 12,
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5
                            }}>
                                Member Since
                            </Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Quick Actions */}
                <Animated.View 
                    entering={FadeInDown.duration(600).delay(200).springify()}
                    style={{ marginBottom: 20 }}
                >
                    <Text style={{ 
                        fontSize: 18, 
                        fontWeight: '700', 
                        color: '#1f2937',
                        marginBottom: 16,
                        letterSpacing: -0.3
                    }}>
                        Quick Actions
                    </Text>

                    <View style={{ 
                        flexDirection: 'row', 
                        gap: 12,
                        marginBottom: 16
                    }}>
                        <TouchableOpacity style={{
                            flex: 1,
                            backgroundColor: '#ffffff',
                            borderRadius: 16,
                            padding: 20,
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.08,
                            shadowRadius: 8,
                            elevation: 4,
                            borderWidth: 1,
                            borderColor: 'rgba(0, 0, 0, 0.03)',
                        }}>
                            <View style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: '#f0f9ff',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: 12,
                            }}>
                                <Ionicons name="notifications-outline" size={24} color="#0ea5e9" />
                            </View>
                            <Text style={{ 
                                color: '#1f2937', 
                                fontSize: 14,
                                fontWeight: '600',
                                textAlign: 'center'
                            }}>
                                Notifications
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={{
                            flex: 1,
                            backgroundColor: '#ffffff',
                            borderRadius: 16,
                            padding: 20,
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.08,
                            shadowRadius: 8,
                            elevation: 4,
                            borderWidth: 1,
                            borderColor: 'rgba(0, 0, 0, 0.03)',
                        }}>
                            <View style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: '#fef3c7',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: 12,
                            }}>
                                <MaterialCommunityIcons name="shield-account" size={24} color="#f59e0b" />
                            </View>
                            <Text style={{ 
                                color: '#1f2937', 
                                fontSize: 14,
                                fontWeight: '600',
                                textAlign: 'center'
                            }}>
                                Privacy
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={{
                            flex: 1,
                            backgroundColor: '#ffffff',
                            borderRadius: 16,
                            padding: 20,
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.08,
                            shadowRadius: 8,
                            elevation: 4,
                            borderWidth: 1,
                            borderColor: 'rgba(0, 0, 0, 0.03)',
                        }}>
                            <View style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: '#f0fdf4',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: 12,
                            }}>
                                <Ionicons name="help-circle-outline" size={24} color="#10b981" />
                            </View>
                            <Text style={{ 
                                color: '#1f2937', 
                                fontSize: 14,
                                fontWeight: '600',
                                textAlign: 'center'
                            }}>
                                Help
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ 
                        flexDirection: 'row', 
                        gap: 12
                    }}>
                        <TouchableOpacity 
                            style={{
                                flex: 1,
                                backgroundColor: '#ffffff',
                                borderRadius: 16,
                                padding: 20,
                                alignItems: 'center',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.08,
                                shadowRadius: 8,
                                elevation: 4,
                                borderWidth: 1,
                                borderColor: 'rgba(0, 0, 0, 0.03)',
                            }}
                            onPress={() => setSettingsModalVisible(true)}
                        >
                            <View style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: '#f8fafc',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: 12,
                            }}>
                                <Ionicons name="settings-outline" size={24} color="#667eea" />
                            </View>
                            <Text style={{ 
                                color: '#1f2937', 
                                fontSize: 14,
                                fontWeight: '600',
                                textAlign: 'center'
                            }}>
                                Settings
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={{
                                flex: 1,
                                backgroundColor: '#ffffff',
                                borderRadius: 16,
                                padding: 20,
                                alignItems: 'center',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.08,
                                shadowRadius: 8,
                                elevation: 4,
                                borderWidth: 1,
                                borderColor: 'rgba(0, 0, 0, 0.03)',
                            }}
                            onPress={showLogoutConfirmation}
                        >
                            <View style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: '#fef2f2',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: 12,
                            }}>
                                <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                            </View>
                            <Text style={{ 
                                color: '#ef4444', 
                                fontSize: 14,
                                fontWeight: '600',
                                textAlign: 'center'
                            }}>
                                Log Out
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>

            {/* Logout Confirmation Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={logoutModalVisible}
                onRequestClose={() => setLogoutModalVisible(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                }}>
                    <Animated.View 
                        entering={FadeIn.duration(200)}
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: 20,
                            padding: 24,
                            width: '100%',
                            maxWidth: 320,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 20 },
                            shadowOpacity: 0.25,
                            shadowRadius: 25,
                            elevation: 10,
                        }}
                    >
                        <View style={{
                            width: 60,
                            height: 60,
                            borderRadius: 30,
                            backgroundColor: '#fef3c7',
                            justifyContent: 'center',
                            alignItems: 'center',
                            alignSelf: 'center',
                            marginBottom: 16,
                        }}>
                            <Ionicons name="warning" size={28} color="#f59e0b" />
                        </View>
                        <Text style={{ 
                            fontSize: 20, 
                            fontWeight: '700', 
                            color: '#1f2937',
                            textAlign: 'center',
                            marginBottom: 8,
                        }}>
                            Log Out
                        </Text>
                        <Text style={{ 
                            color: '#6b7280', 
                            fontSize: 14,
                            textAlign: 'center',
                            lineHeight: 20,
                            marginBottom: 24,
                        }}>
                            Are you sure you want to log out? You'll need to sign in again to access your account.
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#f8fafc',
                                    borderRadius: 12,
                                    paddingVertical: 12,
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: '#e5e7eb',
                                }}
                                onPress={() => setLogoutModalVisible(false)}
                            >
                                <Text style={{ 
                                    color: '#6b7280', 
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#ef4444',
                                    borderRadius: 12,
                                    paddingVertical: 12,
                                    alignItems: 'center',
                                    shadowColor: '#ef4444',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }}
                                onPress={handleLogout}
                            >
                                <Text style={{ 
                                    color: '#ffffff', 
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>
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
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                }}>
                    <Animated.View 
                        entering={FadeInDown.duration(300).springify()}
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: 20,
                            padding: 24,
                            width: '100%',
                            maxWidth: 320,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 20 },
                            shadowOpacity: 0.25,
                            shadowRadius: 25,
                            elevation: 10,
                        }}
                    >
                        <Text style={{ 
                            fontSize: 20, 
                            fontWeight: '700', 
                            color: '#1f2937',
                            textAlign: 'center',
                            marginBottom: 20,
                        }}>
                            Edit Profile
                        </Text>
                        <View style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            marginBottom: 24,
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                        }}>
                            <TextInput
                                style={{
                                    fontSize: 16,
                                    color: '#1f2937',
                                    fontWeight: '500',
                                }}
                                value={tempName}
                                onChangeText={setTempName}
                                placeholder="Enter your name"
                                placeholderTextColor="#9ca3af"
                            />
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#f8fafc',
                                    borderRadius: 12,
                                    paddingVertical: 12,
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: '#e5e7eb',
                                }}
                                onPress={() => setEditModalVisible(false)}
                            >
                                <Text style={{ 
                                    color: '#6b7280', 
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#667eea',
                                    borderRadius: 12,
                                    paddingVertical: 12,
                                    alignItems: 'center',
                                    shadowColor: '#667eea',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }}
                                onPress={handleUpdateProfile}
                            >
                                <Text style={{ 
                                    color: '#ffffff', 
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>
                                    Save
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* Settings Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={settingsModalVisible}
                onRequestClose={() => setSettingsModalVisible(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                }}>
                    <Animated.View 
                        entering={FadeInDown.duration(300).springify()}
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: 20,
                            padding: 24,
                            width: '100%',
                            maxWidth: 320,
                            maxHeight: 400,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 20 },
                            shadowOpacity: 0.25,
                            shadowRadius: 25,
                            elevation: 10,
                        }}
                    >
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 20,
                        }}>
                            <Text style={{ 
                                fontSize: 20, 
                                fontWeight: '700', 
                                color: '#1f2937',
                            }}>
                                Settings
                            </Text>
                            <TouchableOpacity
                                onPress={() => setSettingsModalVisible(false)}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: '#f8fafc',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <Ionicons name="close" size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={{ gap: 12 }}>
                            <TouchableOpacity style={{
                                backgroundColor: '#f8fafc',
                                borderRadius: 12,
                                padding: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: '#f0f9ff',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 12,
                                }}>
                                    <Ionicons name="notifications-outline" size={20} color="#0ea5e9" />
                                </View>
                                <Text style={{ 
                                    flex: 1,
                                    color: '#1f2937', 
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>
                                    Notification Settings
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                            </TouchableOpacity>

                            <TouchableOpacity style={{
                                backgroundColor: '#f8fafc',
                                borderRadius: 12,
                                padding: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: '#fef3c7',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 12,
                                }}>
                                    <MaterialCommunityIcons name="shield-account" size={20} color="#f59e0b" />
                                </View>
                                <Text style={{ 
                                    flex: 1,
                                    color: '#1f2937', 
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>
                                    Privacy & Security
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                            </TouchableOpacity>

                            <TouchableOpacity style={{
                                backgroundColor: '#f8fafc',
                                borderRadius: 12,
                                padding: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: '#f0fdf4',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 12,
                                }}>
                                    <Ionicons name="help-circle-outline" size={20} color="#10b981" />
                                </View>
                                <Text style={{ 
                                    flex: 1,
                                    color: '#1f2937', 
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>
                                    Help & Support
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                            </TouchableOpacity>

                            <TouchableOpacity style={{
                                backgroundColor: '#f8fafc',
                                borderRadius: 12,
                                padding: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: '#f8fafc',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 12,
                                }}>
                                    <Ionicons name="information-circle-outline" size={20} color="#667eea" />
                                </View>
                                <Text style={{ 
                                    flex: 1,
                                    color: '#1f2937', 
                                    fontSize: 16,
                                    fontWeight: '600'
                                }}>
                                    About App
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default Profile;