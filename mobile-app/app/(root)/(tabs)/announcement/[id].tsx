import { View, Text, Image, ActivityIndicator, Alert, TextInput, TouchableOpacity, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Video } from 'expo-av';
import { styles } from "@/styles/announcement_detail_styles";
import { useAuth } from "@clerk/clerk-expo";
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useState } from "react";

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
}

const REACTION_TYPES = ['👍', '❤️', '😮', '😢', '👎'];

export default function AnnouncementDetail() {
    const { id } = useLocalSearchParams();
    const { userId } = useAuth();
    const queryClient = useQueryClient();
    const [newComment, setNewComment] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const announcementId = Array.isArray(id) ? id[0] : id;

    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.254.106:5000';

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
            Alert.alert("Please sign in to react");
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
            Alert.alert("Please sign in to comment");
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
                />
            );
        }
        return null;
    };

    const getPriorityStyle = () => {
        if (!announcement) return {};
        switch (announcement.priority) {
            case 'high': return styles.highPriority;
            case 'medium': return styles.mediumPriority;
            case 'low': return styles.lowPriority;
            default: return {};
        }
    };

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#6c5ce7" />
            </SafeAreaView>
        );
    }

    if (announcementError) {
        Alert.alert("Error", "Failed to load announcement");
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={48} color="#e74c3c" />
                    <Text style={styles.errorText}>Error loading announcement</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!announcement) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="announcement" size={48} color="#a5b1c2" />
                    <Text style={styles.emptyText}>Announcement not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={[]}
                renderItem={() => null}
                keyExtractor={() => 'dummy'}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#6c5ce7']}
                        tintColor="#6c5ce7"
                    />
                }
                ListHeaderComponent={
                    <>
                        <View style={[styles.header, getPriorityStyle()]}>
                            <View style={styles.headerTopRow}>
                                <Text style={styles.priority}>
                                    {announcement.priority.toUpperCase()}
                                </Text>
                                <Text style={styles.date}>
                                    {new Date(announcement.created_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </Text>
                            </View>
                            <Text style={styles.title}>{announcement.title}</Text>
                        </View>

                        <View style={styles.contentContainer}>
                            {renderMedia()}
                            <Text style={styles.content}>{announcement.content}</Text>
                        </View>

                        <View style={styles.reactionsContainer}>
                            {REACTION_TYPES.map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.reactionButton,
                                        userReaction === type && styles.selectedReaction
                                    ]}
                                    onPress={() => handleReaction(type)}
                                >
                                    <Text style={styles.reactionText}>
                                        {type} {reactions?.[type] || 0}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                }
                ListFooterComponent={
                    <View style={styles.commentsContainer}>
                        <View style={styles.commentsHeader}>
                            <Ionicons name="chatbubble-ellipses" size={20} color="#6c5ce7" />
                            <Text style={styles.commentsTitle}>Comments ({comments?.length || 0})</Text>
                        </View>

                        <View style={styles.commentInputContainer}>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Add a comment..."
                                placeholderTextColor="#95a5a6"
                                value={newComment}
                                onChangeText={setNewComment}
                                multiline
                                editable={!!userId}
                            />
                            <TouchableOpacity
                                style={styles.commentButton}
                                onPress={handleAddComment}
                                disabled={addComment.isLoading || !userId || !newComment.trim()}
                            >
                                {addComment.isLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <MaterialIcons name="send" size={24} color="white" />
                                )}
                            </TouchableOpacity>
                        </View>

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
                                    <MaterialIcons name="comments-disabled" size={40} color="#dfe6e9" />
                                    <Text style={styles.noCommentsText}>No comments yet</Text>
                                </View>
                            }
                        />
                    </View>
                }
            />
        </SafeAreaView>
    );
}