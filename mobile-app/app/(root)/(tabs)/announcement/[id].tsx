import React, { useState, useEffect, useRef } from "react";
import {
    View, Text, Image, ActivityIndicator, Alert, TextInput,
    TouchableOpacity, FlatList, RefreshControl, KeyboardAvoidingView,
    Platform, TouchableWithoutFeedback, Keyboard
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Video } from 'expo-av';
import { styles } from "@/styles/announcement_detail_styles";
import { useAuth } from "@clerk/clerk-expo";
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
            queryClient.invalidateQueries(['comments', announcementId]);
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
            queryClient.invalidateQueries(['reactions', announcementId]);
            queryClient.invalidateQueries(['userReaction', announcementId, userId]);
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
            queryClient.invalidateQueries(['reactions', announcementId]);
            queryClient.invalidateQueries(['userReaction', announcementId, userId]);
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

        if (announcement.media_url.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return (
                <Image
                    source={{ uri: `${API_URL}${announcement.media_url}` }}
                    style={styles.media}
                    resizeMode="cover"
                />
            );
        } else if (announcement.media_url.match(/\.(mp4|webm|ogg)$/i)) {
            return (
                <Video
                    source={{ uri: `${API_URL}${announcement.media_url}` }}
                    style={styles.media}
                    useNativeControls
                    resizeMode="contain"
                    shouldPlay={false}
                />
            );
        }
        return null;
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
        if (!announcement) return null;
        switch (announcement.priority) {
            case 'high': return <Ionicons name="alert-circle" size={14} color="#FF4D4D" />;
            case 'medium': return <Ionicons name="alert" size={14} color="#FFAA33" />;
            case 'low': return <Ionicons name="information-circle" size={14} color="#2CB67D" />;
            default: return null;
        }
    };

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7F5AF0" />
            </SafeAreaView>
        );
    }

    if (announcementError) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Ionicons name="warning" size={48} color="#FF4D4D" />
                    <Text style={styles.errorText}>Failed to load announcement</Text>
                    <TouchableOpacity
                        style={[styles.commentButton, { marginTop: 24 }]}
                        onPress={() => refetchAnnouncement()}
                    >
                        <Feather name="refresh-cw" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (!announcement) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.emptyContainer}>
                    <Ionicons name="document-text" size={48} color="#B8C1EC" />
                    <Text style={styles.emptyTitle}>Announcement Not Found</Text>
                    <Text style={styles.emptySubtitle}>The requested announcement doesn't exist</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {Platform.OS === 'ios' && keyboardVisible && (
                    <View style={styles.keyboardToolbar}>
                        <TouchableOpacity onPress={() => Keyboard.dismiss()}>
                            <Text style={styles.doneText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                )}
                <SafeAreaView style={styles.container}>
                    <FlatList
                        data={[]}
                        renderItem={() => null}
                        keyExtractor={() => 'dummy'}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#7F5AF0']}
                                tintColor="#7F5AF0"
                                progressBackgroundColor="#ffffff"
                            />
                        }
                        contentContainerStyle={{
                            paddingBottom: keyboardVisible ? 300 : 0
                        }}
                        ListHeaderComponent={
                            <>
                                <LinearGradient
                                    colors={['#F8F9FF', '#F0F2FF']}
                                    style={[styles.headerGradient, getPriorityStyle()]}
                                >
                                    <View style={styles.headerTopRow}>
                                        <View style={[styles.priorityBadge, getPriorityBadgeStyle()]}>
                                            {getPriorityIcon()}
                                            <Text style={[styles.priorityText, getPriorityTextStyle()]}>
                                                {announcement.priority.toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text style={styles.date}>
                                            {new Date(announcement.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </Text>
                                    </View>

                                    <Text style={styles.title}>{announcement.title}</Text>

                                    {announcement.category && (
                                        <View style={[styles.priorityBadge, {
                                            backgroundColor: '#7F5AF020',
                                            alignSelf: 'flex-start',
                                            marginTop: 8
                                        }]}>
                                            <Text style={[styles.priorityText, { color: '#7F5AF0' }]}>
                                                {announcement.category.toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                </LinearGradient>

                                <View style={styles.contentContainer}>
                                    {renderMedia()}
                                    <Text style={styles.content}>{announcement.content}</Text>
                                </View>

                                <View style={styles.reactionsContainer}>
                                    {REACTION_TYPES.map(({ emoji, label }) => (
                                        <TouchableOpacity
                                            key={label}
                                            style={[
                                                styles.reactionButton,
                                                userReaction === emoji && styles.selectedReaction
                                            ]}
                                            onPress={() => handleReaction(emoji)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[
                                                styles.reactionText,
                                                userReaction === emoji && styles.selectedReactionText
                                            ]}>
                                                {emoji} {reactions?.[emoji] || 0}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        }
                        ListFooterComponent={
                            <View style={styles.commentsContainer}>
                                <View style={styles.commentsHeader}>
                                    <Ionicons name="chatbubble-ellipses" size={24} color="#7F5AF0" />
                                    <Text style={styles.commentsTitle}>
                                        Comments • {comments?.length || 0}
                                    </Text>
                                </View>

                                {(showCommentInput || comments?.length === 0) && (
                                    <View style={styles.commentInputContainer}>
                                        <TextInput
                                            style={styles.commentInput}
                                            placeholder="Share your thoughts..."
                                            placeholderTextColor="#B8C1EC"
                                            value={newComment}
                                            onChangeText={setNewComment}
                                            multiline
                                            editable={!!userId}
                                            onFocus={() => {
                                                if (announcement?.media_url) {
                                                    setTimeout(() => {
                                                        flatListRef.current?.scrollToEnd({ animated: true });
                                                    }, 100);
                                                }
                                            }}
                                        />
                                        <TouchableOpacity
                                            style={styles.commentButton}
                                            onPress={handleAddComment}
                                            disabled={addComment.isLoading || !userId || !newComment.trim()}
                                            activeOpacity={0.8}
                                        >
                                            {addComment.isLoading ? (
                                                <ActivityIndicator color="white" />
                                            ) : (
                                                <MaterialIcons name="send" size={24} color="white" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <FlatList
                                    data={comments}
                                    keyExtractor={item => item.id.toString()}
                                    renderItem={({ item }) => (
                                        <View style={styles.commentItem}>
                                            <View style={styles.commentHeader}>
                                                <Text style={styles.commentAuthor}>
                                                    {item.name || item.phonenumber || 'Anonymous'}
                                                </Text>
                                                <Text style={styles.commentDate}>
                                                    {new Date(item.created_at).toLocaleString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </Text>
                                            </View>
                                            <Text style={styles.commentContent}>{item.content}</Text>
                                        </View>
                                    )}
                                    scrollEnabled={false}
                                    ListEmptyComponent={
                                        <View style={styles.noCommentsContainer}>
                                            <Ionicons name="chatbox-ellipses" size={40} color="#B8C1EC" />
                                            <Text style={styles.noCommentsText}>
                                                {userId ? "Be the first to comment" : "Sign in to comment"}
                                            </Text>
                                        </View>
                                    }
                                />
                            </View>
                        }
                        ref={flatListRef}
                    />

                    {!showCommentInput && !keyboardVisible && (
                        <TouchableOpacity
                            style={styles.floatingActionButton}
                            onPress={() => {
                                setShowCommentInput(true);
                                if (announcement?.media_url) {
                                    setTimeout(() => {
                                        flatListRef.current?.scrollToEnd({ animated: true });
                                    }, 100);
                                }
                            }}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="pencil" size={24} color="white" />
                        </TouchableOpacity>
                    )}
                </SafeAreaView>
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    );
}