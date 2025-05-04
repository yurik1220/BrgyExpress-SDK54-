import React, { useState } from "react";
import { View, Text, Alert, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import CustomButton from "@/components/CustomButton";
import { styles } from "@/styles/rd_styles";
import axios from "axios";
import { useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";

// Define the structure of the data to be submitted
interface RequestData {
  type: string;
  document_type: string;
  reason: string;
  clerk_id: string;
  created_at?: string;
  status?: string;
}

// Component for handling document request form
const RequestDocumentsScreen = () => {
  const router = useRouter(); // For navigating between screens
  const { userId } = useAuth(); // Get logged-in user's ID

  // Store selected document type
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("residency");

  // Store selected reason for the request
  const [selectedReason, setSelectedReason] = useState<string>("job");

  // Tracks loading state during form submission
  const [loading, setLoading] = useState<boolean>(false);

  // Handles form submission logic
  const handleSubmit = async () => {
    // Check if required selections are made
    if (!selectedDocumentType || !selectedReason) {
      Alert.alert("Missing Information", "Please select both document and reason.");
      return;
    }

    // Check if user is authenticated
    if (!userId) {
      Alert.alert("Authentication Error", "User not authenticated. Please log in again.");
      return;
    }

    // Create request payload
    const requestData: RequestData = {
      type: "Document Request",
      document_type: selectedDocumentType,
      reason: selectedReason,
      clerk_id: userId,
    };

    try {
      setLoading(true); // Set loading state while request is processing

      // Send request data to backend API
      const response = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/api/requests`, requestData);

      // Navigate to details screen with response data and submission flag
      router.replace({
        pathname: "/details",
        params: {
          ...response.data,
          type: "Document Request",
          document_type: selectedDocumentType,
          reason: selectedReason,
          clerk_id: userId,
          created_at: response.data.created_at || new Date().toISOString(),
          status: "pending",
          fromSubmission: 'true' // Used to indicate navigation from submission
        } as never
      });

      // No alert shown because navigation replaces screen
    } catch (error: any) {
      // Display error if submission fails
      Alert.alert("Error", error?.response?.data?.message || "There was an error submitting your request.");
    } finally {
      setLoading(false); // Reset loading state after request is handled
    }
  };

  return (
      // Main safe area container
      <SafeAreaView style={styles.container}>
        {/* Background gradient decoration */}
        <LinearGradient
            colors={['#f0f9ff', '#e0f2fe', '#bae6fd']}
            style={styles.gradientBackground}
        />
        <View style={styles.floatingDecoration} />
        <View style={styles.floatingDecoration2} />

        {/* Scrollable form content */}
        <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
        >
          {/* Header text */}
          <View style={styles.header}>
            <Text style={styles.heading}>Request Documents</Text>
            <Text style={styles.subheading}>
              Select the document you need from our barangay services
            </Text>
          </View>

          {/* Icon graphic section */}
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <Image
                  source={require('@/assets/images/doc_icon.png')}
                  style={styles.icon}
                  resizeMode="contain"
              />
            </View>
          </View>

          {/* Card for document type selection */}
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.cardGradient}
              />
              <Text style={styles.label}>Document Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={selectedDocumentType}
                    onValueChange={setSelectedDocumentType}
                    style={styles.picker}
                    dropdownIconColor="#64748b"
                >
                  <Picker.Item label="Certificate of Residency" value="residency" />
                  <Picker.Item label="Certificate of Indigency" value="indigency" />
                  <Picker.Item label="Barangay Clearance" value="clearance" />
                </Picker>
              </View>
            </View>
          </View>

          {/* Card for reason selection */}
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.cardGradient}
              />
              <Text style={styles.label}>Reason for Request</Text>
              <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={selectedReason}
                    onValueChange={setSelectedReason}
                    style={styles.picker}
                    dropdownIconColor="#64748b"
                >
                  <Picker.Item label="Job Requirement" value="job" />
                  <Picker.Item label="School Requirement" value="school" />
                  <Picker.Item label="Financial Assistance" value="financial" />
                  <Picker.Item label="Medical Assistance" value="medical" />
                  <Picker.Item label="Other Purpose" value="other" />
                </Picker>
              </View>
            </View>
          </View>

          {/* Submit button */}
          <CustomButton
              title={loading ? "Processing..." : "Submit Request"}
              onPress={handleSubmit}
              bgVariant="gradient"
              textVariant="light"
              style={styles.submitButton}
              disabled={loading}
          />
        </ScrollView>
      </SafeAreaView>
  );
};

export default RequestDocumentsScreen;
