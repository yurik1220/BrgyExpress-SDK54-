import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#f9f9f9',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 15,
        color: '#444',
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    icon: {
        marginRight: 10,
        marginTop: 3,
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 14,
        color: '#777',
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 16,
        color: '#333',
    },
    warningText: {
        color: '#F44336',
        fontWeight: '500',
    },
    media: {
        width: '100%',
        height: 250,
        borderRadius: 8,
        marginTop: 10,
    },
    link: {
        color: '#1E88E5',
        textDecorationLine: 'underline',
    },
    backButton: {
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 1,
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 20,
    }
});

export const detailRowStyles = {
    row: styles.detailRow,
    icon: styles.icon,
    content: styles.detailContent,
    label: styles.detailLabel,
    value: styles.detailValue,
    warning: styles.warningText,
};