import { View, Text, TextInput, ScrollView, Button, Alert } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import axios from "axios";

// Define type for request data
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
  const [loading, setLoading] = useState<boolean>(false);

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
      user: "User Name", // Replace with actual user info
    };

    try {
      setLoading(true);

      const response = await axios.post(
        "http://192.168.254.106:5000/api/requests",
        requestData,
      );

      console.log("Request submitted successfully:", response.data);

      router.push({
        pathname: "/details",
        params: { ...requestData },
      });

      Alert.alert("Success", "Barangay ID request submitted successfully!");
    } catch (error) {
      console.error("Error submitting request:", error);
      Alert.alert("Error", "There was an error submitting your request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-4 py-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-xl font-bold mb-4">Create Barangay ID</Text>

        <Text className="mb-1">Full Name</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Juan Dela Cruz"
          className="border border-gray-300 rounded-md px-3 py-2 mb-4"
        />

        <Text className="mb-1">Birth Date</Text>
        <TextInput
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="MM/DD/YYYY"
          className="border border-gray-300 rounded-md px-3 py-2 mb-4"
        />

        <Text className="mb-1">Address</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="123 Street, Barangay Name, City"
          className="border border-gray-300 rounded-md px-3 py-2 mb-4"
        />

        <Text className="mb-1">Contact Number</Text>
        <TextInput
          value={contactNumber}
          onChangeText={setContactNumber}
          placeholder="0912-345-6789"
          keyboardType="phone-pad"
          className="border border-gray-300 rounded-md px-3 py-2 mb-6"
        />

        <Button
          title={loading ? "Submitting..." : "Submit Request"}
          onPress={handleSubmit}
          color="#4CAF50"
          disabled={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateIDScreen;
