import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        margin: 16,
        marginBottom: 8,
        color: '#333',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    typeText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#34495e',
        marginBottom: 4,
    },
    timestampText: {
        fontSize: 12,
        color: '#7f8c8d',
        marginTop: 8,
    },
    statusContainer: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#7f8c8d',
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
        marginHorizontal: 16,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    activeFilter: {
        backgroundColor: '#3a86ff',
    },
    filterText: {
        color: '#666',
        fontWeight: '500',
    },
    activeFilterText: {
        color: 'white',
    },
    sectionHeader: {
        backgroundColor: '#f8f9fa',
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginTop: 16,
    },
    sectionHeaderText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6c757d',
    },
    sectionListContent: {
        paddingBottom: 32,
    },
    refreshControl: {
        backgroundColor: 'transparent',
    }
});

export const getStatusStyle = (status) => {
    switch(status?.toLowerCase()) {
        case 'approved':
        case 'completed':
            return {
                container: { backgroundColor: '#e8f5e9' },
                text: { color: '#2e7d32' }
            };
        case 'rejected':
            return {
                container: { backgroundColor: '#ffebee' },
                text: { color: '#c62828' }
            };
        case 'pending':
            return {
                container: { backgroundColor: '#c4ddfa' },
                text: { color: '#2196F3' }
            };
        default:
            return {
                container: { backgroundColor: '#f5f5f5' },
                text: { color: '#424242' }
            };
    }
};