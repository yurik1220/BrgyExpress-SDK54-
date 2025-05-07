import { View, FlatList, TouchableOpacity, Text, RefreshControl, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
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
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7F5AF0" />
            </SafeAreaView>
        );
    }

    const getPriorityBadge = (priority: string) => {
        const priorityConfig = {
            high: { color: '#FF4D4D', icon: 'alert-circle' as const, text: 'Urgent' },
            medium: { color: '#FFAA33', icon: 'alert' as const, text: 'Important' },
            low: { color: '#2CB67D', icon: 'information-circle' as const, text: 'Info' }
        };

        const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.low;

        return (
            <Animated.View 
                entering={FadeIn.duration(400)}
                style={[styles.priorityBadge, { backgroundColor: `${config.color}20` }]}
            >
                <Ionicons name={config.icon} size={14} color={config.color} />
                <Text style={[styles.priorityText, { color: config.color }]}>
                    {config.text}
                </Text>
            </Animated.View>
        );
    };

    const renderItem = ({ item, index }: { item: Announcement; index: number }) => (
        <Animated.View 
            entering={FadeInDown.duration(400).delay(index * 100).springify()}
        >
            <TouchableOpacity
                style={styles.itemContainer}
                onPress={() => router.push(`/announcement/${item.id}`)}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={['#ffffff', '#f9f9ff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientBackground}
                >
                    <View style={styles.headerRow}>
                        <View style={styles.titleWrapper}>
                            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                            {item.category && (
                                <View style={styles.categoryBadge}>
                                    <Text style={styles.categoryText}>{item.category}</Text>
                                </View>
                            )}
                        </View>
                        {getPriorityBadge(item.priority)}
                    </View>

                    <Text style={styles.content} numberOfLines={3}>
                        {item.content}
                    </Text>

                    <View style={styles.footerRow}>
                        <View style={styles.dateBadge}>
                            <MaterialIcons name="access-time" size={14} color="#7F5AF0" />
                            <Text style={styles.date}>
                                {new Date(item.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </Text>
                        </View>
                        <View style={styles.chevronCircle}>
                            <MaterialIcons name="chevron-right" size={18} color="#7F5AF0" />
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <LinearGradient
            colors={['#F8F9FF', '#F0F2FF']}
            style={styles.backgroundGradient}
        >
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
                <Animated.View style={styles.header}>
                    <Text style={styles.screenTitle}>Announcements</Text>
                    <TouchableOpacity style={styles.filterButton}>
                        <Ionicons name="filter" size={20} color="#7F5AF0" />
                    </TouchableOpacity>
                </Animated.View>

                <FlatList
                    ref={flatListRef}
                    data={announcements}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Animated.View 
                            entering={FadeIn.duration(800)}
                            style={styles.emptyContainer}
                        >
                            <Ionicons name="megaphone" size={48} color="#B8C1EC" />
                            <Text style={styles.emptyTitle}>No Announcements Yet</Text>
                            <Text style={styles.emptySubtitle}>Check back later for updates</Text>
                        </Animated.View>
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#7F5AF0']}
                            tintColor="#7F5AF0"
                            progressBackgroundColor="#ffffff"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                />
            </SafeAreaView>
        </LinearGradient>
    );
}