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
    scrollContainer: {
        flexGrow: 1,
        padding: 20,
    },
    header: {
        alignItems: "center",
        marginBottom: 30,
    },
    iconContainer: {
        marginBottom: 20,
    },
    iconBackground: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    icon: {
        width: 60,
        height: 60,
    },
    heading: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#1e293b",
        marginBottom: 8,
        textAlign: "center",
    },
    subheading: {
        fontSize: 16,
        color: "#64748b",
        textAlign: "center",
        paddingHorizontal: 20,
    },
    cardContainer: {
        marginBottom: 20,
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    cardGradient: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 4,
    },
    cardContent: {
        padding: 20,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    label: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1e293b",
        marginLeft: 8,
    },
    pickerContainer: {
        backgroundColor: "#f8fafc",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        overflow: "hidden",
    },
    picker: {
        height: 50,
        color: "#1e293b",
    },
    buttonContainer: {
        marginTop: 20,
        marginBottom: 40,
    },
    submitButton: {
        backgroundColor: "#3b82f6",
        borderRadius: 12,
        padding: 16,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#3b82f6",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "600",
    },
}); 