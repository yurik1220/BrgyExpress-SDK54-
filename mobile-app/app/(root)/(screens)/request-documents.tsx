import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router"; // Correct import for useRouter
import CustomButton from "@/components/CustomButton";
import styles from "@/styles/styles";
import axios from "axios"; // Import axios for HTTP requests

// Define type for request data
interface RequestData {
  type: string;
  document: string;
  reason: string;
  user: string;
}

const RequestDocumentsScreen = () => {
  const router = useRouter(); // Add router hook

  const [selectedDocument, setSelectedDocument] = useState<string>("residency");
  const [selectedReason, setSelectedReason] = useState<string>("job");
  const [loading, setLoading] = useState<boolean>(false); // Loading state for submit button

  const handleSubmit = async () => {
    if (!selectedDocument || !selectedReason) {
      alert("Please select both document and reason.");
      return;
    }

    // Prepare data for submission
    const requestData: RequestData = {
      type: "Document Request",
      document: selectedDocument,
      reason: selectedReason,
      user: "User Name", // Replace with actual user data (e.g., from auth context)
    };

    try {
      setLoading(true); // Set loading state when submitting

      // Make POST request to backend
      const response = await axios.post(
        "http://192.168.254.106:5000/api/requests", // Use your IP address here
        requestData,
      );

      console.log("Request submitted successfully:", response.data);

      // Navigate to the details page with the request data using params
      router.push({
        pathname: "/details", // Make sure this path matches the details screen
        params: { ...requestData }, // Pass data through params
      });

      alert("Request submitted successfully!");
    } catch (error) {
      console.error("Error submitting request:", error);
      alert("There was an error submitting your request. Please try again.");
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Request a Barangay Document</Text>

      <View style={styles.dropdownContainer}>
        <Text style={styles.label}>Select Document Type:</Text>
        <Picker
          selectedValue={selectedDocument}
          onValueChange={(itemValue) => setSelectedDocument(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Certificate of Residency" value="residency" />
          <Picker.Item label="Certificate of Indigency" value="indigency" />
          <Picker.Item label="Barangay Clearance" value="clearance" />
        </Picker>
      </View>

      <View style={styles.dropdownContainer}>
        <Text style={styles.label}>Reason for Requesting:</Text>
        <Picker
          selectedValue={selectedReason}
          onValueChange={(itemValue) => setSelectedReason(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Job Requirement" value="job" />
          <Picker.Item label="School Requirement" value="school" />
          <Picker.Item label="Financial Assistance" value="financial" />
          <Picker.Item label="Medical Assistance" value="medical" />
          <Picker.Item label="Other" value="other" />
        </Picker>
      </View>

      <CustomButton
        title={loading ? "Submitting..." : "Submit Request"}
        onPress={handleSubmit}
        bgVariant="primary"
        textVariant="default"
        style={styles.submitButton}
        disabled={loading} // Disable button while loading
      />
    </SafeAreaView>
  );
};

export default RequestDocumentsScreen;
