import React, { useEffect } from "react";
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
  Modal,
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
import { styles } from "@/styles/rd_styles";
import ConfirmationModal from "@/components/ConfirmationModal";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RequestData {
  type: string;
  document_type: string;
  reason: string;
  clerk_id: string | null;
}

const RequestDocumentsScreen = () => {
  const router = useRouter();
  const { userId } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [documentType, setDocumentType] = useState("");
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDocumentDropdown, setShowDocumentDropdown] = useState(false);
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [lastSubmitted, setLastSubmitted] = useState<number | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [devBypassEnabled, setDevBypassEnabled] = useState(false);
  const [eligibilityModalVisible, setEligibilityModalVisible] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState("");

  const totalSteps = 2;

  const documentTypes = [
    "Barangay Clearance",
    "Certificate of Residency",
    "Certificate of Indigency",
    "Certificate of Good Moral Character",
    "Certificate of Employment",
    "Certificate of No Pending Case",
    "Other"
  ];

  const reasons = [
    "Job Application",
    "School Requirements",
    "Financial Assistance",
    "Medical Purposes",
    "Government Transaction",
    "Business Permit",
    "Other"
  ];

  useEffect(() => {
    (async () => {
      try {
        if (userId) {
          const url = `${process.env.EXPO_PUBLIC_API_URL}/api/requests/${userId}?t=${Date.now()}`;
          const r = await axios.get(url, { headers: { 'Cache-Control': 'no-cache' } });
          const items = (r.data || []).filter((x: any) => x.type === 'Create ID');
          const approved = items.some((x: any) => x.status === 'approved');
          setIsVerified(approved);
        } else {
          setIsVerified(false);
        }
      } catch (e) {
        setIsVerified(false);
      }
    })();
  }, [userId]);

  // Validation helpers
  const isValidDocumentType = (type: string) => type.trim().length > 0;

  const canSubmit = () => {
    // No validation - allow free submission
    return true;
  };

  const canProceedToNextStep = () => {
    // No validation for document type - allow free selection
    return true;
  };

  const handleFinalSubmit = () => {
    if (!canSubmit()) return;
    if (!devBypassEnabled && !isVerified) {
      setCooldownMessage("");
      setEligibilityModalVisible(true);
      return;
    }
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
    // Per-type weekly cooldown unless dev bypass
    if (!devBypassEnabled) {
      try {
        const resp = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}/api/requests/${userId}?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
        const docs: any[] = (resp.data || []).filter((x: any) => x.type === 'Document Request');
        const now = Date.now();
        const lastOfType = docs.filter((d: any) => d.document_type === documentType).sort((a: any, b: any) => (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))[0];
        if (lastOfType) {
          const t = lastOfType.created_at ? new Date(lastOfType.created_at).getTime() : 0;
          if (t && now - t < 7 * 24 * 60 * 60 * 1000) {
            setCooldownMessage(`You can request ${documentType} only once per week.`);
            setEligibilityModalVisible(true);
            return;
          }
        }
      } catch (e) {
        // do not block if fetch fails
      }
    }
    const finalReason = reason === "Other" ? otherReason : reason;
    const requestData: RequestData = {
      type: "Document Request",
      document_type: documentType,
      reason: finalReason,
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
    document_type: documentType,
    reason: reason === "Other" ? otherReason : reason,
  };

  const dataLabels = {
    document_type: "Document Type",
    reason: "Reason",
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
        <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>Document Type</Text>
        <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>Reason</Text>
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
      {/* Step 1: Document Type */}
      <View style={[styles.stepContent, { width: SCREEN_WIDTH }]}>
        <Animated.View 
          entering={SlideInRight.duration(400)}
          exiting={SlideOutLeft.duration(400)}
          style={styles.mainCard}
        >
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.iconGradient}
              >
                <Ionicons name="document-text" size={32} color="white" />
              </LinearGradient>
            </View>
            <Text style={styles.cardTitle}>Select Document Type</Text>
            <Text style={styles.cardSubtitle}>
              Choose the type of document you need from the barangay
            </Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Document Type</Text>
            <TouchableOpacity
              style={styles.pickerContainer}
              onPress={() => setShowDocumentDropdown(true)}
            >
              <Text style={[
                styles.picker,
                !documentType && { color: '#9ca3af' }
              ]}>
                {documentType || "Select a document type..."}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* Step 2: Reason */}
      <View style={[styles.stepContent, { width: SCREEN_WIDTH }]}>
        <Animated.View 
          entering={SlideInRight.duration(400)}
          exiting={SlideOutLeft.duration(400)}
          style={styles.mainCard}
        >
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.iconGradient}
              >
                <Ionicons name="chatbubble-ellipses" size={32} color="white" />
              </LinearGradient>
            </View>
            <Text style={styles.cardTitle}>Provide Reason</Text>
            <Text style={styles.cardSubtitle}>
              Please explain why you need this document
            </Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Reason for Request</Text>
            <TouchableOpacity
              style={styles.pickerContainer}
              onPress={() => setShowReasonDropdown(true)}
            >
              <Text style={[
                styles.picker,
                !reason && { color: '#9ca3af' }
              ]}>
                {reason || "Select a reason..."}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </TouchableOpacity>
            
            {reason === "Other" && (
              <Animated.View 
                entering={FadeInDown.duration(300)}
                style={{ marginTop: 16 }}
              >
                <Text style={styles.inputLabel}>Please specify:</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Enter your specific reason here..."
                    placeholderTextColor="#9ca3af"
                    value={otherReason}
                    onChangeText={setOtherReason}
                    multiline
                    numberOfLines={3}
                  />
                </View>
                <Text style={styles.inputHint}>
                  Please provide a detailed explanation (minimum 10 characters)
                </Text>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </View>
    </ScrollView>
  );

  const renderNavigation = () => (
    <View style={styles.navigationContainer}>
      {currentStep > 1 ? (
        <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color="#6b7280" />
          <Text style={styles.secondaryButtonText}>Previous</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ minWidth: 100 }} />
      )}

      {currentStep < totalSteps ? (
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleNext}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={[
            styles.submitButton,
            (!canSubmit() || loading) && styles.submitButtonDisabled
          ]} 
          onPress={() => {
            // Verify eligibility before confirmation
            if (!devBypassEnabled && !isVerified) {
              setCooldownMessage("");
              setEligibilityModalVisible(true);
              return;
            }
            handleFinalSubmit();
          }}
          disabled={!canSubmit() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.submitButtonText}>Submit</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderDropdownModal = (items: string[], selectedValue: string, onSelect: (value: string) => void, onClose: () => void, title: string, isVisible: boolean) => (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.dropdownOverlay}>
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.dropdownList}>
            {items.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dropdownItem,
                  selectedValue === item && styles.dropdownItemSelected
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedValue === item && styles.dropdownItemTextSelected
                ]}>
                  {item}
                </Text>
                {selectedValue === item && (
                  <Ionicons name="checkmark" size={20} color="#667eea" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Verify status loader */}
        {(() => {
          // Fetch verification once when component mounts
          // Using an IIFE here is not ideal; keep logic above instead if refactoring
          return null;
        })()}
        <LinearGradient
          colors={['#f8fafc', '#ffffff']}
          style={styles.background}
        />

        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.titleIcon}
              >
                <Ionicons name="document-text" size={24} color="white" />
              </LinearGradient>
              <TouchableOpacity
                activeOpacity={0.8}
                onLongPress={() => {
                  if (__DEV__) {
                    const next = !devBypassEnabled;
                    setDevBypassEnabled(next);
                    console.warn(`[DEV MODE] Document Request bypass ${next ? 'ENABLED' : 'DISABLED'}`);
                    Alert.alert('Dev Mode', `Bypass ${next ? 'enabled' : 'disabled'}`);
                  }
                }}
              >
                <Text style={styles.title}>Request Documents{__DEV__ && devBypassEnabled ? ' (DEV BYPASS)' : ''}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>
              Request official documents from the barangay office
            </Text>
          </View>
        </View>

        {renderProgressBar()}
        {renderStepContent()}
        {renderNavigation()}

        {/* Document Type Dropdown Modal */}
        {renderDropdownModal(
          documentTypes,
          documentType,
          setDocumentType,
          () => setShowDocumentDropdown(false),
          "Select Document Type",
          showDocumentDropdown
        )}

        {/* Reason Dropdown Modal */}
        {renderDropdownModal(
          reasons,
          reason,
          setReason,
          () => setShowReasonDropdown(false),
          "Select Reason",
          showReasonDropdown
        )}

        <ConfirmationModal
          visible={showConfirmation}
          data={confirmationData}
          dataLabels={dataLabels}
          onConfirm={handleConfirmSubmit}
          onEdit={handleEdit}
          onClose={() => setShowConfirmation(false)}
          loading={loading}
          title="Document Request"
        />

        {/* Eligibility / Cooldown Modal */}
        <Modal
          visible={eligibilityModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setEligibilityModalVisible(false)}
        >
          <View style={styles.dropdownOverlay}>
            <View style={styles.dropdownContainer}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Action Restricted</Text>
                <TouchableOpacity onPress={() => setEligibilityModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <View style={{ padding: 16 }}>
                <Text style={{ color: '#374151', fontSize: 16 }}>
                  {cooldownMessage || "You need to have a Barangay ID or complete verification first."}
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RequestDocumentsScreen;
