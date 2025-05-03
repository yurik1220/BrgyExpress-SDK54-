import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f6fa',
        paddingHorizontal: 16,
        padding: 15,
    },
    screenTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#2d3436',
        marginBottom: 20,
        marginTop: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f6fa',
    },
    itemContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2d3436',
        flex: 1,
    },
    content: {
        fontSize: 14,
        color: '#636e72',
        marginBottom: 12,
        lineHeight: 20,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    date: {
        fontSize: 12,
        color: '#b2bec3',
        fontWeight: '500',
    },
    listContent: {
        paddingBottom: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 16,
        fontSize: 16,
        color: '#b2bec3',
        fontWeight: '500',
    },
    priorityHigh: {
        borderLeftWidth: 6,
        borderLeftColor: '#e74c3c',
    },
    priorityMedium: {
        borderLeftWidth: 6,
        borderLeftColor: '#f39c12',
    },
    priorityLow: {
        borderLeftWidth: 6,
        borderLeftColor: '#2ecc71',
    },
});