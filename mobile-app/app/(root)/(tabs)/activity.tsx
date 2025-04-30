import { View, Text, ActivityIndicator, TouchableOpacity, SectionList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { styles, getStatusStyle } from "@/styles/activity_styles";
import { MaterialIcons } from '@expo/vector-icons';

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

    const fetchActivity = async () => {
        try {
            const response = await axios.get(`http://192.168.254.106:5000/api/requests/${userId}`);

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
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.typeText}>
                        {item.type}
                        {item.title && `: ${item.title}`}
                    </Text>
                    <MaterialIcons name="chevron-right" size={24} color="#95a5a6" />
                </View>

                {item.type === "Document Request" && (
                    <>
                        <Text style={styles.detailText}>Document: {item.document_type}</Text>
                        <Text style={styles.detailText}>Reason: {item.reason}</Text>
                    </>
                )}
                {item.type === "Create ID" && (
                    <>
                        <Text style={styles.detailText}>Name: {item.full_name}</Text>
                        <Text style={styles.detailText}>Birthdate: {item.birth_date}</Text>
                    </>
                )}
                {item.type === "Incident Report" && (
                    <>
                        <Text style={styles.detailText}>Title: {item.title}</Text>
                        <Text style={styles.detailText}>
                            Description: {item.description?.substring(0, 50) ?? ''}
                            {(item.description?.length ?? 0) > 50 ? '...' : ''}
                        </Text>
                    </>
                )}

                <Text style={styles.timestampText}>
                    Submitted: {new Date(item.created_at).toLocaleString()}
                </Text>

                {item.status && (
                    <View style={[styles.statusContainer, statusStyle.container]}>
                        <Text style={[styles.statusText, statusStyle.text]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                )}

                {item.status?.toLowerCase() === 'approved' && item.appointment_date && (
                    <Text style={styles.detailText}>
                        Pickup Date: {new Date(item.appointment_date).toLocaleString()}
                    </Text>
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

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>Your Activity</Text>

            {/* Status Filter Tabs */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterButton, statusFilter === 'all' && styles.activeFilter]}
                    onPress={() => setStatusFilter('all')}
                >
                    <Text style={[styles.filterText, statusFilter === 'all' && styles.activeFilterText]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, statusFilter === 'pending' && styles.activeFilter]}
                    onPress={() => setStatusFilter('pending')}
                >
                    <Text style={[styles.filterText, statusFilter === 'pending' && styles.activeFilterText]}>Pending</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, statusFilter === 'completed' && styles.activeFilter]}
                    onPress={() => setStatusFilter('completed')}
                >
                    <Text style={[styles.filterText, statusFilter === 'completed' && styles.activeFilterText]}>Completed</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" />
            ) : (
                <SectionList
                    sections={sectionData}
                    keyExtractor={(item) => `type-${item.type}-id-${item.id}`}
                    renderItem={renderTransaction}
                    renderSectionHeader={renderSectionHeader}
                    contentContainerStyle={styles.sectionListContent}
                    stickySectionHeadersEnabled={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#3498db']}
                            tintColor={'#3498db'}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
};

export default Activity;