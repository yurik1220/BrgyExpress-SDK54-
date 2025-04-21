import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { useState } from "react";
import { useRouter } from "expo-router"; // Correct import for useRouter
import CustomButton from "@/components/CustomButton";
import styles from "@/styles/styles";

export default function RequestDocumentsScreen() {
  const router = useRouter(); // Add router hook

  const [selectedDocument, setSelectedDocument] = useState("residency");
  const [selectedReason, setSelectedReason] = useState("job");

  const handleSubmit = () => {
    if (!selectedDocument || !selectedReason) {
      alert("Please select both document and reason.");
      return;
    }

    // Prepare data for submission
    const requestData = {
      type: "Document Request",
      document: selectedDocument,
      reason: selectedReason,
    };

    // Navigate to the details page with the request data using params
    router.push({
      pathname: "/details", // Make sure this path matches the details screen
      params: { ...requestData }, // Pass data through params
    });
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
        title="Submit Request"
        onPress={handleSubmit}
        bgVariant="primary"
        textVariant="default"
        style={styles.submitButton}
      />
    </SafeAreaView>
  );
}
