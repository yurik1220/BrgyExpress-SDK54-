import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    backgroundGradient: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: "#ffffff",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1e293b",
    },
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#f8fafc",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    listContent: {
        padding: 16,
    },
    itemContainer: {
        marginBottom: 16,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    gradientBackground: {
        padding: 16,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    titleWrapper: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1e293b",
        marginBottom: 8,
    },
    categoryBadge: {
        backgroundColor: "#7F5AF020",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: "flex-start",
    },
    categoryText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#7F5AF0",
    },
    priorityBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    priorityText: {
        fontSize: 12,
        fontWeight: "600",
        marginLeft: 4,
    },
    content: {
        fontSize: 14,
        color: "#475569",
        lineHeight: 20,
        marginBottom: 16,
    },
    footerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    dateBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    date: {
        fontSize: 12,
        color: "#64748b",
        marginLeft: 4,
    },
    chevronCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#7F5AF020",
        justifyContent: "center",
        alignItems: "center",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#1e293b",
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: "#64748b",
        marginTop: 4,
        textAlign: "center",
    },
});

export const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'high':
            return '#ef4444';
        case 'medium':
            return '#f59e0b';
        case 'low':
            return '#10b981';
        default:
            return '#64748b';
    }
}; 