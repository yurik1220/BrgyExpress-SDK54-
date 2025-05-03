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

interface RequestData {
  type: string;
  document_type: string;
  reason: string;
  clerk_id: string;
  created_at?: string;
  status?: string;
}

const RequestDocumentsScreen = () => {
  const router = useRouter();
  const { userId } = useAuth();

  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("residency");
  const [selectedReason, setSelectedReason] = useState<string>("job");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!selectedDocumentType || !selectedReason) {
      Alert.alert("Missing Information", "Please select both document and reason.");
      return;
    }

    if (!userId) {
      Alert.alert("Authentication Error", "User not authenticated. Please log in again.");
      return;
    }

    const requestData: RequestData = {
      type: "Document Request",
      document_type: selectedDocumentType,
      reason: selectedReason,
      clerk_id: userId,
    };

    try {
      setLoading(true);
      const response = await axios.post("http://192.168.254.106:5000/api/requests", requestData);

      // Replace current screen with details and prevent going back to form
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
          fromSubmission: 'true' // Add this flag
        } as never
      });

      // Removed the success alert since we're navigating directly to details
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.message || "There was an error submitting your request.");
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

        <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.heading}>Request Documents</Text>
            <Text style={styles.subheading}>
              Select the document you need from our barangay services
            </Text>
          </View>

          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <Image
                  source={require('@/assets/images/doc_icon.png')}
                  style={styles.icon}
                  resizeMode="contain"
              />
            </View>
          </View>

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