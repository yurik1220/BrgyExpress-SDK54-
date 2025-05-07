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
}

type StatusFilter = 'all' | 'pending' | 'completed';
type RequestType = 'Document Request' | 'Create ID' | 'Incident Report';

const Activity = () => {
    const { userId } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
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
                appointment_date: item.appointment_date
            }
        });
    };

    const filteredTransactions = transactions.filter(transaction => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'pending') return !transaction.status || transaction.status === 'pending';
        if (statusFilter === 'completed') return transaction.status && transaction.status !== 'pending';
        return true;
    });

    const groupedTransactions = filteredTransactions.reduce((acc, transaction) => {
        const type = transaction.type as RequestType;
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(transaction);
        return acc;
    }, {} as Record<RequestType, Transaction[]>);

    const sectionData = Object.entries(groupedTransactions).map(([title, data]) => ({
        title,
        data
    }));

    const renderTransaction = ({ item }: { item: Transaction }) => {
        const statusStyle = getStatusStyle(item.status);

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => handlePressItem(item)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.typeContainer}>
                        <Ionicons 
                            name={item.type === "Document Request" ? "document-text-outline" : 
                                  item.type === "Create ID" ? "card-outline" : "warning-outline"} 
                            size={24} 
                            color="#3b82f6" 
                            style={styles.typeIcon}
                        />
                        <Text style={styles.typeText}>
                            {item.type}
                            {item.title && `: ${item.title}`}
                        </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
                </View>

                <View style={styles.detailsContainer}>
                    {item.type === "Document Request" && (
                        <>
                            <View style={styles.detailRow}>
                                <Ionicons name="document-outline" size={16} color="#64748b" />
                                <Text style={styles.detailText}>Document: {item.document_type}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Ionicons name="help-circle-outline" size={16} color="#64748b" />
                                <Text style={styles.detailText}>Reason: {item.reason}</Text>
                            </View>
                        </>
                    )}
                    {item.type === "Create ID" && (
                        <>
                            <View style={styles.detailRow}>
                                <Ionicons name="person-outline" size={16} color="#64748b" />
                                <Text style={styles.detailText}>Name: {item.full_name}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Ionicons name="calendar-outline" size={16} color="#64748b" />
                                <Text style={styles.detailText}>Birthdate: {item.birth_date}</Text>
                            </View>
                        </>
                    )}
                    {item.type === "Incident Report" && (
                        <>
                            <View style={styles.detailRow}>
                                <Ionicons name="alert-circle-outline" size={16} color="#64748b" />
                                <Text style={styles.detailText}>Title: {item.title}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Ionicons name="chatbubble-outline" size={16} color="#64748b" />
                                <Text style={styles.detailText}>
                                    Description: {item.description?.substring(0, 50) ?? ''}
                                    {(item.description?.length ?? 0) > 50 ? '...' : ''}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                <View style={styles.footerContainer}>
                    <View style={styles.timestampContainer}>
                        <Ionicons name="time-outline" size={16} color="#64748b" />
                        <Text style={styles.timestampText}>
                            {new Date(item.created_at).toLocaleString()}
                        </Text>
                    </View>

                    {item.status && (
                        <View style={[styles.statusContainer, statusStyle.container]}>
                            <Text style={[styles.statusText, statusStyle.text]}>
                                {item.status.toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>

                {item.status?.toLowerCase() === 'approved' && item.appointment_date && (
                    <View style={styles.appointmentContainer}>
                        <Ionicons name="calendar-outline" size={16} color="#059669" />
                        <Text style={styles.appointmentText}>
                            Pickup Date: {new Date(item.appointment_date).toLocaleString()}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderSectionHeader = ({ section }: { section: { title: string } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>
                {section.title.toUpperCase()}
            </Text>
        </View>
    );

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        
        // Show tab bar when scrolling up, hide when scrolling down
        if (currentScrollY < lastScrollY.current) {
            setIsTabBarVisible(true);
        } else if (currentScrollY > 100) { // Only hide after scrolling down a bit
            setIsTabBarVisible(false);
        }
        
        lastScrollY.current = currentScrollY;
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'right', 'left']}>
            <LinearGradient
                colors={['#f0f9ff', '#e0f2fe', '#bae6fd']}
                style={styles.gradientBackground}
            />
            <Animated.View 
                entering={FadeIn.duration(1000)}
                style={styles.floatingDecoration} 
            />
            <Animated.View 
                entering={FadeIn.duration(1000).delay(200)}
                style={styles.floatingDecoration2} 
            />

            <View style={styles.contentContainer}>
                <Animated.View 
                    entering={FadeInDown.duration(800).springify()}
                    style={styles.headerContainer}
                >
                    <Text style={styles.header}>Your Activity</Text>
                    <Text style={styles.subheader}>Track your requests and reports</Text>
                </Animated.View>

                {/* Status Filter Tabs */}
                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[styles.filterButton, statusFilter === 'all' && styles.activeFilter]}
                        onPress={() => setStatusFilter('all')}
                        activeOpacity={0.7}
                    >
                        <Ionicons 
                            name="apps-outline" 
                            size={20} 
                            color={statusFilter === 'all' ? '#ffffff' : '#64748b'} 
                            style={styles.filterIcon}
                        />
                        <Text style={[styles.filterText, statusFilter === 'all' && styles.activeFilterText]}>
                            All
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, statusFilter === 'pending' && styles.activeFilter]}
                        onPress={() => setStatusFilter('pending')}
                        activeOpacity={0.7}
                    >
                        <Ionicons 
                            name="time-outline" 
                            size={20} 
                            color={statusFilter === 'pending' ? '#ffffff' : '#64748b'} 
                            style={styles.filterIcon}
                        />
                        <Text style={[styles.filterText, statusFilter === 'pending' && styles.activeFilterText]}>
                            Pending
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, statusFilter === 'completed' && styles.activeFilter]}
                        onPress={() => setStatusFilter('completed')}
                        activeOpacity={0.7}
                    >
                        <Ionicons 
                            name="checkmark-circle-outline" 
                            size={20} 
                            color={statusFilter === 'completed' ? '#ffffff' : '#64748b'} 
                            style={styles.filterIcon}
                        />
                        <Text style={[styles.filterText, statusFilter === 'completed' && styles.activeFilterText]}>
                            Completed
                        </Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#3b82f6" />
                    </View>
                ) : (
                    <SectionList
                        sections={sectionData}
                        keyExtractor={(item) => `type-${item.type}-id-${item.id}`}
                        renderItem={renderTransaction}
                        renderSectionHeader={renderSectionHeader}
                        contentContainerStyle={styles.sectionListContent}
                        stickySectionHeadersEnabled={false}
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
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

export default Activity;