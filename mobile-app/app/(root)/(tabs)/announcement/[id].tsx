import React, { useState, useEffect, useRef } from "react";
import {
    View, Text, Image, ActivityIndicator, Alert, TextInput,
    TouchableOpacity, FlatList, RefreshControl, KeyboardAvoidingView,
    Platform, TouchableWithoutFeedback, Keyboard, ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Video, ResizeMode } from 'expo-av';
import { styles } from "@/styles/announcement_detail_styles";
import { useAuth } from "@clerk/clerk-expo";
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, SlideInRight, FadeInUp } from "react-native-reanimated";
import { useTabBarVisibility } from "../_layout";
import { useFocusEffect } from "@react-navigation/native";

interface Comment {
    id: number;
    content: string;
    created_at: string;
    name: string;
    phonenumber: string;
}

interface Announcement {
    id: number;
    title: string;
    content: string;
    created_at: string;
    priority: string;
    media_url?: string;
    category?: string;
}

const REACTION_TYPES = [
    { emoji: '👍', label: 'Like' },
    { emoji: '❤️', label: 'Love' },
    { emoji: '😮', label: 'Wow' },
    { emoji: '😢', label: 'Sad' },
    { emoji: '👏', label: 'Applaud' }
];

export default function AnnouncementDetail() {
    const { id } = useLocalSearchParams();
    const { userId } = useAuth();
    const queryClient = useQueryClient();
    const { setIsTabBarVisible } = useTabBarVisibility();
    const [newComment, setNewComment] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const announcementId = Array.isArray(id) ? id[0] : id;
    const flatListRef = useRef<FlatList>(null);
    const router = useRouter();

    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    // Keyboard listeners
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const keyboardDidHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    // Handle tab bar visibility with useFocusEffect
    useFocusEffect(
        React.useCallback(() => {
            setIsTabBarVisible(false);
            return () => setIsTabBarVisible(true);
        }, [])
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

    // Fetch comments
    const {
        data: comments,
        refetch: refetchComments
    } = useQuery<Comment[]>({
        queryKey: ['comments', announcementId],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/api/announcements/${announcementId}/comments`);
            return res.data;
        }
    });

    // Fetch reactions
    const {
        data: reactions,
        refetch: refetchReactions
    } = useQuery<Record<string, number>>({
        queryKey: ['reactions', announcementId],
        queryFn: async () => {
            const res = await axios.get(`${API_URL}/api/announcements/${announcementId}/reactions`);
            return res.data;
        }
    });

    // Fetch user's reaction
    const {
        data: userReaction,
        refetch: refetchUserReaction
    } = useQuery<string | null>({
        queryKey: ['userReaction', announcementId, userId],
        queryFn: async () => {
            if (!userId) return null;
            try {
                const res = await axios.get(`${API_URL}/api/announcements/${announcementId}/reactions/${userId}`);
                return res.data?.reaction_type || null;
            } catch {
                return null;
            }
        }
    });

    // Add comment mutation
    const addComment = useMutation({
        mutationFn: async (content: string) => {
            const res = await axios.post(
                `${API_URL}/api/announcements/${announcementId}/comments`,
                { clerk_id: userId, content }
            );
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', announcementId] });
            setNewComment('');
            setShowCommentInput(false);
        }
    });

    // Add reaction mutation
    const addReaction = useMutation({
        mutationFn: async (reactionType: string) => {
            await axios.post(
                `${API_URL}/api/announcements/${announcementId}/reactions`,
                { clerk_id: userId, reaction_type: reactionType }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reactions', announcementId] });
            queryClient.invalidateQueries({ queryKey: ['userReaction', announcementId, userId] });
        }
    });

    // Remove reaction mutation
    const removeReaction = useMutation({
        mutationFn: async () => {
            await axios.delete(`${API_URL}/api/announcements/${announcementId}/reactions`, {
                data: { clerk_id: userId }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reactions', announcementId] });
            queryClient.invalidateQueries({ queryKey: ['userReaction', announcementId, userId] });
        }
    });

    const handleReaction = (reactionType: string) => {
        if (!userId) {
            Alert.alert("Sign In Required", "Please sign in to react to announcements");
            return;
        }

        if (userReaction === reactionType) {
            removeReaction.mutate();
        } else {
            addReaction.mutate(reactionType);
        }
    };

    const handleAddComment = () => {
        if (!newComment.trim()) return;
        if (!userId) {
            Alert.alert("Sign In Required", "Please sign in to comment");
            return;
        }
        addComment.mutate(newComment);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                refetchAnnouncement(),
                refetchComments(),
                refetchReactions(),
                refetchUserReaction()
            ]);
        } finally {
            setRefreshing(false);
        }
    };

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
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const renderMedia = () => {
        if (!announcement?.media_url) return null;

        return (
            <Animated.View 
                entering={FadeIn.duration(800)}
                style={{
                    width: '100%',
                    height: 200,
                    borderRadius: 16,
                    overflow: 'hidden',
                    marginBottom: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                }}
            >
                {announcement.media_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                    <Image
                        source={{ uri: `${API_URL}${announcement.media_url}` }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                ) : announcement.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                    <Video
                        source={{ uri: `${API_URL}${announcement.media_url}` }}
                        style={{ width: '100%', height: '100%' }}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay={false}
                    />
                ) : null}
            </Animated.View>
        );
    };

    const renderReactions = () => (
        <Animated.View 
            entering={FadeInDown.duration(400).delay(200)}
            style={{ marginBottom: 24 }}
        >
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
            >
                {REACTION_TYPES.map((reaction) => (
                    <TouchableOpacity
                        key={reaction.label}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: userReaction === reaction.emoji ? '#667eea' : '#f8fafc',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 20,
                            marginRight: 8,
                            shadowColor: userReaction === reaction.emoji ? '#667eea' : '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: userReaction === reaction.emoji ? 0.2 : 0.05,
                            shadowRadius: 4,
                            elevation: userReaction === reaction.emoji ? 3 : 1,
                        }}
                        onPress={() => handleReaction(reaction.emoji)}
                    >
                        <Text style={{ fontSize: 16, marginRight: 4 }}>{reaction.emoji}</Text>
                        <Text style={{ 
                            fontSize: 14, 
                            fontWeight: '600', 
                            color: userReaction === reaction.emoji ? '#ffffff' : '#4b5563'
                        }}>
                            {reactions?.[reaction.emoji] || 0}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </Animated.View>
    );

    const renderComment = ({ item, index }: { item: Comment; index: number }) => (
        <Animated.View 
            entering={SlideInRight.duration(400).delay(index * 100)}
            style={{
                backgroundColor: '#ffffff',
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
                borderWidth: 1,
                borderColor: 'rgba(0, 0, 0, 0.03)',
            }}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#667eea',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                    shadowColor: '#667eea',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 2,
                }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
                        {item.name.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 2 }}>
                        {item.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                        {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
            </View>
            <Text style={{ fontSize: 14, lineHeight: 20, color: '#4b5563' }}>
                {item.content}
            </Text>
        </Animated.View>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={{ color: '#6b7280', fontSize: 16, marginTop: 16, fontWeight: '500' }}>Loading announcement...</Text>
            </SafeAreaView>
        );
    }

    if (!announcement) {
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
                <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Announcement not found</Text>
                <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>The announcement you're looking for doesn't exist or has been removed.</Text>
            </SafeAreaView>
        );
    }

    const priorityConfig = getPriorityConfig(announcement.priority);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: '#ffffff' }}
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

                <FlatList
                    ref={flatListRef}
                    data={comments}
                    renderItem={renderComment}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 32 }}
                    ListHeaderComponent={
                        <>
                            <Animated.View 
                                entering={FadeInDown.duration(400).delay(100)}
                                style={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: 20,
                                    padding: 20,
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
                                            fontSize: 24, 
                                            fontWeight: '700', 
                                            color: '#1f2937',
                                            marginBottom: 4,
                                            letterSpacing: -0.3
                                        }}>
                                            {announcement.title}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name="time-outline" size={12} color="#9ca3af" style={{ marginRight: 4 }} />
                                            <Text style={{ 
                                                color: '#6b7280', 
                                                fontSize: 13,
                                                fontWeight: '500'
                                            }}>
                                                {formatDate(announcement.created_at)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {announcement.category && (
                                    <View style={{
                                        backgroundColor: '#f0f9ff',
                                        borderRadius: 12,
                                        paddingHorizontal: 10,
                                        paddingVertical: 6,
                                        alignSelf: 'flex-start',
                                        marginBottom: 16,
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
                                            {announcement.category}
                                        </Text>
                                    </View>
                                )}

                                {renderMedia()}
                                
                                <Text style={{ 
                                    fontSize: 16, 
                                    lineHeight: 24, 
                                    color: '#4b5563',
                                    marginBottom: 16,
                                    fontWeight: '400'
                                }}>
                                    {announcement.content}
                                </Text>
                            </Animated.View>
                            
                            {renderReactions()}
                            
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 16,
                                paddingHorizontal: 20,
                            }}>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937' }}>
                                    Comments
                                </Text>
                                <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '500' }}>
                                    {comments?.length || 0} comments
                                </Text>
                            </View>
                        </>
                    }
                    ListEmptyComponent={
                        <Animated.View 
                            entering={FadeIn.duration(400)}
                            style={{
                                alignItems: 'center',
                                padding: 32,
                                marginHorizontal: 20,
                            }}
                        >
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
                                <Ionicons name="chatbubble-outline" size={32} color="#cbd5e1" />
                            </View>
                            <Text style={{ 
                                color: '#64748b', 
                                fontSize: 18, 
                                fontWeight: '600',
                                marginBottom: 8,
                                textAlign: 'center',
                                letterSpacing: -0.2
                            }}>
                                No comments yet
                            </Text>
                            <Text style={{ 
                                color: '#94a3b8', 
                                fontSize: 14,
                                textAlign: 'center',
                                lineHeight: 20,
                                fontWeight: '400'
                            }}>
                                Be the first to share your thoughts
                            </Text>
                        </Animated.View>
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#667eea']}
                            tintColor="#667eea"
                        />
                    }
                />

                {showCommentInput ? (
                    <Animated.View 
                        entering={FadeInUp.duration(300)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 16,
                            backgroundColor: '#ffffff',
                            borderTopWidth: 1,
                            borderTopColor: '#e5e7eb',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 8,
                            elevation: 4,
                        }}
                    >
                        <TextInput
                            style={{
                                flex: 1,
                                backgroundColor: '#f8fafc',
                                borderRadius: 20,
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                                marginRight: 12,
                                fontSize: 14,
                                color: '#1f2937',
                                maxHeight: 100,
                                borderWidth: 1,
                                borderColor: '#e2e8f0',
                            }}
                            placeholder="Write a comment..."
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                backgroundColor: newComment.trim() ? '#667eea' : '#e5e7eb',
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: newComment.trim() ? '#667eea' : 'transparent',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: newComment.trim() ? 0.2 : 0,
                                shadowRadius: 4,
                                elevation: newComment.trim() ? 3 : 0,
                            }}
                            onPress={handleAddComment}
                            disabled={!newComment.trim()}
                        >
                            <Ionicons 
                                name="send" 
                                size={20} 
                                color={newComment.trim() ? "#ffffff" : "#9ca3af"} 
                            />
                        </TouchableOpacity>
                    </Animated.View>
                ) : (
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 16,
                            backgroundColor: '#ffffff',
                            borderTopWidth: 1,
                            borderTopColor: '#e5e7eb',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 8,
                            elevation: 4,
                        }}
                        onPress={() => setShowCommentInput(true)}
                    >
                        <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: '#f8fafc',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 8,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 2,
                            elevation: 1,
                        }}>
                            <Ionicons name="add" size={20} color="#667eea" />
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#667eea' }}>
                            Add a comment
                        </Text>
                    </TouchableOpacity>
                )}
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}