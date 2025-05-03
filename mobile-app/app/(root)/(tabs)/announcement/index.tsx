import { View, FlatList, TouchableOpacity, Text, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ActivityIndicator } from "react-native-paper";
import { styles } from "@/styles/announce_styles";
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';

interface Announcement {
    id: number;
    title: string;
    content: string;
    created_at: string;
    priority: string;
}

export default function AnnouncementsList() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    // Fetch announcements
    const { data: announcements, isLoading, refetch } = useQuery({
        queryKey: ['announcements'],
        queryFn: async () => {
            const res = await axios.get('http://192.168.254.106:5000/api/announcements');
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

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={[styles.loadingContainer, { paddingBottom: 80 }]}>
                <ActivityIndicator size="large" color="#6c5ce7" />
            </SafeAreaView>
        );
    }

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'high': return <MaterialIcons name="error" size={16} color="#e74c3c" />;
            case 'medium': return <MaterialIcons name="warning" size={16} color="#f39c12" />;
            case 'low': return <MaterialIcons name="info" size={16} color="#2ecc71" />;
            default: return null;
        }
    };

    const renderItem = ({ item }: { item: Announcement }) => (
        <TouchableOpacity
            style={[
                styles.itemContainer,
                styles[`priority${item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}`]
            ]}
            onPress={() => router.push(`/announcement/${item.id}`)}
        >
            <View style={styles.headerRow}>
                <Text style={styles.title}>{item.title}</Text>
                {getPriorityIcon(item.priority)}
            </View>
            <Text style={styles.content} numberOfLines={2}>
                {item.content}
            </Text>
            <View style={styles.footerRow}>
                <Text style={styles.date}>
                    {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color="#a5b1c2" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { paddingBottom: 80 }]} edges={['top', 'left', 'right']}>
            <Text style={styles.screenTitle}>Announcements</Text>
            <FlatList
                data={announcements}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={[styles.listContent, { paddingBottom: 20 }]}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="announcement" size={48} color="#a5b1c2" />
                        <Text style={styles.emptyText}>No announcements found</Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#6c5ce7']}
                        tintColor="#6c5ce7"
                    />
                }
            />
        </SafeAreaView>
    );
}