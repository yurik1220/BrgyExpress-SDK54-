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
  Image,
  Dimensions,
} from "react-native";
import { useState, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import axios from "axios";
import { useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, 
  FadeIn, 
  SlideInRight,
  SlideOutLeft,
  useAnimatedStyle,
  withSpring,
  interpolate,
  useSharedValue
} from 'react-native-reanimated';
import { styles } from "@/styles/cid_styles";
import * as LocalAuthentication from 'expo-local-authentication';

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
  const scrollViewRef = useRef<ScrollView>(null);
  const progress = useSharedValue(0);
  const [lastSubmitted, setLastSubmitted] = useState<number | null>(null);

  const totalSteps = 4;
  const progressWidth = (currentStep / totalSteps) * SCREEN_WIDTH;

  // Validation helpers
  const isValidName = (name: string) => /^[A-Za-z .,'-]+$/.test(name.trim()) && name.trim().length > 2;
  const isValidDate = (date: string) => {
    // MM/DD/YYYY
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

  const handleSubmit = async () => {
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

  const renderStepIndicator = () => (
    <Animated.View 
      entering={FadeInDown.duration(600)}
      style={styles.stepIndicatorContainer}
    >
      {[...Array(totalSteps)].map((_, index) => (
        <View key={index} style={styles.stepIndicatorWrapper}>
          <View style={[
            styles.stepIndicator,
            currentStep > index && styles.stepIndicatorActive
          ]}>
            {currentStep > index ? (
              <Ionicons name="checkmark" size={16} color="#ffffff" />
            ) : (
              <Text style={styles.stepNumber}>{index + 1}</Text>
            )}
          </View>
          {index < totalSteps - 1 && (
            <View style={[
              styles.stepLine,
              currentStep > index && styles.stepLineActive
            ]} />
          )}
        </View>
      ))}
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
        <View style={styles.stepHeader}>
          <Ionicons name="person-outline" size={32} color="#3b82f6" />
          <Text style={styles.stepTitle}>Your Full Name</Text>
          <Text style={styles.stepDescription}>
            Please enter your complete name as it appears on your birth certificate
          </Text>
        </View>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Juan Dela Cruz"
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />
      </Animated.View>

      {/* Step 2: Birth Date */}
      <Animated.View 
        entering={SlideInRight.duration(400)}
        exiting={SlideOutLeft.duration(400)}
        style={[styles.stepContent, { width: SCREEN_WIDTH }]}
      >
        <View style={styles.stepHeader}>
          <Ionicons name="calendar-outline" size={32} color="#3b82f6" />
          <Text style={styles.stepTitle}>Birth Date</Text>
          <Text style={styles.stepDescription}>
            Enter your date of birth in MM/DD/YYYY format
          </Text>
        </View>
        <TextInput
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="MM/DD/YYYY"
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />
      </Animated.View>

      {/* Step 3: Address */}
      <Animated.View 
        entering={SlideInRight.duration(400)}
        exiting={SlideOutLeft.duration(400)}
        style={[styles.stepContent, { width: SCREEN_WIDTH }]}
      >
        <View style={styles.stepHeader}>
          <Ionicons name="home-outline" size={32} color="#3b82f6" />
          <Text style={styles.stepTitle}>Your Address</Text>
          <Text style={styles.stepDescription}>
            Enter your complete residential address
          </Text>
        </View>
        <TextInput
          value={userAddress}
          onChangeText={setAddress}
          placeholder="123 Street, Barangay, City"
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />
      </Animated.View>

      {/* Step 4: Contact Number */}
      <Animated.View 
        entering={SlideInRight.duration(400)}
        exiting={SlideOutLeft.duration(400)}
        style={[styles.stepContent, { width: SCREEN_WIDTH }]}
      >
        <View style={styles.stepHeader}>
          <Ionicons name="call-outline" size={32} color="#3b82f6" />
          <Text style={styles.stepTitle}>Contact Number</Text>
          <Text style={styles.stepDescription}>
            Enter your active mobile number for updates
          </Text>
        </View>
        <TextInput
          value={contactNumber}
          onChangeText={setContactNumber}
          placeholder="0912-345-6789"
          keyboardType="phone-pad"
          style={styles.input}
          placeholderTextColor="#94a3b8"
        />
      </Animated.View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#f0f9ff', '#e0f2fe', '#bae6fd']}
        style={styles.gradientBackground}
      />
      <View style={styles.floatingDecoration} />
      <View style={styles.floatingDecoration2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <Animated.View 
          entering={FadeInDown.duration(600)}
          style={styles.header}
        >
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
            Follow the steps below to request your official barangay identification card
          </Text>
        </Animated.View>

        {renderStepIndicator()}
        
        <View style={{ flex: 1 }}>
          {renderStepContent()}
        </View>

        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#3b82f6" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          {currentStep < totalSteps ? (
            <TouchableOpacity
              onPress={handleNext}
              style={styles.nextButton}
            >
              <Text style={styles.nextButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={24} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleFinalSubmit}
              disabled={loading}
              style={styles.submitButton}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                  <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateIDScreen;