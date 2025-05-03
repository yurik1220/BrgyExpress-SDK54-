import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        paddingBottom: 25,
    },
    gradientBackground: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 180,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    scrollContainer: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    editButton: {
        padding: 8,
    },
    profileContainer: {
        alignItems: 'center',
        marginBottom: 15,
    },
    avatarContainer: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        marginBottom: 10,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: 'white',
    },
    avatarText: {
        color: 'white',
        fontSize: 48,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0f172a',
        marginTop: 1,
    },
    phone: {
        fontSize: 16,
        color: '#64748b',
        marginTop: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginVertical: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 16,
    },
    optionButton: {
        backgroundColor: 'white',
        padding: 18,
        borderRadius: 14,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    optionTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionIcon: {
        marginRight: 16,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#334155',
    },
    optionArrow: {
        color: '#94a3b8',
    },
    logoutButton: {
        backgroundColor: 'white',
        padding: 18,
        borderRadius: 14,
        marginTop: 5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#ef4444',
    },
    modalContainer: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 24,
        width: '90%',
        alignSelf: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalText: {
        fontSize: 16,
        color: '#64748b',
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalCancelButton: {
        backgroundColor: '#f1f5f9',
        marginRight: 8,
    },
    modalConfirmButton: {
        backgroundColor: '#3b82f6',
        marginLeft: 8,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    modalCancelText: {
        color: '#334155',
    },
    modalConfirmText: {
        color: 'white',
    },
    input: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        width: '100%',
        marginBottom: 24,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 16,
    },
    emptyText: {
        color: '#64748b',
        fontSize: 16,
    }
});

export const getStatusStyle = (status) => {
    switch(status) {
        case 'approved':
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