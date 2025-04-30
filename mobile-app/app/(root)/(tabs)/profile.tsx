import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo"; // ← Import Clerk's useAuth!

const Profile = () => {
    const router = useRouter();
    const { signOut } = useAuth(); // ← Grab signOut

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await signOut(); // ← Actually sign out
                            router.replace("/sign-in"); // Navigate back to SignIn screen
                        } catch (error) {
                            console.error("Logout error:", error);
                            Alert.alert("Error", "Failed to logout. Please try again.");
                        }
                    }
                },
            ],
            { cancelable: true }
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* User Info Section */}
            <View style={styles.profileContainer}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>U</Text> {/* Replace with user profile pic later */}
                </View>
                <Text style={styles.name}>User Name</Text>
                <Text style={styles.phone}>+63 912 345 6789</Text>
            </View>

            {/* Settings / Options */}
            <View style={styles.optionsContainer}>
                <TouchableOpacity style={styles.optionButton}>
                    <Text style={styles.optionText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionButton} onPress={handleLogout}>
                    <Text style={[styles.optionText, { color: "#FF3B30" }]}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        backgroundColor: "#f9f9f9",
    },
    profileContainer: {
        alignItems: "center",
        marginTop: 30,
        marginBottom: 50,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#007aff",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
    avatarText: {
        color: "white",
        fontSize: 36,
        fontWeight: "bold",
    },
    name: {
        fontSize: 24,
        fontWeight: "bold",
        marginTop: 5,
    },
    phone: {
        fontSize: 16,
        color: "gray",
        marginTop: 2,
    },
    optionsContainer: {
        marginTop: 20,
    },
    optionButton: {
        backgroundColor: "white",
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 5,
        elevation: 3,
    },
    optionText: {
        fontSize: 18,
        color: "#333",
    },
});

export default Profile;
