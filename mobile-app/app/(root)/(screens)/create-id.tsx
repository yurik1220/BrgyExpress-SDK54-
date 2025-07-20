import React from "react";
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
  Dimensions,
} from "react-native";
import { useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import axios from "axios";
import { useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, 
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { styles } from "@/styles/cid_styles";
import ConfirmationModal from "@/components/ConfirmationModal";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [currentStep, setCurrentStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [userAddress, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [lastSubmitted, setLastSubmitted] = useState<number | null>(null);

  const totalSteps = 4;

  // Validation helpers
  const isValidName = (name: string) => /^[A-Za-z .,'-]+$/.test(name.trim()) && name.trim().length > 2;
  const isValidDate = (date: string) => {
    const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    if (!regex.test(date)) return false;
    const [month, day, year] = date.split('/').map(Number);
    const d = new Date(year, month - 1, day);
    return d.getMonth() + 1 === month && d.getDate() === day && d.getFullYear() === year;
  };
  const isValidPhone = (phone: string) => /^09\d{9}$/.test(phone.replace(/[- ]/g, ''));
  const isValidAddress = (addr: string) => addr.trim().length > 5;

  const canSubmit = () => {
    if (!isValidName(fullName)) {
      Alert.alert("Invalid Name", "Please enter a valid full name (letters and spaces only).");
      return false;
    }
    if (!isValidDate(birthDate)) {
      Alert.alert("Invalid Birth Date", "Please enter a valid date in MM/DD/YYYY format.");
      return false;
    }
    if (!isValidAddress(userAddress)) {
      Alert.alert("Invalid Address", "Please enter a valid address.");
      return false;
    }
    if (!isValidPhone(contactNumber)) {
      Alert.alert("Invalid Contact Number", "Please enter a valid PH mobile number (e.g., 09xx-xxx-xxxx).");
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
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    if (!canSubmit()) return;
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
      const response = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/api/requests`, requestData);
      setLastSubmitted(Date.now());
      setShowConfirmation(false);
      router.replace({
        pathname: "/details",
        params: {
          ...response.data,
          fromSubmission: 'true'
        },
      });
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

  const handleEdit = () => {
    setShowConfirmation(false);
  };

  const formatBirthDate = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    
    // Format as MM/DD/YYYY
    if (cleaned.length <= 2) {
      return cleaned;
    } else if (cleaned.length <= 4) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
  };

  const handleBirthDateChange = (text: string) => {
    const formatted = formatBirthDate(text);
    setBirthDate(formatted);
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
      scrollViewRef.current?.scrollTo({ x: currentStep * SCREEN_WIDTH, animated: true });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      scrollViewRef.current?.scrollTo({ x: (currentStep - 2) * SCREEN_WIDTH, animated: true });
    }
  };



  // Prepare data for confirmation modal
  const confirmationData = {
    full_name: fullName,
    birth_date: birthDate,
    address: userAddress,
    contact: contactNumber,
  };

  const dataLabels = {
    full_name: "Full Name",
    birth_date: "Birth Date",
    address: "Address",
    contact: "Contact Number",
  };

  const renderProgressBar = () => (
    <Animated.View 
      entering={FadeInDown.duration(600)}
      style={styles.progressContainer}
    >
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
      </View>
      <View style={styles.stepLabels}>
        <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>Personal</Text>
        <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>Birth</Text>
        <Text style={[styles.stepLabel, currentStep >= 3 && styles.stepLabelActive]}>Address</Text>
        <Text style={[styles.stepLabel, currentStep >= 4 && styles.stepLabelActive]}>Contact</Text>
      </View>
    </Animated.View>
  );

  const renderStepContent = () => (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      scrollEnabled={false}
      style={styles.stepsContainer}
    >
      {/* Step 1: Full Name */}
      <Animated.View 
        entering={SlideInRight.duration(400)}
        exiting={SlideOutLeft.duration(400)}
        style={[styles.stepContent, { width: SCREEN_WIDTH }]}
      >
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.iconGradient}
              >
                <Ionicons name="person" size={24} color="white" />
              </LinearGradient>
            </View>
            <Text style={styles.cardTitle}>Personal Information</Text>
            <Text style={styles.cardSubtitle}>
              Enter your complete legal name as it appears on official documents
            </Text>
          </View>
          
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                style={styles.textInput}
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
              />
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Step 2: Birth Date */}
      <Animated.View 
        entering={SlideInRight.duration(400)}
        exiting={SlideOutLeft.duration(400)}
        style={[styles.stepContent, { width: SCREEN_WIDTH }]}
      >
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={['#f093fb', '#f5576c']}
                style={styles.iconGradient}
              >
                <Ionicons name="calendar" size={24} color="white" />
              </LinearGradient>
            </View>
            <Text style={styles.cardTitle}>Date of Birth</Text>
            <Text style={styles.cardSubtitle}>
              Provide your exact date of birth in the specified format
            </Text>
          </View>
          
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Birth Date</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="calendar-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                value={birthDate}
                onChangeText={handleBirthDateChange}
                placeholder="MM/DD/YYYY"
                style={styles.textInput}
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            <Text style={styles.inputHint}>Format: MM/DD/YYYY (e.g., 01/15/1990)</Text>
          </View>
        </View>
      </Animated.View>

      {/* Step 3: Address */}
      <Animated.View 
        entering={SlideInRight.duration(400)}
        exiting={SlideOutLeft.duration(400)}
        style={[styles.stepContent, { width: SCREEN_WIDTH }]}
      >
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={['#4facfe', '#00f2fe']}
                style={styles.iconGradient}
              >
                <Ionicons name="location" size={24} color="white" />
              </LinearGradient>
            </View>
            <Text style={styles.cardTitle}>Residential Address</Text>
            <Text style={styles.cardSubtitle}>
              Enter your complete and current residential address
            </Text>
          </View>
          
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Complete Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                value={userAddress}
                onChangeText={setAddress}
                placeholder="Street, Barangay, City, Province"
                style={[styles.textInput, styles.textArea]}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Step 4: Contact Number */}
      <Animated.View 
        entering={SlideInRight.duration(400)}
        exiting={SlideOutLeft.duration(400)}
        style={[styles.stepContent, { width: SCREEN_WIDTH }]}
      >
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={['#43e97b', '#38f9d7']}
                style={styles.iconGradient}
              >
                <Ionicons name="call" size={24} color="white" />
              </LinearGradient>
            </View>
            <Text style={styles.cardTitle}>Contact Information</Text>
            <Text style={styles.cardSubtitle}>
              Provide your active mobile number for updates and notifications
            </Text>
          </View>
          
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Mobile Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                value={contactNumber}
                onChangeText={setContactNumber}
                placeholder="0912-345-6789"
                keyboardType="phone-pad"
                style={styles.textInput}
                placeholderTextColor="#9ca3af"
              />
            </View>
            <Text style={styles.inputHint}>Format: 09XX-XXX-XXXX</Text>
          </View>
        </View>
      </Animated.View>


    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#f8fafc', '#e2e8f0']}
        style={styles.background}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        {/* Header */}
        <Animated.View 
          entering={FadeInDown.duration(600)}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.titleIcon}
              >
                <Ionicons name="id-card" size={28} color="white" />
              </LinearGradient>
              <Text style={styles.title}>Create Barangay ID</Text>
            </View>
            <Text style={styles.subtitle}>
              Complete the form below to request your official identification card
            </Text>
          </View>
        </Animated.View>

        {renderProgressBar()}
        
        <View style={{ flex: 1 }}>
          {renderStepContent()}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {currentStep > 1 && (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.secondaryButton}
            >
              <Ionicons name="arrow-back" size={20} color="#6b7280" />
              <Text style={styles.secondaryButtonText}>Previous</Text>
            </TouchableOpacity>
          )}

          {currentStep < totalSteps ? (
            <TouchableOpacity
              onPress={handleNext}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleFinalSubmit}
              disabled={loading}
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmSubmit}
        onEdit={handleEdit}
        title="ID Request"
        data={confirmationData}
        dataLabels={dataLabels}
        loading={loading}
      />
    </SafeAreaView>
  );
};

export default CreateIDScreen;