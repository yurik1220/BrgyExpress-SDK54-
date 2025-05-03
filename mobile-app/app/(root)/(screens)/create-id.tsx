import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import axios from "axios";
import { useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "@/styles/cid_styles";

interface RequestData {
  type: string;
  full_name: string;
  birth_date: string;
  address: string;
  contact: string;
  clerk_id: string | null;
}

const CreateIDScreen = () => {
  const router = useRouter();
  const { userId } = useAuth();
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [userAddress, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fullName || !birthDate || !userAddress || !contactNumber) {
      Alert.alert("Missing Fields", "Please fill out all the fields.");
      return;
    }

    if (!userId) {
      Alert.alert("Authentication Error", "You must be logged in to submit a request.");
      return;
    }

    const requestData: RequestData = {
      type: "Create ID",
      full_name: fullName,
      birth_date: birthDate,
      address: userAddress,
      contact: contactNumber,
      clerk_id: userId,
    };

    try {
      setLoading(true);
      console.log("Request Data:", requestData);
      const response = await axios.post("http://192.168.254.106:5000/api/requests", requestData);

      // Replace the current screen with details and prevent going back to form
      router.replace({
        pathname: "/details",
        params: {
          ...response.data,  // Use the response data instead of requestData
          fromSubmission: 'true' // Add this flag
        },
      });

      // Removed the success alert since we're navigating directly to details
    } catch (error) {
      console.error("Submission error:", error);
      Alert.alert(
          "Error",
          "Something went wrong while submitting your request.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
            colors={['#f0f9ff', '#e0f2fe', '#bae6fd']}
            style={styles.gradientBackground}
        />
        <View style={styles.floatingDecoration} />
        <View style={styles.floatingDecoration2} />

        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
        >
          <ScrollView
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <View style={styles.iconBackground}>
                  <Image
                      source={require('@/assets/images/id_card.png')}
                      style={styles.icon}
                      resizeMode="contain"
                  />
                </View>
              </View>
              <Text style={styles.heading}>Create Barangay ID</Text>
              <Text style={styles.subheading}>
                Fill out the form below to request your official barangay identification card
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Juan Dela Cruz"
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Birth Date</Text>
              <TextInput
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder="MM/DD/YYYY"
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                  value={userAddress}
                  onChangeText={setAddress}
                  placeholder="123 Street, Barangay, City"
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contact Number</Text>
              <TextInput
                  value={contactNumber}
                  onChangeText={setContactNumber}
                  placeholder="0912-345-6789"
                  keyboardType="phone-pad"
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
              />
            </View>

            <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={styles.submitButton}
            >
              {loading ? (
                  <ActivityIndicator color="#ffffff" />
              ) : (
                  <Text style={styles.buttonText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
};

export default CreateIDScreen;