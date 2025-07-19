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
import Animated, { FadeIn, FadeInDown, SlideInUp, FadeInRight } from "react-native-reanimated";
import { useTabBarVisibility } from "./_layout";

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

const typeTabData: { label: string; value: RequestTypeFilter; icon: any; color: string; gradient: string[] }[] = [
    { label: 'Documents', value: 'Document Request', icon: 'document-text', color: '#667eea', gradient: ['#667eea', '#764ba2'] },
    { label: 'Incidents', value: 'Incident Report', icon: 'warning', color: '#f59e0b', gradient: ['#f59e0b', '#d97706'] },
    { label: 'ID Requests', value: 'Create ID', icon: 'card', color: '#10b981', gradient: ['#10b981', '#059669'] },
];

const statusTabData: { label: string; value: StatusFilter; color: string; bgColor: string }[] = [
    { label: 'All', value: 'all', color: '#64748b', bgColor: '#f8fafc' },
    { label: 'Pending', value: 'pending', color: '#f59e0b', bgColor: '#fef3c7' },
    { label: 'Completed', value: 'completed', color: '#10b981', bgColor: '#d1fae5' },
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

    const getTypeIcon = (type: string) => {
        const tabData = typeTabData.find(tab => tab.value === type);
        return tabData?.icon || 'document-text';
    };

    const getTypeColor = (type: string) => {
        const tabData = typeTabData.find(tab => tab.value === type);
        return tabData?.color || '#667eea';
    };

    const getTypeGradient = (type: string) => {
        const tabData = typeTabData.find(tab => tab.value === type);
        return tabData?.gradient || ['#667eea', '#764ba2'];
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays - 1} days ago`;
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    const getStatusBadgeStyle = (status: string | undefined) => {
        switch (status?.toLowerCase()) {
            case 'approved':
                return {
                    backgroundColor: '#d1fae5',
                    borderColor: '#10b981',
                    textColor: '#065f46'
                };
            case 'rejected':
                return {
                    backgroundColor: '#fee2e2',
                    borderColor: '#ef4444',
                    textColor: '#991b1b'
                };
            case 'pending':
            default:
                return {
                    backgroundColor: '#fef3c7',
                    borderColor: '#f59e0b',
                    textColor: '#92400e'
                };
        }
    };

    const renderCard = (item: Transaction, index: number) => {
        const typeColor = getTypeColor(item.type);
        const typeIcon = getTypeIcon(item.type);
        const typeGradient = getTypeGradient(item.type);
        const statusBadgeStyle = getStatusBadgeStyle(item.status);
        
        return (
            <Animated.View 
                entering={FadeInRight.duration(600).delay(index * 100).springify()}
                key={item.id}
            >
                <TouchableOpacity
                    style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 20,
                        marginBottom: 12,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.08,
                        shadowRadius: 16,
                        elevation: 8,
                        padding: 20,
                        borderWidth: 1,
                        borderColor: 'rgba(0, 0, 0, 0.03)',
                    }}
                    onPress={() => handlePressItem(item)}
                    activeOpacity={0.95}
                >
                    {/* Header with Icon and Status */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <LinearGradient
                            colors={typeGradient as [string, string]}
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 14,
                                shadowColor: typeColor,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.2,
                                shadowRadius: 8,
                                elevation: 4,
                            }}
                        >
                            <Ionicons name={typeIcon} size={24} color="#ffffff" />
                        </LinearGradient>
                        
                        <View style={{ flex: 1 }}>
                            <Text style={{ 
                                fontWeight: '700', 
                                fontSize: 18, 
                                color: '#1f2937',
                                marginBottom: 4,
                                letterSpacing: -0.2
                            }}>
                                {item.type === 'Create ID' ? 'ID Request' : item.type}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="time-outline" size={12} color="#9ca3af" style={{ marginRight: 4 }} />
                                <Text style={{ 
                                    color: '#6b7280', 
                                    fontSize: 13,
                                    fontWeight: '500'
                                }}>
                                    {formatDate(item.created_at)}
                                </Text>
                            </View>
                        </View>

                        {item.reference_number && (
                            <View style={{ 
                                backgroundColor: '#f8fafc', 
                                borderRadius: 12, 
                                paddingHorizontal: 10, 
                                paddingVertical: 6,
                                borderWidth: 1,
                                borderColor: '#e2e8f0',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 2,
                                elevation: 1,
                            }}>
                                <Text style={{ 
                                    color: '#667eea', 
                                    fontWeight: '600', 
                                    fontSize: 11 
                                }} selectable>
                                    #{item.reference_number}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Content */}
                    <View style={{ marginBottom: 12 }}>
                        <Text style={{ 
                            color: '#374151', 
                            fontSize: 16, 
                            fontWeight: '600',
                            marginBottom: 6,
                            letterSpacing: -0.1
                        }} numberOfLines={1}>
                            {item.type === 'Document Request' && item.document_type}
                            {item.type === 'Create ID' && item.full_name}
                            {item.type === 'Incident Report' && item.title}
                        </Text>
                        
                        <Text style={{ 
                            color: '#6b7280', 
                            fontSize: 14,
                            lineHeight: 20,
                            fontWeight: '400'
                        }} numberOfLines={2}>
                            {item.type === 'Document Request' && `Reason: ${item.reason}`}
                            {item.type === 'Create ID' && `Birth Date: ${item.birth_date}`}
                            {item.type === 'Incident Report' && item.description}
                        </Text>
                    </View>

                    {/* Footer with Status and Time */}
                    <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        paddingTop: 12,
                        borderTopWidth: 1,
                        borderTopColor: '#f1f5f9'
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="time-outline" size={14} color="#9ca3af" style={{ marginRight: 4 }} />
                            <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '500' }}>
                                {new Date(item.created_at).toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                })}
                            </Text>
                        </View>

                        {item.status && (
                            <View style={{
                                backgroundColor: statusBadgeStyle.backgroundColor,
                                borderRadius: 16,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderWidth: 1,
                                borderColor: statusBadgeStyle.borderColor,
                                shadowColor: statusBadgeStyle.borderColor,
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.1,
                                shadowRadius: 2,
                                elevation: 1,
                            }}>
                                <Text style={{ 
                                    color: statusBadgeStyle.textColor, 
                                    fontWeight: '600', 
                                    fontSize: 11,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5
                                }}>
                                    {item.status}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Appointment Date for Approved Requests */}
                    {item.status?.toLowerCase() === 'approved' && item.appointment_date && (
                        <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            marginTop: 12,
                            backgroundColor: '#f0fdf4',
                            borderRadius: 12,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: '#dcfce7',
                            shadowColor: '#10b981',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 2,
                            elevation: 1,
                        }}>
                            <Ionicons name="calendar" size={16} color="#16a34a" style={{ marginRight: 8 }} />
                            <Text style={{ color: '#16a34a', fontSize: 13, fontWeight: '600', flex: 1 }}>
                                Pickup: {new Date(item.appointment_date).toLocaleDateString()} at {new Date(item.appointment_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top', 'right', 'left']}>
            <LinearGradient
                colors={['#f8fafc', '#ffffff']}
                style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
            
            <View style={{ flex: 1, paddingHorizontal: 20 }}>
                {/* Header */}
                <Animated.View 
                    entering={FadeInDown.duration(800).springify()}
                    style={{ alignItems: 'center', marginTop: 16, marginBottom: 20 }}
                >
                    <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={{
                            width: 60,
                            height: 60,
                            borderRadius: 30,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 12,
                            shadowColor: '#667eea',
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.2,
                            shadowRadius: 16,
                            elevation: 8,
                        }}
                    >
                        <Ionicons name="list" size={28} color="#ffffff" />
                    </LinearGradient>
                    <Text style={{ 
                        fontSize: 28, 
                        fontWeight: '800', 
                        color: '#1f2937', 
                        marginBottom: 6,
                        letterSpacing: -0.5
                    }}>
                        Activity
                    </Text>
                    <Text style={{ 
                        fontSize: 15, 
                        color: '#6b7280',
                        textAlign: 'center',
                        lineHeight: 20,
                        fontWeight: '400'
                    }}>
                        Track your requests and reports
                    </Text>
                </Animated.View>

                {/* Request Type Tabs */}
                <Animated.View 
                    entering={FadeInDown.duration(600).delay(200)}
                    style={{ marginBottom: 16 }}
                >
                    <View style={{ 
                        flexDirection: 'row', 
                        backgroundColor: '#f1f5f9',
                        borderRadius: 16,
                        padding: 4,
                        marginBottom: 12,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 1,
                    }}>
                        {typeTabData.map(tab => (
                            <TouchableOpacity
                                key={tab.value}
                                style={{
                                    flex: 1,
                                    backgroundColor: requestTypeFilter === tab.value ? '#ffffff' : 'transparent',
                                    borderRadius: 12,
                                    paddingVertical: 10,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    shadowColor: requestTypeFilter === tab.value ? '#000' : 'transparent',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: requestTypeFilter === tab.value ? 0.1 : 0,
                                    shadowRadius: 6,
                                    elevation: requestTypeFilter === tab.value ? 3 : 0,
                                }}
                                onPress={() => setRequestTypeFilter(tab.value)}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={tab.icon}
                                    size={18}
                                    color={requestTypeFilter === tab.value ? tab.color : '#64748b'}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={{
                                    color: requestTypeFilter === tab.value ? '#1f2937' : '#64748b',
                                    fontWeight: '600',
                                    fontSize: 13
                                }}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {/* Status Filter Pills */}
                <Animated.View 
                    entering={FadeInDown.duration(600).delay(300)}
                    style={{ marginBottom: 20 }}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                        {statusTabData.map(tab => (
                            <TouchableOpacity
                                key={tab.value}
                                style={{
                                    backgroundColor: statusFilter === tab.value ? tab.color : tab.bgColor,
                                    borderRadius: 20,
                                    paddingVertical: 8,
                                    paddingHorizontal: 16,
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: statusFilter === tab.value ? tab.color : '#e2e8f0',
                                    shadowColor: statusFilter === tab.value ? tab.color : 'transparent',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: statusFilter === tab.value ? 0.15 : 0,
                                    shadowRadius: 4,
                                    elevation: statusFilter === tab.value ? 2 : 0,
                                }}
                                onPress={() => setStatusFilter(tab.value)}
                                activeOpacity={0.8}
                            >
                                <Text style={{
                                    color: statusFilter === tab.value ? '#ffffff' : '#64748b',
                                    fontWeight: '600',
                                    fontSize: 13
                                }}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {/* Content */}
                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#667eea" />
                        <Text style={{ color: '#6b7280', fontSize: 16, marginTop: 16, fontWeight: '500' }}>Loading activity...</Text>
                    </View>
                ) : (
                    <Animated.ScrollView
                        entering={FadeIn.duration(400).delay(400)}
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingBottom: 32 }}
                        showsVerticalScrollIndicator={false}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#667eea']}
                                tintColor={'#667eea'}
                            />
                        }
                    >
                        {filteredTransactions.length === 0 ? (
                            <View style={{ 
                                alignItems: 'center', 
                                marginTop: 40,
                                paddingHorizontal: 40
                            }}>
                                <View style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 40,
                                    backgroundColor: '#f1f5f9',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginBottom: 16,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 4,
                                    elevation: 1,
                                }}>
                                    <Ionicons name="file-tray-outline" size={32} color="#cbd5e1" />
                                </View>
                                <Text style={{ 
                                    color: '#64748b', 
                                    fontSize: 18, 
                                    fontWeight: '600',
                                    marginBottom: 8,
                                    textAlign: 'center',
                                    letterSpacing: -0.2
                                }}>
                                    No activity found
                                </Text>
                                <Text style={{ 
                                    color: '#94a3b8', 
                                    fontSize: 14,
                                    textAlign: 'center',
                                    lineHeight: 20,
                                    fontWeight: '400'
                                }}>
                                    Your requests and reports will appear here once you submit them.
                                </Text>
                            </View>
                        ) : (
                            filteredTransactions.map((item, index) => renderCard(item, index))
                        )}
                    </Animated.ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
};

export default Activity;