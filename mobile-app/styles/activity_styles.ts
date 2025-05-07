import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    gradientBackground: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: "100%",
    },
    floatingDecoration: {
        position: "absolute",
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        top: -100,
        right: -100,
    },
    floatingDecoration2: {
        position: "absolute",
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: "rgba(37, 99, 235, 0.1)",
        bottom: -75,
        left: -75,
    },
    contentContainer: {
        flex: 1,
        padding: 20,
    },
    headerContainer: {
        marginBottom: 24,
    },
    header: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#1e293b",
        marginBottom: 8,
    },
    subheader: {
        fontSize: 16,
        color: "#64748b",
    },
    filterContainer: {
        flexDirection: "row",
        marginBottom: 24,
        backgroundColor: "#f8fafc",
        borderRadius: 12,
        padding: 4,
    },
    filterButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    activeFilter: {
        backgroundColor: "#3b82f6",
    },
    filterIcon: {
        marginRight: 6,
    },
    filterText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#64748b",
    },
    activeFilterText: {
        color: "#ffffff",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    sectionListContent: {
        paddingBottom: 35,
    },
    sectionHeader: {
        backgroundColor: "#ffffff",
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    sectionHeaderText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#64748b",
        letterSpacing: 1,
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    typeContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    typeIcon: {
        marginRight: 8,
    },
    typeText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1e293b",
    },
    detailsContainer: {
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    detailText: {
        fontSize: 14,
        color: "#64748b",
        marginLeft: 8,
        flex: 1,
    },
    footerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    timestampContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    timestampText: {
        fontSize: 12,
        color: "#64748b",
        marginLeft: 4,
    },
    statusContainer: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: "600",
    },
    appointmentContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ecfdf5",
        padding: 8,
        borderRadius: 8,
        marginTop: 8,
    },
    appointmentText: {
        fontSize: 12,
        color: "#059669",
        marginLeft: 4,
    },
});

export const getStatusStyle = (status?: string) => {
    switch (status?.toLowerCase()) {
        case "approved":
            return {
                container: { backgroundColor: "#ecfdf5" },
                text: { color: "#059669" },
            };
        case "rejected":
            return {
                container: { backgroundColor: "#fef2f2" },
                text: { color: "#dc2626" },
            };
        case "pending":
        default:
            return {
                container: { backgroundColor: "#eff6ff" },
                text: { color: "#3b82f6" },
            };
    }
}; 