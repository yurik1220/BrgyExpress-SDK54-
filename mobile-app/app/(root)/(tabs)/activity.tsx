import React from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, SectionList, RefreshControl, Platform, Image, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { styles, getStatusStyle } from "@/styles/activity_styles";
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { initNotificationSystem } from '@/lib/notificationHandler';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTabBarVisibility } from "./_layout";
import { Picker } from '@react-native-picker/picker';

interface Transaction {
    id: string;
    type: string;
    document_type?: string;
    reason?: string;
    full_name?: string;
    birth_date?: string;
    description?: string;
    media_url?: string;
    title?: string;
    created_at: string;
    status?: string;
    appointment_date?: string;
    reference_number?: string;
}

type StatusFilter = 'all' | 'pending' | 'completed';
type RequestTypeFilter = 'Document Request' | 'Incident Report' | 'Create ID';

const typeTabData: { label: string; value: RequestTypeFilter; icon: any }[] = [
    { label: 'Document', value: 'Document Request', icon: 'document-text-outline' },
    { label: 'Incident', value: 'Incident Report', icon: 'warning-outline' },
    { label: 'ID', value: 'Create ID', icon: 'card-outline' },
];

const statusTabData: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Completed', value: 'completed' },
];

const Activity = () => {
    const { userId } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [requestTypeFilter, setRequestTypeFilter] = useState<RequestTypeFilter>('Document Request');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const router = useRouter();
    const navigation = useNavigation();
    const { setIsTabBarVisible } = useTabBarVisibility();
    const lastScrollY = useRef(0);

    useEffect(() => {
        let cleanup: (() => void) | undefined;
        const setupNotifications = async () => {
            try {
                if (userId) {
                    cleanup = await initNotificationSystem(userId, navigation);
                }
            } catch (error) {
                console.error('Notification setup error:', error);
            }
        };
        setupNotifications();
        return () => {
            cleanup?.();
        };
    }, [userId, navigation]);

    const fetchActivity = async () => {
        try {
            const response = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}/api/requests/${userId}`);
            const sortedData = response.data.sort((a: Transaction, b: Transaction) => {
                const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
                const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
            setTransactions(sortedData);
        } catch (error) {
            console.error("Error fetching activity:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchActivity();
    };

    useFocusEffect(
        useCallback(() => {
            fetchActivity();
        }, [userId])
    );

    const handlePressItem = (item: Transaction) => {
        router.push({
            pathname: "/details",
            params: {
                ...item,
                document_type: item.document_type,
                reason: item.reason,
                full_name: item.full_name,
                birth_date: item.birth_date,
                description: item.description,
                media_url: item.media_url,
                title: item.title,
                clerk_id: userId,
                created_at: item.created_at,
                status: item.status || 'pending',
                appointment_date: item.appointment_date,
                reference_number: item.reference_number
            }
        });
    };

    const filteredTransactions = transactions.filter(transaction => {
        if (transaction.type !== requestTypeFilter) return false;
        if (statusFilter === 'all') return true;
        if (statusFilter === 'pending') return !transaction.status || transaction.status === 'pending';
        if (statusFilter === 'completed') return transaction.status && transaction.status !== 'pending';
        return true;
    });

    const renderCard = (item: Transaction) => {
        const statusStyle = getStatusStyle(item.status);
        return (
            <TouchableOpacity
                style={{
                    backgroundColor: '#fff',
                    borderRadius: 18,
                    marginBottom: 18,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 3,
                    padding: 20,
                    minHeight: 120,
                }}
                onPress={() => handlePressItem(item)}
                activeOpacity={0.85}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons
                        name={
                            item.type === 'Document Request' ? 'document-text-outline' :
                            item.type === 'Incident Report' ? 'warning-outline' :
                            'card-outline'
                        }
                        size={22}
                        color="#3b82f6"
                        style={{ marginRight: 8 }}
                    />
                    <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#1e293b', flex: 1 }} numberOfLines={1}>
                        {item.type === 'Create ID' ? 'ID Request' : item.type}
                    </Text>
                    {item.reference_number && (
                        <View style={{ backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 8 }}>
                            <Text style={{ color: '#7F5AF0', fontWeight: 'bold', fontSize: 13 }} selectable>
                                {item.reference_number}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ color: '#64748b', fontSize: 15, flex: 1 }} numberOfLines={1}>
                        {item.type === 'Document Request' && `Document: ${item.document_type}`}
                        {item.type === 'Create ID' && `Name: ${item.full_name}`}
                        {item.type === 'Incident Report' && `Title: ${item.title}`}
                    </Text>
                    {item.status && (
                        <View style={{
                            backgroundColor: statusStyle.container.backgroundColor,
                            borderRadius: 12,
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                            marginLeft: 8
                        }}>
                            <Text style={{ color: statusStyle.text.color, fontWeight: 'bold', fontSize: 13 }}>
                                {item.status.toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Ionicons name="time-outline" size={15} color="#94a3b8" style={{ marginRight: 4 }} />
                    <Text style={{ color: '#64748b', fontSize: 13 }}>
                        {new Date(item.created_at).toLocaleString()}
                    </Text>
                </View>
                {item.type === 'Document Request' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Ionicons name="help-circle-outline" size={15} color="#64748b" style={{ marginRight: 4 }} />
                        <Text style={{ color: '#64748b', fontSize: 13 }} numberOfLines={1}>
                            Reason: {item.reason}
                        </Text>
                    </View>
                )}
                {item.type === 'Create ID' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Ionicons name="calendar-outline" size={15} color="#64748b" style={{ marginRight: 4 }} />
                        <Text style={{ color: '#64748b', fontSize: 13 }} numberOfLines={1}>
                            Birthdate: {item.birth_date}
                        </Text>
                    </View>
                )}
                {item.type === 'Incident Report' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Ionicons name="chatbubble-outline" size={15} color="#64748b" style={{ marginRight: 4 }} />
                        <Text style={{ color: '#64748b', fontSize: 13 }} numberOfLines={1}>
                            {item.description?.substring(0, 50) ?? ''}{(item.description?.length ?? 0) > 50 ? '...' : ''}
                        </Text>
                    </View>
                )}
                {item.status?.toLowerCase() === 'approved' && item.appointment_date && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Ionicons name="calendar-outline" size={15} color="#059669" style={{ marginRight: 4 }} />
                        <Text style={{ color: '#059669', fontSize: 13 }}>
                            Pickup: {new Date(item.appointment_date).toLocaleString()}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        if (currentScrollY < lastScrollY.current) {
            setIsTabBarVisible(true);
        } else if (currentScrollY > 100) {
            setIsTabBarVisible(false);
        }
        lastScrollY.current = currentScrollY;
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top', 'right', 'left']}>
            <LinearGradient
                colors={['#f0f9ff', '#e0f2fe', '#bae6fd']}
                style={{ ...styles.gradientBackground, position: 'absolute', width: '100%', height: '100%' }}
            />
            <View style={{ flex: 1, paddingHorizontal: 0, paddingTop: 0 }}>
                <Animated.View 
                    entering={FadeInDown.duration(800).springify()}
                    style={{ alignItems: 'center', marginTop: 32, marginBottom: 12 }}
                >
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 2 }}>Your Activity</Text>
                    <Text style={{ fontSize: 15, color: '#64748b' }}>Track your requests and reports</Text>
                </Animated.View>
                {/* Main Request Type Tabs */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 10, gap: 8 }}>
                    {typeTabData.map(tab => (
                        <TouchableOpacity
                            key={tab.value}
                            style={{
                                flex: 1,
                                backgroundColor: requestTypeFilter === tab.value ? '#3b82f6' : '#f1f5f9',
                                borderRadius: 24,
                                marginHorizontal: 4,
                                paddingVertical: 10,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                shadowColor: requestTypeFilter === tab.value ? '#3b82f6' : 'transparent',
                                shadowOpacity: requestTypeFilter === tab.value ? 0.15 : 0,
                                shadowRadius: 8,
                                elevation: requestTypeFilter === tab.value ? 2 : 0,
                            }}
                            onPress={() => setRequestTypeFilter(tab.value)}
                            activeOpacity={0.85}
                        >
                            <Ionicons
                                name={tab.icon}
                                size={20}
                                color={requestTypeFilter === tab.value ? '#fff' : '#64748b'}
                                style={{ marginRight: 8 }}
                            />
                            <Text style={{
                                color: requestTypeFilter === tab.value ? '#fff' : '#64748b',
                                fontWeight: 'bold',
                                fontSize: 15
                            }}>{tab.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {/* Status Filter Pills */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 18, gap: 8 }}>
                    {statusTabData.map(tab => (
                        <TouchableOpacity
                            key={tab.value}
                            style={{
                                backgroundColor: statusFilter === tab.value ? '#7F5AF0' : '#f1f5f9',
                                borderRadius: 18,
                                paddingVertical: 7,
                                paddingHorizontal: 22,
                                marginHorizontal: 2,
                                alignItems: 'center',
                                shadowColor: statusFilter === tab.value ? '#7F5AF0' : 'transparent',
                                shadowOpacity: statusFilter === tab.value ? 0.12 : 0,
                                shadowRadius: 6,
                                elevation: statusFilter === tab.value ? 2 : 0,
                            }}
                            onPress={() => setStatusFilter(tab.value)}
                            activeOpacity={0.85}
                        >
                            <Text style={{
                                color: statusFilter === tab.value ? '#fff' : '#64748b',
                                fontWeight: 'bold',
                                fontSize: 14
                            }}>{tab.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#3b82f6" />
                    </View>
                ) : (
                    <Animated.ScrollView
                        entering={FadeIn.duration(400)}
                        style={{ flex: 1, paddingHorizontal: 18 }}
                        contentContainerStyle={{ paddingBottom: 32 }}
                        showsVerticalScrollIndicator={false}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#3b82f6']}
                                tintColor={'#3b82f6'}
                            />
                        }
                    >
                        {filteredTransactions.length === 0 ? (
                            <View style={{ alignItems: 'center', marginTop: 48 }}>
                                <Ionicons name="file-tray-outline" size={48} color="#cbd5e1" />
                                <Text style={{ color: '#64748b', fontSize: 16, marginTop: 8 }}>No activity found.</Text>
                            </View>
                        ) : (
                            filteredTransactions.map(item => (
                                <Animated.View key={item.id} entering={FadeInDown.duration(400).springify()}>
                                    {renderCard(item)}
                                </Animated.View>
                            ))
                        )}
                    </Animated.ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
};

export default Activity;