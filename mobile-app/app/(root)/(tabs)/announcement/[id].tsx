import React, { useState, useRef } from "react";
import {
    View, Text, Image, ActivityIndicator, Alert,
    TouchableOpacity, RefreshControl, KeyboardAvoidingView,
    Platform, ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Video, ResizeMode } from 'expo-av';
import { styles } from "@/styles/announcement_detail_styles";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTabBarVisibility } from "../_layout";
import { useFocusEffect } from "@react-navigation/native";

interface Announcement {
    id: number;
    title: string;
    content: string;
    created_at: string;
    priority: string;
    media_url?: string;
    category?: string;
}

export default function AnnouncementDetail() {
    const { id } = useLocalSearchParams();
    const { userId } = useAuth();
    const { setIsTabBarVisible } = useTabBarVisibility();
    const [refreshing, setRefreshing] = useState(false);
    const [isContentExpanded, setIsContentExpanded] = useState(false);
    const announcementId = Array.isArray(id) ? id[0] : id;
    const router = useRouter();

    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    // Handle tab bar visibility with useFocusEffect
    useFocusEffect(
        React.useCallback(() => {
            setIsTabBarVisible(false);
            return () => setIsTabBarVisible(true);
        }, [setIsTabBarVisible])
    );

    // Fetch announcement
    const {
        data: announcement,
        isLoading,
        error: announcementError,
        refetch: refetchAnnouncement
    } = useQuery<Announcement>({
        queryKey: ['announcement', announcementId],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/api/announcements/${announcementId}`);
            return res.data;
        }
    });

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await refetchAnnouncement();
        } finally {
            setRefreshing(false);
        }
    };

    const isContentLong = (content: string) => {
        return content && content.length > 200;
    };

    const getTruncatedContent = (content: string) => {
        if (!content) return '';
        return content.length > 200 ? content.substring(0, 200) + '...' : content;
    };

    const toggleContentExpansion = () => {
        setIsContentExpanded(!isContentExpanded);
    };

    const getPriorityConfig = (priority: string) => {
        const priorityConfig = {
            high: { 
                color: '#ef4444', 
                icon: 'warning' as const, 
                text: 'High Priority',
                gradient: ['#ef4444', '#dc2626'],
                bgColor: '#fef2f2',
                borderColor: '#fecaca'
            },
            medium: { 
                color: '#f59e0b', 
                icon: 'information-circle' as const, 
                text: 'Medium',
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

    if (isLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={{ color: '#6b7280', fontSize: 16, marginTop: 16, fontWeight: '500' }}>Loading announcement...</Text>
            </SafeAreaView>
        );
    }

    if (announcementError || !announcement) {
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
                <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Error Loading Announcement</Text>
                <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>Unable to load this announcement. Please try again.</Text>
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
                    onPress={() => refetchAnnouncement()}
                >
                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const priorityConfig = getPriorityConfig(announcement.priority);

    return (
        <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <LinearGradient
                colors={['#f8fafc', '#ffffff']}
                style={{ position: 'absolute', width: '100%', height: '100%' }}
            />
            
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
                {/* Header */}
                <Animated.View 
                    entering={FadeInDown.duration(400)}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 20,
                        paddingVertical: 16,
                        backgroundColor: 'transparent',
                    }}
                >
                    <TouchableOpacity
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: '#ffffff',
                            justifyContent: 'center',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 2,
                        }}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={20} color="#1f2937" />
                    </TouchableOpacity>
                    
                    <View style={{
                        backgroundColor: priorityConfig.bgColor,
                        borderRadius: 16,
                        paddingHorizontal: 12,
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
                            fontSize: 12,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                        }}>
                            {priorityConfig.text}
                        </Text>
                    </View>
                </Animated.View>

                <ScrollView
                    contentContainerStyle={{ paddingBottom: 32 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#667eea']}
                            tintColor="#667eea"
                        />
                    }
                >
                    <Animated.View 
                        entering={FadeInDown.duration(400).delay(100)}
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: 20,
                            padding: 24,
                            marginHorizontal: 20,
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
                        {/* Priority Icon */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                            <LinearGradient
                                colors={priorityConfig.gradient as [string, string]}
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 28,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 16,
                                    shadowColor: priorityConfig.color,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 8,
                                    elevation: 4,
                                }}
                            >
                                <Ionicons name={priorityConfig.icon} size={28} color="#ffffff" />
                            </LinearGradient>
                            
                            <View style={{ flex: 1 }}>
                                <Text style={{ 
                                    fontWeight: '700', 
                                    fontSize: 22, 
                                    color: '#1f2937',
                                    marginBottom: 6,
                                    letterSpacing: -0.3
                                }}>
                                    {announcement.title}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="time-outline" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
                                    <Text style={{ 
                                        color: '#6b7280', 
                                        fontSize: 15,
                                        fontWeight: '500'
                                    }}>
                                        {new Date(announcement.created_at).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Content - Collapsible Description */}
                        <View style={{ marginBottom: announcement.media_url ? 24 : 0 }}>
                            <Text style={{ 
                                color: '#374151', 
                                fontSize: 16,
                                lineHeight: 26,
                                fontWeight: '400'
                            }}>
                                {isContentLong(announcement.content) && !isContentExpanded 
                                    ? getTruncatedContent(announcement.content)
                                    : announcement.content
                                }
                            </Text>
                            {isContentLong(announcement.content) && (
                                <TouchableOpacity
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginTop: 12,
                                        paddingVertical: 8,
                                        paddingHorizontal: 12,
                                        backgroundColor: '#f8fafc',
                                        borderRadius: 8,
                                        alignSelf: 'flex-start',
                                        borderWidth: 1,
                                        borderColor: '#e2e8f0',
                                    }}
                                    onPress={toggleContentExpansion}
                                    activeOpacity={0.7}
                                >
                                    <Text style={{
                                        color: '#667eea',
                                        fontSize: 14,
                                        fontWeight: '600',
                                        marginRight: 6
                                    }}>
                                        {isContentExpanded ? 'Show Less' : 'Show More'}
                                    </Text>
                                    <Ionicons 
                                        name={isContentExpanded ? 'chevron-up' : 'chevron-down'} 
                                        size={16} 
                                        color="#667eea" 
                                    />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Media */}
                        {announcement.media_url && (
                            <View style={{
                                borderRadius: 16,
                                overflow: 'hidden',
                                marginBottom: 24,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.1,
                                shadowRadius: 8,
                                elevation: 4,
                            }}>
                                {announcement.media_url.endsWith('.mp4') || announcement.media_url.endsWith('.mov') ? (
                                    <Video
                                        source={{ uri: `${API_URL}${announcement.media_url}` }}
                                        style={{ width: '100%', height: 220 }}
                                        resizeMode={ResizeMode.COVER}
                                        shouldPlay={false}
                                        isLooping={false}
                                    />
                                ) : (
                                    <Image
                                        source={{ uri: `${API_URL}${announcement.media_url}` }}
                                        style={{ width: '100%', height: 220 }}
                                        resizeMode="cover"
                                    />
                                )}
                            </View>
                        )}

                        {/* Category */}
                        {announcement.category && (
                            <View style={{
                                backgroundColor: '#f0f9ff',
                                borderRadius: 12,
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                borderWidth: 1,
                                borderColor: '#bae6fd',
                                alignSelf: 'flex-start',
                                shadowColor: '#0ea5e9',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 2,
                                elevation: 1,
                            }}>
                                <Text style={{ 
                                    color: '#0ea5e9', 
                                    fontWeight: '600', 
                                    fontSize: 13 
                                }}>
                                    {announcement.category}
                                </Text>
                            </View>
                        )}
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}