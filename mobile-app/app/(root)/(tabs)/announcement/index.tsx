import { View, FlatList, TouchableOpacity, Text, RefreshControl, NativeScrollEvent, NativeSyntheticEvent, Image } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator } from "react-native-paper";
import { styles } from "@/styles/announce_styles";
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useState, useRef } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
    FadeInDown, 
    FadeIn, 
    FadeInRight,
    useSharedValue, 
    useAnimatedStyle,
    withSpring,
    interpolate
} from "react-native-reanimated";
import { useTabBarVisibility } from "../_layout";
import axios from "axios";

interface Announcement {
    id: number;
    title: string;
    content: string;
    priority: string;
    created_at: string;
    category?: string;
    media_url?: string;
}

export default function AnnouncementsList() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const { setIsTabBarVisible } = useTabBarVisibility();
    const lastScrollY = useRef(0);
    const scrollY = useSharedValue(0);
    const flatListRef = useRef<FlatList>(null);

    const { data: announcements, isLoading, refetch } = useQuery({
        queryKey: ['announcements'],
        queryFn: async () => {
            const res = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}/api/announcements`);
            return res.data;
        }
    });

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await refetch();
        } finally {
            setRefreshing(false);
        }
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        scrollY.value = currentScrollY;
        
        // Show tab bar when scrolling up, hide when scrolling down
        if (currentScrollY < lastScrollY.current) {
            setIsTabBarVisible(true);
        } else if (currentScrollY > 100) { // Only hide after scrolling down a bit
            setIsTabBarVisible(false);
        }
        
        lastScrollY.current = currentScrollY;
    };

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={{ color: '#6b7280', fontSize: 16, marginTop: 16, fontWeight: '500' }}>Loading announcements...</Text>
            </SafeAreaView>
        );
    }

    const getPriorityConfig = (priority: string) => {
        const priorityConfig = {
            high: { 
                color: '#ef4444', 
                icon: 'alert-circle' as const, 
                text: 'Urgent',
                gradient: ['#ef4444', '#dc2626'],
                bgColor: '#fef2f2',
                borderColor: '#fecaca'
            },
            medium: { 
                color: '#f59e0b', 
                icon: 'alert' as const, 
                text: 'Important',
                gradient: ['#f59e0b', '#d97706'],
                bgColor: '#fffbeb',
                borderColor: '#fed7aa'
            },
            low: { 
                color: '#10b981', 
                icon: 'information-circle' as const, 
                text: 'Info',
                gradient: ['#10b981', '#059669'],
                bgColor: '#f0fdf4',
                borderColor: '#bbf7d0'
            }
        };

        return priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.low;
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

    const renderItem = ({ item, index }: { item: Announcement; index: number }) => {
        const priorityConfig = getPriorityConfig(item.priority);
        
        return (
            <Animated.View 
                entering={FadeInRight.duration(600).delay(index * 100).springify()}
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
                    onPress={() => router.push(`/announcement/${item.id}`)}
                    activeOpacity={0.95}
                >
                    {/* Header with Priority Badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <LinearGradient
                            colors={priorityConfig.gradient as [string, string]}
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginRight: 14,
                                shadowColor: priorityConfig.color,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.2,
                                shadowRadius: 8,
                                elevation: 4,
                            }}
                        >
                            <Ionicons name={priorityConfig.icon} size={24} color="#ffffff" />
                        </LinearGradient>
                        
                        <View style={{ flex: 1 }}>
                            <Text style={{ 
                                fontWeight: '700', 
                                fontSize: 18, 
                                color: '#1f2937',
                                marginBottom: 4,
                                letterSpacing: -0.2
                            }} numberOfLines={2}>
                                {item.title}
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

                        <View style={{
                            backgroundColor: priorityConfig.bgColor,
                            borderRadius: 16,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderWidth: 1,
                            borderColor: priorityConfig.borderColor,
                            shadowColor: priorityConfig.color,
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.1,
                            shadowRadius: 2,
                            elevation: 1,
                        }}>
                            <Text style={{ 
                                color: priorityConfig.color, 
                                fontWeight: '600', 
                                fontSize: 11,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5
                            }}>
                                {priorityConfig.text}
                            </Text>
                        </View>
                    </View>

                    {/* Content */}
                    <View style={{ marginBottom: item.media_url ? 16 : 0 }}>
                        <Text style={{ 
                            color: '#6b7280', 
                            fontSize: 14,
                            lineHeight: 20,
                            fontWeight: '400'
                        }} numberOfLines={3}>
                            {item.content}
                        </Text>
                    </View>

                    {/* Media */}
                    {item.media_url && (
                        <View style={{
                            borderRadius: 16,
                            overflow: 'hidden',
                            marginBottom: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 4,
                        }}>
                            <Image
                                source={{ uri: `${process.env.EXPO_PUBLIC_API_URL}${item.media_url}` }}
                                style={{
                                    width: '100%',
                                    height: 200,
                                }}
                                resizeMode="cover"
                            />
                        </View>
                    )}

                    {/* Footer with Category and Chevron */}
                    <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        paddingTop: 12,
                        borderTopWidth: 1,
                        borderTopColor: '#f1f5f9'
                    }}>
                        {item.category && (
                            <View style={{
                                backgroundColor: '#f0f9ff',
                                borderRadius: 12,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderWidth: 1,
                                borderColor: '#bae6fd',
                                shadowColor: '#0ea5e9',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 2,
                                elevation: 1,
                            }}>
                                <Text style={{ 
                                    color: '#0ea5e9', 
                                    fontWeight: '600', 
                                    fontSize: 11 
                                }}>
                                    {item.category}
                                </Text>
                            </View>
                        )}

                        <View style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: '#f8fafc',
                            justifyContent: 'center',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 2,
                            elevation: 1,
                        }}>
                            <Ionicons name="chevron-forward" size={16} color="#667eea" />
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
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
                    style={{ marginBottom: 16 }}
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
                                <Ionicons name="megaphone" size={28} color="#ffffff" />
                            </View>
                            <View>
                                <Text style={{ 
                                    fontSize: 26, 
                                    fontWeight: '800', 
                                    color: '#ffffff', 
                                    letterSpacing: -0.5
                                }}>
                                    Announcements
                                </Text>
                                <Text style={{ 
                                    fontSize: 14, 
                                    color: 'rgba(255,255,255,0.9)',
                                    lineHeight: 18,
                                    fontWeight: '500'
                                }}>
                                    Stay updated with important news and updates
                                </Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Content */}
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
                    {!announcements || announcements.length === 0 ? (
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
                                <Ionicons name="megaphone-outline" size={32} color="#cbd5e1" />
                            </View>
                            <Text style={{ 
                                color: '#64748b', 
                                fontSize: 18, 
                                fontWeight: '600',
                                marginBottom: 8,
                                textAlign: 'center',
                                letterSpacing: -0.2
                            }}>
                                No announcements yet
                            </Text>
                            <Text style={{ 
                                color: '#94a3b8', 
                                fontSize: 14,
                                textAlign: 'center',
                                lineHeight: 20,
                                fontWeight: '400'
                            }}>
                                Check back later for important updates and news.
                            </Text>
                        </View>
                    ) : (
                        announcements.map((item: Announcement, index: number) => (
                            <View key={item.id}>
                                {renderItem({ item, index })}
                            </View>
                        ))
                    )}
                </Animated.ScrollView>
            </View>
        </SafeAreaView>
    );
}