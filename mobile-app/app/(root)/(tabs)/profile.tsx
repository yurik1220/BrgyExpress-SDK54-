import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import axios from 'axios';
import { styles, getStatusStyle } from '@/styles/profile_styles';

interface UserData {
    id: string;
    name: string;
    clerk_id: string;
    requests_completed: number;
    requests_pending: number;
    member_since: string;
}

const Profile = () => {
    const router = useRouter();
    const { signOut, userId } = useAuth();
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
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

                const response = await axios.get(`http://192.168.254.106:5000/api/users/${userId}`);
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
                `http://192.168.254.106:5000/api/users/${userId}`,
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
                style={styles.gradientBackground}
            />

            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={handleEditProfile}
                    >
                        <Feather name="edit" size={24} color="#3b82f6" />
                    </TouchableOpacity>
                </View>

                <View style={styles.profileContainer}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user.name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.name}>{user.name}</Text>
                    <Text style={styles.phone}>ID: {user.clerk_id}</Text>
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Account Settings</Text>

                <TouchableOpacity style={styles.optionButton}>
                    <View style={styles.optionTextContainer}>
                        <MaterialIcons
                            name="notifications"
                            size={24}
                            color="#3b82f6"
                            style={styles.optionIcon}
                        />
                        <Text style={styles.optionText}>Notification Settings</Text>
                    </View>
                    <MaterialIcons
                        name="chevron-right"
                        size={24}
                        style={styles.optionArrow}
                    />
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionButton}>
                    <View style={styles.optionTextContainer}>
                        <MaterialCommunityIcons
                            name="shield-account"
                            size={24}
                            color="#3b82f6"
                            style={styles.optionIcon}
                        />
                        <Text style={styles.optionText}>Privacy & Security</Text>
                    </View>
                    <MaterialIcons
                        name="chevron-right"
                        size={24}
                        style={styles.optionArrow}
                    />
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionButton}>
                    <View style={styles.optionTextContainer}>
                        <MaterialIcons
                            name="help-outline"
                            size={24}
                            color="#3b82f6"
                            style={styles.optionIcon}
                        />
                        <Text style={styles.optionText}>Help & Support</Text>
                    </View>
                    <MaterialIcons
                        name="chevron-right"
                        size={24}
                        style={styles.optionArrow}
                    />
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionButton}>
                    <View style={styles.optionTextContainer}>
                        <MaterialIcons
                            name="info-outline"
                            size={24}
                            color="#3b82f6"
                            style={styles.optionIcon}
                        />
                        <Text style={styles.optionText}>About</Text>
                    </View>
                    <MaterialIcons
                        name="chevron-right"
                        size={24}
                        style={styles.optionArrow}
                    />
                </TouchableOpacity>

                <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'white' }}>
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={showLogoutConfirmation}
                    >
                        <MaterialIcons
                            name="logout"
                            size={20}
                            color="#ef4444"
                            style={styles.optionIcon}
                        />
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
                <View style={styles.modalContainer}>
                    <MaterialIcons
                        name="warning"
                        size={48}
                        color="#f59e0b"
                        style={{ alignSelf: 'center', marginBottom: 16 }}
                    />
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
                </View>
            </Modal>

            {/* Edit Profile Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={editModalVisible}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Edit Profile</Text>
                    <TextInput
                        style={styles.input}
                        value={tempName}
                        onChangeText={setTempName}
                        placeholder="Enter your name"
                    />
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
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default Profile;