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

    const renderMedia = () => {
        if (!announcement?.media_url) return null;

        return (
            <Animated.View 
                entering={FadeIn.duration(800)}
                style={styles.mediaContainer}
            >
                {announcement.media_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                    <Image
                        source={{ uri: `${API_URL}${announcement.media_url}` }}
                        style={styles.media}
                        resizeMode="cover"
                    />
                ) : announcement.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                    <Video
                        source={{ uri: `${API_URL}${announcement.media_url}` }}
                        style={styles.media}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay={false}
                    />
                ) : null}
            </Animated.View>
        );
    };

    const getPriorityStyle = () => {
        if (!announcement) return {};
        switch (announcement.priority) {
            case 'high': return styles.highPriorityGradient;
            case 'medium': return styles.mediumPriorityGradient;
            case 'low': return styles.lowPriorityGradient;
            default: return {};
        }
    };

    const getPriorityBadgeStyle = () => {
        if (!announcement) return {};
        switch (announcement.priority) {
            case 'high': return styles.highPriorityBadge;
            case 'medium': return styles.mediumPriorityBadge;
            case 'low': return styles.lowPriorityBadge;
            default: return {};
        }
    };

    const getPriorityTextStyle = () => {
        if (!announcement) return {};
        switch (announcement.priority) {
            case 'high': return styles.highPriorityText;
            case 'medium': return styles.mediumPriorityText;
            case 'low': return styles.lowPriorityText;
            default: return {};
        }
    };

    const getPriorityIcon = () => {
        if (!announcement) return 'information-circle';
        switch (announcement.priority) {
            case 'high': return 'alert-circle';
            case 'medium': return 'alert';
            case 'low': return 'information-circle';
            default: return 'information-circle';
        }
    };

    const renderReactions = () => (
        <Animated.View 
            entering={FadeInDown.duration(400).delay(200)}
            style={styles.reactionsContainer}
        >
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reactionsScroll}
            >
                {REACTION_TYPES.map((reaction) => (
                    <TouchableOpacity
                        key={reaction.label}
                        style={[
                            styles.reactionButton,
                            userReaction === reaction.emoji && styles.activeReactionButton
                        ]}
                        onPress={() => handleReaction(reaction.emoji)}
                    >
                        <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                        <Text style={styles.reactionCount}>
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
            style={styles.commentContainer}
        >
            <View style={styles.commentHeader}>
                <View style={styles.commentUserInfo}>
                    <View style={styles.userAvatar}>
                        <Text style={styles.userInitial}>
                            {item.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.userName}>{item.name}</Text>
                        <Text style={styles.commentDate}>
                            {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                </View>
            </View>
            <Text style={styles.commentContent}>{item.content}</Text>
        </Animated.View>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7F5AF0" />
            </SafeAreaView>
        );
    }

    if (!announcement) {
        return (
            <SafeAreaView style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#FF4D4D" />
                <Text style={styles.errorText}>Announcement not found</Text>
            </SafeAreaView>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <LinearGradient
                colors={['#F8F9FF', '#F0F2FF']}
                style={styles.backgroundGradient}
            >
                <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
                    <Animated.View 
                        entering={FadeInDown.duration(400)}
                        style={styles.header}
                    >
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#7F5AF0" />
                        </TouchableOpacity>
                        <View style={[styles.priorityBadge, getPriorityBadgeStyle()]}>
                            <Ionicons name={getPriorityIcon()} size={16} color="#ffffff" />
                            <Text style={[styles.priorityText, getPriorityTextStyle()]}>
                                {announcement.priority.toUpperCase()}
                            </Text>
                        </View>
                    </Animated.View>

                    <FlatList
                        ref={flatListRef}
                        data={comments}
                        renderItem={renderComment}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.contentContainer}
                        ListHeaderComponent={
                            <>
                                <Animated.View 
                                    entering={FadeInDown.duration(400).delay(100)}
                                    style={styles.announcementContainer}
                                >
                                    <Text style={styles.title}>{announcement.title}</Text>
                                    {announcement.category && (
                                        <View style={styles.categoryBadge}>
                                            <Text style={styles.categoryText}>
                                                {announcement.category}
                                            </Text>
                                        </View>
                                    )}
                                    {renderMedia()}
                                    <Text style={styles.content}>{announcement.content}</Text>
                                    <Text style={styles.date}>
                                        {new Date(announcement.created_at).toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </Text>
                                </Animated.View>
                                {renderReactions()}
                                <View style={styles.commentsHeader}>
                                    <Text style={styles.commentsTitle}>Comments</Text>
                                    <Text style={styles.commentsCount}>
                                        {comments?.length || 0} comments
                                    </Text>
                                </View>
                            </>
                        }
                        ListEmptyComponent={
                            <Animated.View 
                                entering={FadeIn.duration(400)}
                                style={styles.emptyComments}
                            >
                                <Ionicons name="chatbubble-outline" size={48} color="#B8C1EC" />
                                <Text style={styles.emptyCommentsText}>No comments yet</Text>
                                <Text style={styles.emptyCommentsSubtext}>
                                    Be the first to share your thoughts
                                </Text>
                            </Animated.View>
                        }
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#7F5AF0']}
                                tintColor="#7F5AF0"
                            />
                        }
                    />

                    {showCommentInput ? (
                        <Animated.View 
                            entering={FadeInUp.duration(300)}
                            style={styles.commentInputContainer}
                        >
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Write a comment..."
                                value={newComment}
                                onChangeText={setNewComment}
                                multiline
                                maxLength={500}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    !newComment.trim() && styles.sendButtonDisabled
                                ]}
                                onPress={handleAddComment}
                                disabled={!newComment.trim()}
                            >
                                <Ionicons 
                                    name="send" 
                                    size={20} 
                                    color={newComment.trim() ? "#ffffff" : "#B8C1EC"} 
                                />
                            </TouchableOpacity>
                        </Animated.View>
                    ) : (
                        <TouchableOpacity
                            style={styles.addCommentButton}
                            onPress={() => setShowCommentInput(true)}
                        >
                            <Ionicons name="add-circle" size={24} color="#7F5AF0" />
                            <Text style={styles.addCommentText}>Add a comment</Text>
                        </TouchableOpacity>
                    )}
                </SafeAreaView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}