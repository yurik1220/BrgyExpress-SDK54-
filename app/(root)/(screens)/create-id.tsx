import { View, Text, TextInput, ScrollView, Button } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router"; // Correct import for useRouter

export default function CreateIDScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const handleSubmit = () => {
    // You can send this data to your backend here
    alert("Barangay ID request submitted!");

    // Navigate to the details screen and pass the data using params
    router.push({
      pathname: "/details", // Make sure this matches the details route
      params: {
        documentType: "Barangay ID", // You can replace this with actual type
        reason: "Request for Barangay ID", // Replace with the reason
        fullName,
        birthDate,
        address,
        contactNumber,
      },
    });
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

        <Button title="Submit Request" onPress={handleSubmit} color="#4CAF50" />
      </ScrollView>
    </SafeAreaView>
  );
}
