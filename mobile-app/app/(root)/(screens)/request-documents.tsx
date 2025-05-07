import React, { useState } from "react";
import { View, Text, Alert, ScrollView, Image, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import CustomButton from "@/components/CustomButton";
import { styles } from "@/styles/rd_styles";
import axios from "axios";
import { useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as LocalAuthentication from 'expo-local-authentication';

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

  // Tracks the last submission time
  const [lastSubmitted, setLastSubmitted] = useState<number | null>(null);

  // Validation helpers
  const isValidDocumentType = (doc: string) => ["residency", "indigency", "clearance"].includes(doc);
  const isValidReason = (reason: string) => ["job", "school", "financial", "medical", "other"].includes(reason);

  const canSubmit = () => {
    if (!isValidDocumentType(selectedDocumentType)) {
      Alert.alert("Invalid Document Type", "Please select a valid document type.");
      return false;
    }
    if (!isValidReason(selectedReason)) {
      Alert.alert("Invalid Reason", "Please select a valid reason for your request.");
      return false;
    }
    return true;
  };

  const handleFinalSubmit = () => {
    if (!canSubmit()) return;
    if (lastSubmitted && Date.now() - lastSubmitted < 30000) {
      Alert.alert("Please wait", "You can only submit a request every 30 seconds.");
      return;
    }
    Alert.alert(
      'Confirm Submission',
      'Are you sure all information is correct? Submitting false information is punishable.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: handleBiometricAuth }
      ]
    );
  };

  const handleBiometricAuth = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert('Biometric authentication not available', 'Your device does not support biometrics or no biometrics are enrolled.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to submit your request',
        fallbackLabel: 'Enter device passcode',
        cancelLabel: 'Cancel',
      });
      if (result.success) {
        handleSubmit();
      } else {
        Alert.alert('Authentication Failed', 'Biometric authentication was not successful.');
      }
    } catch (error) {
      Alert.alert('Authentication Error', 'An error occurred during biometric authentication.');
    }
  };

  // Handles form submission logic
  const handleSubmit = async () => {
    if (!canSubmit()) return;
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
      const response = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/api/requests`, requestData);
      setLastSubmitted(Date.now());
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
          fromSubmission: 'true'
        } as never
      });
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.message || "There was an error submitting your request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Background with animated gradient */}
      <LinearGradient
        colors={['#f0f9ff', '#e0f2fe', '#bae6fd']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />
      <Animated.View 
        entering={FadeIn.duration(1000)}
        style={styles.floatingDecoration} 
      />
      <Animated.View 
        entering={FadeIn.duration(1000).delay(200)}
        style={styles.floatingDecoration2} 
      />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Header Section */}
        <Animated.View 
          entering={FadeInDown.duration(800).springify()}
          style={styles.header}
        >
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.iconBackground}
            >
              <Image
                source={require('@/assets/images/doc_icon.png')}
                style={styles.icon}
                resizeMode="contain"
              />
            </LinearGradient>
          </View>
          <Text style={styles.heading}>Request Documents</Text>
          <Text style={styles.subheading}>
            Select the document you need from our barangay services
          </Text>
        </Animated.View>

        {/* Enhanced Document Type Selection */}
        <Animated.View 
          entering={FadeInDown.duration(800).delay(100).springify()}
          style={styles.cardContainer}
        >
          <View style={styles.card}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.cardGradient}
            />
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Ionicons name="document-text-outline" size={24} color="#3b82f6" />
                <Text style={styles.label}>Document Type</Text>
              </View>
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
        </Animated.View>

        {/* Enhanced Reason Selection */}
        <Animated.View 
          entering={FadeInDown.duration(800).delay(200).springify()}
          style={styles.cardContainer}
        >
          <View style={styles.card}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.cardGradient}
            />
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Ionicons name="help-circle-outline" size={24} color="#3b82f6" />
                <Text style={styles.label}>Reason for Request</Text>
              </View>
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
        </Animated.View>

        {/* Enhanced Submit Button */}
        <Animated.View 
          entering={FadeInDown.duration(800).delay(300).springify()}
          style={styles.buttonContainer}
        >
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && { opacity: 0.7 }
            ]}
            onPress={handleFinalSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Submit Request</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RequestDocumentsScreen;
