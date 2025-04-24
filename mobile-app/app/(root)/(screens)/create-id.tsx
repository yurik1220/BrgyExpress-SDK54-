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
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import axios from "axios";

interface RequestData {
  type: string;
  name: string;
  birthdate: string;
  userAddress: string;
  contact: string;
  user: string;
}

const CreateIDScreen = () => {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fullName || !birthDate || !address || !contactNumber) {
      Alert.alert("Missing Fields", "Please fill out all the fields.");
      return;
    }

    const requestData: RequestData = {
      type: "Create ID",
      name: fullName,
      birthdate: birthDate,
      userAddress: address,
      contact: contactNumber,
      user: "User Name",
    };

    try {
      setLoading(true);
      await axios.post("http://192.168.254.106:5000/api/requests", requestData);
      router.push({ pathname: "/details", params: { ...requestData } });
      Alert.alert("Success", "Barangay ID request submitted successfully!");
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
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            Create Barangay ID
          </Text>

          {/* Input Group */}
          <View className="mb-4">
            <Text className="text-sm mb-1 text-gray-700">Full Name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Juan Dela Cruz"
              className="border border-gray-300 rounded-lg px-4 py-3 text-base bg-gray-50"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm mb-1 text-gray-700">Birth Date</Text>
            <TextInput
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="MM/DD/YYYY"
              className="border border-gray-300 rounded-lg px-4 py-3 text-base bg-gray-50"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm mb-1 text-gray-700">Address</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="123 Street, Barangay, City"
              className="border border-gray-300 rounded-lg px-4 py-3 text-base bg-gray-50"
            />
          </View>

          <View className="mb-6">
            <Text className="text-sm mb-1 text-gray-700">Contact Number</Text>
            <TextInput
              value={contactNumber}
              onChangeText={setContactNumber}
              placeholder="0912-345-6789"
              keyboardType="phone-pad"
              className="border border-gray-300 rounded-lg px-4 py-3 text-base bg-gray-50"
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className="bg-blue-600 rounded-full py-4 items-center"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Submit Request
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateIDScreen;
