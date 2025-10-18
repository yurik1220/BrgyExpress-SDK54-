import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
  Linking,
  Share,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import axios from "axios";
import { useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import ConfirmationModal from "@/components/ConfirmationModal";
import * as ImagePicker from 'expo-image-picker';
import ImageCropPicker from 'react-native-image-crop-picker';
import FaceVerificationCamera from "@/components/FaceVerificationCamera";
import luxand, { FaceVerificationResult, liveness as luxandLiveness, verifyFace as luxandVerify } from "@/lib/luxand";
import { PH_GEOGRAPHY } from "@/constants/ph-geo";
import DocumentScanner from 'react-native-document-scanner-plugin';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

interface RequestData {
  type: string;
  full_name: string;
  birth_date: string;
  address: string;
  contact: string;
  clerk_id: string | null;
  face_verification?: FaceVerificationResult;
  // extra address breakdown for backend/reference
  region?: string;
  city?: string;
  barangay?: string;
}

type DevOverrideMode = 'auto' | 'force_form' | 'force_view';

const CreateIDScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userId } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  // Name (split inputs) and combined value
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fullName, setFullName] = useState("");
  // Address (split inputs) and combined value
  const [addrUnit, setAddrUnit] = useState("");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrPurok, setAddrPurok] = useState("");
  const [addrBarangay, setAddrBarangay] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrProvince, setAddrProvince] = useState("");
  const [addrRegion, setAddrRegion] = useState("");
  const [addrZip, setAddrZip] = useState("");
  const [userAddress, setAddress] = useState("");
  // Birth date
  const [birthDate, setBirthDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<number>(1);
  const [pickerDay, setPickerDay] = useState<number>(1);
  const [pickerYear, setPickerYear] = useState<number>(2000);
  // Address fields (removed duplicates)
  const [contactNumber, setContactNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<number | null>(null);
  const [faceVerificationResult, setFaceVerificationResult] = useState<FaceVerificationResult | null>(null);
  const [idImage, setIdImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [billImage, setBillImage] = useState<string | null>(null);
  const [idImageUrl, setIdImageUrl] = useState<string | null>(null);
  const [selfieImageUrl, setSelfieImageUrl] = useState<string | null>(null);
  const [billImageUrl, setBillImageUrl] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<any | null>(null);
  const [devMode, setDevMode] = useState<DevOverrideMode>('auto');
  const [isVerifying, setIsVerifying] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);

  // Debug success modal visibility
  useEffect(() => {
    console.log('Success modal visibility changed:', successVisible);
  }, [successVisible]);




  const [successTitle, setSuccessTitle] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Cascading geo data imported from constants

  // Picker visibility
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showBarangayPicker, setShowBarangayPicker] = useState(false);

  // Form validation states
  const [nameError, setNameError] = useState("");
  const [dateError, setDateError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [contactError, setContactError] = useState("");

  const totalSteps = 4;
  // Dev override loader
  useEffect(() => {
    const env = process.env.EXPO_PUBLIC_DEV_ID_MODE as DevOverrideMode | undefined;
    const qp = (params?.override as string | undefined)?.toLowerCase();
    if (qp === 'auto' || qp === 'force_form' || qp === 'force_view') {
      setDevMode(qp);
    } else if (env === 'auto' || env === 'force_form' || env === 'force_view') {
      setDevMode(env);
    }
  }, []);

  // Hidden dev toggle: long press header to cycle modes
  const cycleDevMode = async () => {
    const next: DevOverrideMode = devMode === 'auto' ? 'force_form' : devMode === 'force_form' ? 'force_view' : 'auto';
    setDevMode(next);
    Alert.alert('Dev Mode', `Create ID override: ${next}`);
  };

  // Fetch latest ID request for gating, and refetch when screen refocuses
  const fetchLatestId = async () => {
    if (!userId) return;
    try {
      const url = `${process.env.EXPO_PUBLIC_API_URL}/api/requests/${userId}?t=${Date.now()}`;
      const r = await axios.get(url, { headers: { 'Cache-Control': 'no-cache' } });
      const items = (r.data || []).filter((x: any) => x.type === 'Create ID');
      if (!items.length) { setExistingId(null); return; }
      const parseWhen = (row: any) => {
        const candidates = [row.id_card_generated_at, row.updated_at, row.created_at];
        for (const c of candidates) {
          const t = c ? new Date(c as any).getTime() : NaN;
          if (!isNaN(t)) return t;
        }
        // fallback: numeric id if available
        if (typeof row.id === 'number') return row.id;
        return 0;
      };
      const byDateDesc = (a: any, b: any) => parseWhen(b) - parseWhen(a);
      const latestApproved = items.filter((x: any) => x.status === 'approved').sort(byDateDesc)[0];
      const latestAny = items.sort(byDateDesc)[0];
      setExistingId(latestApproved || latestAny || null);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => { fetchLatestId(); }, [userId]);
  // Also refetch when the screen regains focus so newly generated images appear
  useFocusEffect(
    useCallback(() => {
      fetchLatestId();
      return () => {};
    }, [userId])
  );

  const isPersonalInfoValid = () =>
    isValidName(firstName) &&
    isValidName(lastName) &&
    isValidDate(birthDate) &&
    isValidAddressParts() &&
    isValidPhone(contactNumber);

  // Validation helpers
  const isValidName = (name: string) => /^[A-Za-z .,'-]+$/.test(name.trim()) && name.trim().length > 1;
  const isValidDate = (date: string) => {
    const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    if (!regex.test(date)) return false;
    
    const [month, day, year] = date.split('/').map(Number);
    const d = new Date(year, month - 1, day);
    return d.getMonth() + 1 === month && d.getDate() === day && d.getFullYear() === year;
  };
  const isValidPhone = (phone: string) => /^09\d{9}$/.test(phone.replace(/[- ]/g, ''));
  const isValidAddress = (addr: string) => addr.trim().length > 5;
  const isValidZip = (zip: string) => /^\d{4,5}$/.test(zip.trim());
  const isValidAddressParts = () =>
    addrStreet.trim().length > 2 &&
    addrBarangay.trim().length > 2 &&
    addrCity.trim().length > 2 &&
    addrRegion.trim().length > 2 &&
    isValidZip(addrZip);

  // Real-time validation
  const validateName = (name: string) => {
    if (!name.trim()) {
      setNameError("Full name is required");
      return false;
    }
    if (!isValidName(name)) {
      setNameError("Please enter a valid name (letters and spaces only)");
      return false;
    }
    setNameError("");
    return true;
  };

  const validateDate = (date: string) => {
    if (!date.trim()) {
      setDateError("Birth date is required");
      return false;
    }
    if (!isValidDate(date)) {
      setDateError("Please enter a valid date (MM/DD/YYYY)");
      return false;
    }
    setDateError("");
    return true;
  };

  const validateAddress = (address: string) => {
    if (!address.trim()) {
      setAddressError("Address is required");
      return false;
    }
    if (!isValidAddress(address)) {
      setAddressError("Please enter a complete address");
      return false;
    }
    setAddressError("");
    return true;
  };
  const validateAddressParts = () => {
    if (!isValidAddressParts()) {
      setAddressError("Please complete your address");
      return false;
    }
    setAddressError("");
    return true;
  };

  // Combine helpers
  const updateFullNameFromParts = (f: string, m: string, l: string) => {
    const combined = `${f} ${m ? m + ' ' : ''}${l}`.replace(/\s+/g, ' ').trim();
    setFullName(combined);
  }; 
  const updateAddressFromParts = (
    unit: string,
    street: string,
    _purok: string,
    brgy: string,
    city: string,
    _prov: string,
    region: string,
    zip: string
  ) => {
    // Compose address without purok and province per new requirements
    const parts = [unit, street, brgy, city, region, zip].filter(Boolean);
    setAddress(parts.join(', '));
  };

  const validateContact = (contact: string) => {
    if (!contact.trim()) {
      setContactError("Contact number is required");
      return false;
    }
    if (!isValidPhone(contact)) {
      setContactError("Please enter a valid PH mobile number");
      return false;
    }
    setContactError("");
    return true;
  };

  // Pure readiness check (no setState or alerts) to avoid render loops
  const canSubmit = () => {
    const fieldsValid =
      isValidName(firstName) &&
      isValidName(lastName) &&
      isValidDate(birthDate) &&
      isValidAddressParts() &&
      isValidPhone(contactNumber);
    if (!fieldsValid) return false;
    if (!idImage || !selfieImage || !billImage) return false;
    if (!faceVerificationResult) return false;
    return true;
  };

  const handleFinalSubmit = () => {
    // Imperative validation with error messages
    const nameValid = validateName(fullName);
    const dateValid = validateDate(birthDate);
    const addressValid = validateAddress(userAddress);
    const contactValid = validateContact(contactNumber);
    if (!nameValid || !dateValid || !addressValid || !contactValid) return;

    if (!idImage || !selfieImage || !billImage) {
      Alert.alert("Requirements Missing", "Please upload your ID, take a selfie, and add your Meralco bill.");
      return;
    }
    if (!faceVerificationResult) {
      Alert.alert("Face Verification Required", "Please complete the face verification step to continue.");
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
    const requestData: RequestData = {
      type: "Create ID",
      full_name: fullName,
      birth_date: birthDate,
      address: userAddress,
      contact: contactNumber,
      clerk_id: userId,
      face_verification: faceVerificationResult || undefined,
      region: addrRegion || undefined,
      city: addrCity || undefined,
      barangay: addrBarangay || undefined,
    };
    try {
      setLoading(true);
      // Upload images first if we only have local URIs
      let idUrl = idImageUrl;
      let selfieUrl = selfieImageUrl;
      let billUrl = billImageUrl;
      try {
        if (idImage && !idUrl) {
          idUrl = await uploadImageToServer(idImage);
        }
        if (selfieImage && !selfieUrl) {
          selfieUrl = await uploadImageToServer(selfieImage);
        }
        if (billImage && !billUrl) {
          billUrl = await uploadImageToServer(billImage);
        }
      } catch (e) {
        Alert.alert('Upload Failed', 'Could not upload images. Please try again.');
        setLoading(false);
        return;
      }

      const response = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/api/requests`, {
        ...requestData,
        id_image_url: idUrl || undefined,
        selfie_image_url: selfieUrl || undefined,
        bill_image_url: billUrl || undefined,
      });
      // sync latest URLs to state after success
      if (idUrl) setIdImageUrl(idUrl);
      if (selfieUrl) setSelfieImageUrl(selfieUrl);
      if (billUrl) setBillImageUrl(billUrl);
      setLastSubmitted(Date.now());
      setShowConfirmation(false);
      // Show waiting view on this screen until barangay approval
      try { setExistingId(response.data); } catch {}
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
    const cleaned = text.replace(/\D/g, '');
    
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
    if (formatted.length === 10) {
      validateDate(formatted);
    }
  };
  const openDatePicker = () => {
    // Initialize pickers from current birthDate or defaults
    try {
      const [m, d, y] = birthDate.split('/') as any;
      const mi = parseInt(m) || 1;
      const di = parseInt(d) || 1;
      const yi = parseInt(y) || 2000;
      setPickerMonth(mi);
      setPickerDay(di);
      setPickerYear(yi);
    } catch {}
    setShowDatePicker(true);
  };
  const applyPickedDate = () => {
    const mm = String(pickerMonth).padStart(2, '0');
    const dd = String(pickerDay).padStart(2, '0');
    const yyyy = String(pickerYear);
    const formatted = `${mm}/${dd}/${yyyy}`;
    if (isValidDate(formatted)) {
      setBirthDate(formatted);
      setDateError("");
    } else {
      setDateError("Invalid date");
    }
    setShowDatePicker(false);
  };
  const daysInMonth = (month: number, year: number) => new Date(year, month, 0).getDate();

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleRequirementsComplete = (idImageUri: string, selfieImageUri: string, verificationResult: FaceVerificationResult) => {
    setIdImage(idImageUri);
    setSelfieImage(selfieImageUri);
    setFaceVerificationResult(verificationResult);
    handleNext();
  };

  // New: inline ID upload + selfie steps like GCash
  const [showCamera, setShowCamera] = useState(false);
  const pickIdImage = async () => {
    try {
      const img: any = await (ImageCropPicker as any).openPicker({
        mediaType: 'photo',
        cropping: true,
        freeStyleCropEnabled: true,
        compressImageQuality: 0.8,
      });
      if (img?.path) {
        const uri = img.path.startsWith('file://') ? img.path : `file://${img.path}`;
        setIdImage(uri);
        setIdImageUrl(null);
      }
    } catch (e) {
      // user cancelled or picker failed; ignore
    }
  };
  const startIdCamera = async () => {
    try {
      const scanner: any = DocumentScanner as any;
      if (scanner?.scanDocument) {
        const { scannedImages } = await scanner.scanDocument({ maxNumDocuments: 1 });
        if (scannedImages && scannedImages.length > 0) {
          setIdImage(scannedImages[0]);
          setIdImageUrl(null);
          return;
        }
        Alert.alert('Scan Cancelled', 'No document was scanned.');
        return;
      }
    } catch (e) {
      // fall back below
    }
    // Fallback to camera if scanner is unavailable or fails
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setIdImage(result.assets[0].uri);
      setIdImageUrl(null);
    }
  };
  const handleSelfieCapture = (uri: string) => {
    setSelfieImage(uri);
    setShowCamera(false);
    setSelfieImageUrl(null);
  };
  const scanBillDocument = async () => {
    try {
      const scanner: any = DocumentScanner as any;
      if (scanner?.scanDocument) {
        const { scannedImages } = await scanner.scanDocument({ maxNumDocuments: 1 });
        if (scannedImages && scannedImages.length > 0) {
          setBillImage(scannedImages[0]);
          setBillImageUrl(null);
          return;
        }
        Alert.alert('Scan Cancelled', 'No document was scanned.');
        return;
      }
    } catch (e) {
      // fall back below
    }
    // Fallback to camera if scanner is unavailable or fails
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4,3], quality: 0.9 });
    if (!result.canceled && result.assets[0]) { setBillImage(result.assets[0].uri); setBillImageUrl(null); }
  };
  const uploadImageToServer = async (localUri: string): Promise<string> => {
    const fileName = localUri.split('/').pop() || `image-${Date.now()}.jpg`;
    // Try Cloudinary direct upload first if env vars are present
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (cloudName && uploadPreset) {
      try {
        const fd: any = new FormData();
        fd.append('file', { uri: localUri, name: fileName, type: 'image/jpeg' } as any);
        fd.append('upload_preset', uploadPreset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) throw new Error(`Cloudinary ${res.status}`);
        const json = await res.json();
        if (json && json.secure_url) return json.secure_url as string;
        throw new Error('Cloudinary missing secure_url');
      } catch (e) {
        // Fall back to backend upload below
      }
    }

    // Fallback: upload to our backend which persists or forwards to storage
    const formData: any = new FormData();
    formData.append('image', { uri: localUri, name: fileName, type: 'image/jpeg' } as any);
    const resp = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/api/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return resp.data.url as string;
  };
  const runVerification = async (): Promise<boolean> => {
    if (!idImage || !selfieImage) return false;
    console.log('Starting verification process...');
    setIsVerifying(true);
    try {
      // Run face verification directly
      console.log('Running face verification...');
      const success = await runFaceVerification();
      console.log('Face verification result:', success);
      if (success) {
        console.log('Showing success modal...');
        setSuccessVisible(true);
        console.log('Success modal visibility set to true');
      }
      return success;
    } catch (e) {
      console.error('Verification error:', e);
      setNoticeTitle('Error');
      setNoticeMessage('Verification failed. Please try again.');
      setNoticeVisible(true);
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const runFaceVerification = async (): Promise<boolean> => {
    if (!idImage || !selfieImage) return false;
    try {
      console.log('Running liveness check...');
      const live = await luxandLiveness(selfieImage);
      console.log('Liveness result:', live);
      if (!live.passed) {
        setFaceVerificationResult({ isMatch: false, confidence: 0, faceDetected: false, livenessPassed: false, error: 'Liveness failed. Please retake under better lighting.' });
        setNoticeTitle('Liveness Failed');
        setNoticeMessage('Please retake your selfie under better lighting and try again.');
        setNoticeVisible(true);
        return false;
      }
      console.log('Running face matching...');
      const match = await luxandVerify(idImage, selfieImage, { minConfidence: 60 } as any);
      console.log('Face match result:', match);
      const combined: FaceVerificationResult = { ...match, livenessPassed: true } as any;
      setFaceVerificationResult(combined);
      if (!combined.isMatch) {
        setNoticeTitle('Face Not Verified');
        setNoticeMessage(combined.error || `Face similarity too low (${(combined.confidence ?? 0).toFixed(1)}%).`);
        setNoticeVisible(true);
        return false;
      }
      console.log('Face verification successful, setting success state...');
      setSuccessTitle('Verified');
      setSuccessMessage(`Face match successful (${(combined.confidence ?? 0).toFixed(0)}%).`);
      return true;
    } catch (e) {
      console.error('Face verification error:', e);
      setNoticeTitle('Error');
      setNoticeMessage('Verification failed. Please try again.');
      setNoticeVisible(true);
      return false;
    }
  };

  const handleFaceVerificationComplete = (result: FaceVerificationResult) => {
    setFaceVerificationResult(result);
    if (currentStep === 2) {
      console.log('Face verification completed:', result);
    }
  };

  const renderStepper = () => {
    const steps = [
      { key: 1, label: 'Profile', icon: 'person' as const },
      { key: 2, label: 'Verify', icon: 'shield-checkmark' as const },
      { key: 3, label: 'Proof', icon: 'document-text' as const },
      { key: 4, label: 'Review', icon: 'document-text' as const },
    ];
    return (
      <View style={styles.stepperBar}>
        {steps.map((s, idx) => {
          const isActive = currentStep === s.key;
          const isDone = currentStep > s.key;
          const isLast = idx === steps.length - 1;
          return (
            <View key={s.key} style={styles.stepperItem}>
              <View style={[styles.stepDotWrap, isActive && styles.stepDotWrapActive, isDone && styles.stepDotWrapDone]}>
                <LinearGradient
                  colors={isDone ? ['#10b981', '#22c55e'] : isActive ? ['#6366f1', '#0ea5e9'] : ['#e5e7eb', '#e5e7eb']}
                  style={styles.stepDot}
                >
                  <Ionicons
                    name={isDone ? 'checkmark' : s.icon}
                    size={16}
                    color={isActive || isDone ? 'white' : '#9ca3af'}
                  />
                </LinearGradient>
              </View>
              {!isLast && <View style={[styles.stepConnector, (isDone || isActive) && styles.stepConnectorActive]} />}
              <Text style={[styles.stepLabel, (isActive || isDone) && styles.stepLabelActive]}>{s.label}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderPersonalInfoStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.glassHeader}>
        <LinearGradient colors={["#0ea5e9", "#6366f1"]} style={styles.glassHeaderGradient}>
          <View style={styles.headerRow}>
            <View style={styles.headerBadge}><Ionicons name="id-card" size={18} color="#fff" /></View>
            <Text style={styles.headerTitle}>Create your Barangay ID</Text>
          </View>
          <Text style={styles.headerSubtitle}>Fast, secure, and verified</Text>
        </LinearGradient>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Personal Information</Text>

        <View style={styles.inputBlock}>
          <Text style={styles.fieldLabel}>First Name</Text>
          <View style={[styles.fieldControl, nameError ? styles.fieldControlError : styles.fieldControlOk]}>
            <Ionicons name="person-outline" size={18} color="#6b7280" style={styles.fieldIcon} />
            <TextInput
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                updateFullNameFromParts(text, middleName, lastName);
                if (text.trim()) validateName(`${text} ${lastName}`);
              }}
              onBlur={() => validateName(`${firstName} ${lastName}`)}
              placeholder="e.g., Juan"
              placeholderTextColor="#9ca3af"
              style={styles.fieldInput}
              autoCapitalize="words"
            />
          </View>
          {!!nameError && <Text style={styles.fieldHelpError}>{nameError}</Text>}
        </View>

        <View style={styles.inputBlock}>
          <Text style={styles.fieldLabel}>Middle Name (optional)</Text>
          <View style={[styles.fieldControl, styles.fieldControlOk]}>
            <Ionicons name="person-outline" size={18} color="#6b7280" style={styles.fieldIcon} />
            <TextInput
              value={middleName}
              onChangeText={(text) => {
                setMiddleName(text);
                updateFullNameFromParts(firstName, text, lastName);
              }}
              placeholder="e.g., Santos"
              placeholderTextColor="#9ca3af"
              style={styles.fieldInput}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.inputBlock}>
          <Text style={styles.fieldLabel}>Last Name</Text>
          <View style={[styles.fieldControl, nameError ? styles.fieldControlError : styles.fieldControlOk]}>
            <Ionicons name="person-outline" size={18} color="#6b7280" style={styles.fieldIcon} />
            <TextInput
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                updateFullNameFromParts(firstName, middleName, text);
                if (text.trim()) validateName(`${firstName} ${text}`);
              }}
              onBlur={() => validateName(`${firstName} ${lastName}`)}
              placeholder="e.g., Dela Cruz"
              placeholderTextColor="#9ca3af"
              style={styles.fieldInput}
              autoCapitalize="words"
            />
          </View>
        </View>

        

        <View style={styles.inputBlock}>
          <Text style={styles.fieldLabel}>Date of Birth</Text>
          <View style={[styles.fieldControl, dateError ? styles.fieldControlError : styles.fieldControlOk]}>
            <Ionicons name="calendar-outline" size={18} color="#6b7280" style={styles.fieldIcon} />
            <TouchableOpacity style={[styles.fieldInput, { paddingVertical: 2 }]} onPress={openDatePicker}>
              <Text style={{ color: birthDate ? '#111827' : '#9ca3af', fontSize: 15 }}>
                {birthDate || 'MM/DD/YYYY'}
              </Text>
            </TouchableOpacity>
            <View style={styles.fieldSuffix}>
              <Ionicons name="calendar" size={18} color="#94a3b8" />
            </View>
          </View>
          {!!dateError && <Text style={styles.fieldHelpError}>{dateError}</Text>}
        </View>

        <View style={styles.inputBlock}>
          <Text style={styles.fieldLabel}>Mobile Number</Text>
          <View style={[styles.fieldControl, contactError ? styles.fieldControlError : styles.fieldControlOk]}>
            <Ionicons name="call-outline" size={18} color="#6b7280" style={styles.fieldIcon} />
            <TextInput
              value={contactNumber}
              onChangeText={(text) => {
                setContactNumber(text);
                if (text.trim()) validateContact(text);
              }}
              onBlur={() => validateContact(contactNumber)}
              placeholder="0912-345-6789"
              placeholderTextColor="#9ca3af"
              style={styles.fieldInput}
              keyboardType="phone-pad"
            />
            {isValidPhone(contactNumber) && !contactError && (
              <View style={styles.fieldSuffix}>
                <Ionicons name="checkmark" size={18} color="#10b981" />
              </View>
            )}
          </View>
          {!!contactError && <Text style={styles.fieldHelpError}>{contactError}</Text>}
        </View>

        <View style={styles.inputBlock}>
          <Text style={styles.fieldLabel}>House / Lot / Unit No.</Text>
          <View style={[styles.fieldControl, styles.fieldControlOk]}>
            <Ionicons name="home-outline" size={18} color="#6b7280" style={styles.fieldIcon} />
            <TextInput
              value={addrUnit}
              onChangeText={(text) => {
                setAddrUnit(text);
                updateAddressFromParts(text, addrStreet, addrPurok, addrBarangay, addrCity, addrProvince, addrRegion, addrZip);
              }}
              placeholder="e.g., Blk 12, Lot 8 or Unit 305"
              placeholderTextColor="#9ca3af"
              style={styles.fieldInput}
            />
          </View>
        </View>
        <View style={styles.inputBlock}>
          <Text style={styles.fieldLabel}>Building / Subdivision / Street Name</Text>
          <View style={[styles.fieldControl, addressError ? styles.fieldControlError : styles.fieldControlOk]}>
            <Ionicons name="business-outline" size={18} color="#6b7280" style={styles.fieldIcon} />
            <TextInput
              value={addrStreet}
              onChangeText={(text) => {
                setAddrStreet(text);
                updateAddressFromParts(addrUnit, text, addrPurok, addrBarangay, addrCity, addrProvince, addrRegion, addrZip);
                if (text.trim()) validateAddressParts();
              }}
              onBlur={validateAddressParts}
              placeholder="e.g., Villa Grande Subd., Mabini St."
              placeholderTextColor="#9ca3af"
              style={styles.fieldInput}
            />
          </View>
        </View>
        {/* Removed Purok / Sitio / Zone field per requirements */}
        <View style={styles.inputBlock}>
          <Text style={styles.fieldLabel}>Region</Text>
          <View style={[styles.fieldControl, addressError ? styles.fieldControlError : styles.fieldControlOk]}>
            <Ionicons name="compass-outline" size={18} color="#6b7280" style={styles.fieldIcon} />
            <TouchableOpacity style={[styles.fieldInput, { paddingVertical: 2 }]} onPress={() => setShowRegionPicker(true)}>
              <Text style={{ color: addrRegion ? '#111827' : '#9ca3af', fontSize: 15 }}>
                {addrRegion || 'Select Region'}
              </Text>
            </TouchableOpacity>
            <View style={styles.fieldSuffix}>
              <Ionicons name="chevron-down" size={18} color="#94a3b8" />
            </View>
          </View>
        </View>
        <View style={styles.inputBlock}>
          <Text style={styles.fieldLabel}>City / Municipality</Text>
          <View style={[styles.fieldControl, addressError ? styles.fieldControlError : styles.fieldControlOk]}>
            <Ionicons name="business" size={18} color="#6b7280" style={styles.fieldIcon} />
            <TouchableOpacity style={[styles.fieldInput, { paddingVertical: 2 }]} onPress={() => setShowCityPicker(true)}>
              <Text style={{ color: addrCity ? '#111827' : '#9ca3af', fontSize: 15 }}>
                {addrCity || 'Select City/Municipality'}
              </Text>
            </TouchableOpacity>
            <View style={styles.fieldSuffix}>
              <Ionicons name="chevron-down" size={18} color="#94a3b8" />
            </View>
          </View>
        </View>
        {/* Removed Province field per requirements */}
        <View style={styles.inputBlock}>
          <Text style={styles.fieldLabel}>Barangay</Text>
          <View style={[styles.fieldControl, addressError ? styles.fieldControlError : styles.fieldControlOk]}>
            <Ionicons name="flag-outline" size={18} color="#6b7280" style={styles.fieldIcon} />
            <TouchableOpacity style={[styles.fieldInput, { paddingVertical: 2 }]} onPress={() => setShowBarangayPicker(true)}>
              <Text style={{ color: addrBarangay ? '#111827' : '#9ca3af', fontSize: 15 }}>
                {addrBarangay || 'Select Barangay'}
              </Text>
            </TouchableOpacity>
            <View style={styles.fieldSuffix}>
              <Ionicons name="chevron-down" size={18} color="#94a3b8" />
            </View>
          </View>
        </View>
        <View style={styles.inputBlock}>
          <Text style={styles.fieldLabel}>ZIP Code</Text>
          <View style={[styles.fieldControl, addressError ? styles.fieldControlError : styles.fieldControlOk]}>
            <Ionicons name="mail-open-outline" size={18} color="#6b7280" style={styles.fieldIcon} />
            <TextInput
              value={addrZip}
              onChangeText={(text) => {
                setAddrZip(text);
                updateAddressFromParts(addrUnit, addrStreet, addrPurok, addrBarangay, addrCity, addrProvince, addrRegion, text);
                validateAddressParts();
              }}
              onBlur={validateAddressParts}
              placeholder="e.g., 1105"
              placeholderTextColor="#9ca3af"
              style={styles.fieldInput}
              keyboardType="numeric"
            />
          </View>
          {!!addressError && <Text style={styles.fieldHelpError}>{addressError}</Text>}
        </View>

        {/* Inline continue removed; bottom-anchored footer handles navigation */}
      </View>
    </View>
  );

  const renderDatePickerModal = () => (
    <Modal visible={showDatePicker} transparent animationType="fade">
      <View style={styles.modalOverlaySimple}>
        <View style={styles.modalCardSimple}>
          <Text style={styles.modalTitleSimple}>Select Birth Date</Text>
          <View style={styles.datePickersRow}>
            <ScrollView style={styles.datePickerCol}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <TouchableOpacity key={m} style={[styles.dateOption, pickerMonth === m && styles.dateOptionActive]} onPress={() => setPickerMonth(m)}>
                  <Text style={[styles.dateOptionText, pickerMonth === m && styles.dateOptionTextActive]}>{String(m).padStart(2, '0')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView style={styles.datePickerCol}>
              {Array.from({ length: daysInMonth(pickerMonth, pickerYear) }, (_, i) => i + 1).map(d => (
                <TouchableOpacity key={d} style={[styles.dateOption, pickerDay === d && styles.dateOptionActive]} onPress={() => setPickerDay(d)}>
                  <Text style={[styles.dateOptionText, pickerDay === d && styles.dateOptionTextActive]}>{String(d).padStart(2, '0')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView style={styles.datePickerCol}>
              {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <TouchableOpacity key={y} style={[styles.dateOption, pickerYear === y && styles.dateOptionActive]} onPress={() => setPickerYear(y)}>
                  <Text style={[styles.dateOptionText, pickerYear === y && styles.dateOptionTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.modalActionsRowSimple}>
            <TouchableOpacity style={[styles.secondaryButton, { flex: 1 }]} onPress={() => setShowDatePicker(false)}>
              <Ionicons name="close" size={16} color="#6b7280" />
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerPrimary, { flex: 1 }]} onPress={applyPickedDate}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.footerPrimaryText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderReviewStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.formCard}>
        <View style={styles.reviewHeaderRow}>
          <Ionicons name="document-text" size={20} color="#6366f1" />
          <Text style={styles.cardTitle}>Review your details</Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryTile}>
            <Ionicons name="person" size={16} color="#0ea5e9" />
            <Text style={styles.summaryTileLabel}>Name</Text>
            <Text style={styles.summaryTileValue}>{fullName}</Text>
          </View>
          <View style={styles.summaryTile}>
            <Ionicons name="calendar" size={16} color="#0ea5e9" />
            <Text style={styles.summaryTileLabel}>Birth Date</Text>
            <Text style={styles.summaryTileValue}>{birthDate}</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryTile, styles.summaryTileFull]}>
            <Ionicons name="location" size={16} color="#0ea5e9" />
            <Text style={styles.summaryTileLabel}>Address</Text>
            <Text style={styles.summaryTileValue}>{userAddress}</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryTile}>
            <Ionicons name="call" size={16} color="#0ea5e9" />
            <Text style={styles.summaryTileLabel}>Contact</Text>
            <Text style={styles.summaryTileValue}>{contactNumber}</Text>
          </View>
          <View style={styles.summaryTile}>
            <Ionicons name="shield-checkmark" size={16} color="#0ea5e9" />
            <Text style={styles.summaryTileLabel}>Verification</Text>
            <Text style={[styles.summaryTileBadge, faceVerificationResult?.isMatch ? styles.badgeOk : styles.badgeWarn]}>
              {faceVerificationResult?.isMatch ? `Verified ${faceVerificationResult.confidence?.toFixed(0)}%` : 'Not verified'}
            </Text>
          </View>
        </View>
        {!!faceVerificationResult && !faceVerificationResult.isMatch && faceVerificationResult.error && (
          <View style={styles.noticeBox}>
            <Ionicons name="alert-circle" size={18} color="#ef4444" />
            <Text style={styles.noticeText}>{faceVerificationResult.error}</Text>
          </View>
        )}
      </View>
    </View>
  );

  // Removed success step (Done) per requirements

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderPersonalInfoStep();
      case 2:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.glassHeader}>
              <LinearGradient colors={["#0ea5e9", "#6366f1"]} style={styles.glassHeaderGradient}>
                <View style={styles.headerRow}>
                  <View style={styles.headerBadge}><Ionicons name="shield-checkmark" size={18} color="#fff" /></View>
                  <Text style={styles.headerTitle}>Identity Verification</Text>
                </View>
                <Text style={styles.headerSubtitle}>Upload ID and take a selfie</Text>
              </LinearGradient>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }}>
            <View style={styles.formCard}>
              {/* ID Upload/Card */}
              <View style={styles.reviewHeaderRow}>
                <Ionicons name="id-card" size={20} color="#6366f1" />
                <Text style={styles.cardTitle}>Government ID</Text>
              </View>
              {idImage ? (
                <>
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: idImage }} style={styles.imagePreview} />
                  </View>
                  <View style={styles.inlineActionRow}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={startIdCamera}>
                      <Ionicons name="camera" size={16} color="#6b7280" />
                      <Text style={styles.secondaryButtonText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={pickIdImage}>
                      <Ionicons name="image" size={16} color="#6b7280" />
                      <Text style={styles.secondaryButtonText}>Replace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setIdImage(null)}>
                      <Ionicons name="trash" size={16} color="#ef4444" />
                      <Text style={styles.secondaryButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.actionCardsRow}>
                  <TouchableOpacity style={styles.actionCard} onPress={startIdCamera}>
                    <Ionicons name="scan" size={18} color="#374151" />
                    <Text style={styles.actionCardText}>Scan ID</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionCard} onPress={pickIdImage}>
                    <Ionicons name="image" size={18} color="#374151" />
                    <Text style={styles.actionCardText}>Upload Photo</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.requirementTips}>
                <Text style={styles.tipsTitle}>ID Tips</Text>
                <Text style={styles.tipText}>Use a well-lit photo, avoid glare, crop the full ID.</Text>
              </View>


              {/* Selfie */}
              <View style={[styles.reviewHeaderRow, { marginTop: 12 }]}>
                <Ionicons name="camera" size={20} color="#6366f1" />
                <Text style={styles.cardTitle}>Live Selfie</Text>
              </View>
              {showCamera ? (
                <View style={{ height: 380, borderRadius: 12, overflow: 'hidden' }}>
                  <FaceVerificationCamera onCapture={handleSelfieCapture} onClose={() => setShowCamera(false)} title="Take Selfie" subtitle="Center your face and use good lighting" />
                </View>
              ) : selfieImage ? (
                <>
                  <View style={styles.selfiePreviewContainer}>
                    <Image source={{ uri: selfieImage }} style={styles.imagePreview} resizeMode="contain" />
                  </View>
                  <View style={styles.inlineActionRow}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowCamera(true)}>
                      <Ionicons name="camera" size={16} color="#6b7280" />
                      <Text style={styles.secondaryButtonText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setSelfieImage(null)}>
                      <Ionicons name="trash" size={16} color="#ef4444" />
                      <Text style={styles.secondaryButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <TouchableOpacity style={styles.primaryGhostArea} onPress={() => setShowCamera(true)}>
                  <Ionicons name="camera" size={28} color="#4f46e5" />
                  <Text style={styles.primaryGhostTitle}>Open Camera</Text>
                  <Text style={styles.uploadDescription}>Use bright, even lighting</Text>
                </TouchableOpacity>
              )}

              <View style={styles.requirementTips}>
                <Text style={styles.tipsTitle}>Selfie Tips</Text>
                <Text style={styles.tipText}>Center your face, remove glasses if possible, keep a neutral expression.</Text>
              </View>
            </View>
            </ScrollView>
          </View>
        );
      case 3:
        // Proof of Residence (Meralco Bill)
        return (
          <View style={styles.stepContainer}>
            <View style={styles.glassHeader}>
              <LinearGradient colors={["#0ea5e9", "#6366f1"]} style={styles.glassHeaderGradient}>
                <View style={styles.headerRow}>
                  <View style={styles.headerBadge}><Ionicons name="document-text" size={18} color="#fff" /></View>
                  <Text style={styles.headerTitle}>Proof of Residence</Text>
                </View>
                <Text style={styles.headerSubtitle}>Upload your latest Meralco bill</Text>
              </LinearGradient>
            </View>

            <View style={styles.formCard}>
              <View style={styles.reviewHeaderRow}>
                <Ionicons name="file-tray" size={20} color="#6366f1" />
                <Text style={styles.cardTitle}>Meralco Bill</Text>
              </View>

              {billImage ? (
                <>
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: billImage }} style={styles.imagePreview} />
                  </View>
                  <View style={styles.inlineActionRow}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={scanBillDocument}>
                      <Ionicons name="camera" size={16} color="#6b7280" />
                      <Text style={styles.secondaryButtonText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={async () => {
                      try {
                        const img: any = await (ImageCropPicker as any).openPicker({
                          mediaType: 'photo',
                          cropping: true,
                          freeStyleCropEnabled: true,
                          compressImageQuality: 0.8,
                        });
                        if (img?.path) {
                          const uri = img.path.startsWith('file://') ? img.path : `file://${img.path}`;
                          setBillImage(uri);
                          setBillImageUrl(null);
                        }
                      } catch (e) {}
                    }}>
                      <Ionicons name="image" size={16} color="#6b7280" />
                      <Text style={styles.secondaryButtonText}>Replace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setBillImage(null)}>
                      <Ionicons name="trash" size={16} color="#ef4444" />
                      <Text style={styles.secondaryButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.requirementTips}>
                    <Text style={styles.tipsTitle}>Tips</Text>
                    <Text style={styles.tipText}>Ensure the address and name are clearly visible.</Text>
                  </View>
                </>
              ) : (
                <View>
                  <View style={styles.actionCardsRow}>
                    <TouchableOpacity style={styles.actionCard} onPress={scanBillDocument}>
                      <Ionicons name="scan" size={18} color="#374151" />
                      <Text style={styles.actionCardText}>Scan Bill</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard} onPress={async () => {
                      try {
                        const img: any = await (ImageCropPicker as any).openPicker({
                          mediaType: 'photo',
                          cropping: true,
                          freeStyleCropEnabled: true,
                          compressImageQuality: 0.8,
                        });
                        if (img?.path) {
                          const uri = img.path.startsWith('file://') ? img.path : `file://${img.path}`;
                          setBillImage(uri);
                          setBillImageUrl(null);
                        }
                      } catch (e) {}
                    }}>
                      <Ionicons name="image" size={18} color="#374151" />
                      <Text style={styles.actionCardText}>Upload Photo</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.requirementTips}>
                    <Text style={styles.tipsTitle}>Requirements</Text>
                    <Text style={styles.tipText}>Use a recent bill with your name and current address.</Text>
                  </View>
                </View>
              )}

              {/* Inline Back/Continue removed; bottom-anchored footer handles navigation */}
            </View>
          </View>
        );
      case 4:
        return renderReviewStep();
      case 5:
        return null;
      default:
        return renderPersonalInfoStep();
    }
  };

  const showIdView = devMode === 'force_view' || (devMode === 'auto' && existingId?.status === 'approved');
  const showFormView = devMode === 'force_form' || !showIdView;
  const showWaitingView = showFormView && !!existingId && existingId?.status !== 'approved';

  if (showIdView) {
    const absoluteCardUrl = existingId?.id_card_url
      ? (existingId.id_card_url.startsWith('http') ? existingId.id_card_url : `${process.env.EXPO_PUBLIC_API_URL}${existingId.id_card_url}`)
      : null;
    const issued = existingId?.id_card_generated_at || existingId?.updated_at || existingId?.created_at;
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#f5f7ff", "#fdf2ff"]} style={styles.background} />
        <View style={styles.contentWrap}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={22} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton]} onLongPress={cycleDevMode}>
              <Ionicons name="settings" size={16} color="#6b7280" />
              <Text style={styles.secondaryButtonText}>Dev: {devMode}</Text>
            </TouchableOpacity>
          </View>

          <LinearGradient colors={["#eef2ff", "#fdf2ff"]} style={styles.idHero}>
            <Text style={styles.idHeroTitle}>Barangay Identification Card</Text>
            <Text style={styles.idHeroSub}>Keep this in a safe place. Download a copy for your records.</Text>
          </LinearGradient>

          <LinearGradient colors={["#dbeafe", "#ede9fe", "#fef3c7"]} style={styles.idGradientBorder}>
            <View style={styles.idCardShadowWrap}>
              {absoluteCardUrl ? (
                <Image
                  source={{ uri: absoluteCardUrl }}
                  style={styles.idCardImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.idCardPlaceholder}>
                  <Text style={{ color: '#6b7280' }}>ID image not available</Text>
                </View>
              )}
            </View>
          </LinearGradient>
          <Text style={styles.idCaption}>Present this along with a valid government ID when required.</Text>

          <View style={styles.idInfoRow}>
            <View style={styles.idInfoPill}>
              <Ionicons name="time" size={14} color="#4f46e5" />
              <Text style={styles.idInfoText}>Issued {issued ? new Date(issued as any).toLocaleDateString() : '—'}</Text>
            </View>
            <View style={styles.idInfoPill}>
              <Ionicons name="shield-checkmark" size={14} color="#10b981" />
              <Text style={styles.idInfoText}>Verified</Text>
            </View>
          </View>

          <View style={styles.idCtaRow}>
            {absoluteCardUrl && (
              <TouchableOpacity
                style={styles.idPrimaryCta}
                onPress={async () => {
                  try {
                    await Linking.openURL(absoluteCardUrl);
                  } catch {}
                }}
              >
                <Ionicons name="download" size={18} color="#fff" />
                <Text style={styles.idPrimaryCtaText}>Open / Download</Text>
              </TouchableOpacity>
            )}
            {absoluteCardUrl && (
              <TouchableOpacity
                style={styles.idSecondaryCta}
                onPress={async () => {
                  try { await Share.share({ message: absoluteCardUrl }); } catch {}
                }}
              >
                <Ionicons name="share-social" size={16} color="#374151" />
                <Text style={styles.idSecondaryCtaText}>Share</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (showWaitingView) {
    const issued = existingId?.created_at || existingId?.updated_at;
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#f5f7ff", "#fdf2ff"]} style={styles.background} />
        <View style={styles.contentWrap}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={22} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Barangay ID</Text>
            <View style={styles.backButton} />
          </View>

          <LinearGradient colors={["#eef2ff", "#fdf2ff"]} style={styles.idHero}>
            <Text style={styles.idHeroTitle}>Request Submitted</Text>
            <Text style={styles.idHeroSub}>Please wait while the barangay reviews your request.</Text>
          </LinearGradient>

          <View style={styles.formCard}>
            <View style={styles.reviewHeaderRow}>
              <Ionicons name="time" size={20} color="#6366f1" />
              <Text style={styles.cardTitle}>Awaiting Approval</Text>
            </View>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={{ marginTop: 10, color: '#374151', fontWeight: '700' }}>Your request of Barangay ID has been submitted.</Text>
              <Text style={{ marginTop: 6, color: '#6b7280', textAlign: 'center' }}>Please wait for the barangay to check your request.</Text>
              <View style={styles.idInfoRow}>
                <View style={styles.idInfoPill}>
                  <Ionicons name="calendar" size={14} color="#4f46e5" />
                  <Text style={styles.idInfoText}>Submitted {issued ? new Date(issued as any).toLocaleDateString() : '—'}</Text>
                </View>
                <View style={styles.idInfoPill}>
                  <Ionicons name="shield" size={14} color="#4f46e5" />
                  <Text style={styles.idInfoText}>Verification pending</Text>
                </View>
              </View>
            </View>
            <View style={styles.idCtaRow}>
              <TouchableOpacity
                style={styles.idPrimaryCta}
                onPress={fetchLatestId}
                accessibilityLabel="Refresh status"
              >
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.idPrimaryCtaText}>Refresh Status</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#f5f7ff", "#fdf2ff"]} style={styles.background} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Barangay ID</Text>
          <View style={styles.backButton} />
        </View>

        {/* Stepper */}
        {renderStepper()}

        {/* Step Content */}
            {currentStep === 2 ? (
          <View style={styles.nonScrollContainer}>{renderCurrentStep()}</View>
        ) : (
          <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
            {renderCurrentStep()}
          </ScrollView>
        )}

        {/* Sticky Footer Actions */}
        <View style={styles.footerBar}>
            <TouchableOpacity
              onPress={handleBack}
              disabled={currentStep === 1}
              style={[styles.footerSecondary, currentStep === 1 && styles.footerDisabled]}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={18} color={currentStep === 1 ? '#9ca3af' : '#374151'} />
              <Text style={[styles.footerSecondaryText, currentStep === 1 && styles.footerDisabledText]}>Back</Text>
            </TouchableOpacity>
            {currentStep === 2 ? (
              <TouchableOpacity
                onPress={async () => {
                  if (!idImage || !selfieImage) {
                    setNoticeTitle('Incomplete');
                    setNoticeMessage('Please add your ID and selfie first.');
                    setNoticeVisible(true);
                    return;
                  }
                  await runVerification();
                }}
                disabled={(!idImage || !selfieImage) || isVerifying}
                style={[styles.footerPrimary, (((!idImage || !selfieImage) || isVerifying)) && styles.footerPrimaryDisabled]}
                accessibilityLabel="Verify and continue"
              >
                {isVerifying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={18} color="#fff" />
                    <Text style={styles.footerPrimaryText}>Verify & Continue</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : currentStep === 4 ? (
              <TouchableOpacity
                onPress={handleFinalSubmit}
                disabled={loading || !canSubmit()}
                style={[styles.footerPrimary, (loading || !canSubmit()) && styles.footerPrimaryDisabled]}
                accessibilityLabel="Submit request"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={18} color="#fff" />
                    <Text style={styles.footerPrimaryText}>Submit Request</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleNext}
                disabled={(currentStep === 1 && !isPersonalInfoValid()) || (currentStep === 3 && !billImage)}
                style={[
                  styles.footerPrimary,
                  ((currentStep === 1 && !isPersonalInfoValid()) || (currentStep === 3 && !billImage)) && styles.footerPrimaryDisabled,
                ]}
                accessibilityLabel="Next"
              >
                <Ionicons name="arrow-forward" size={18} color="#fff" />
                <Text style={styles.footerPrimaryText}>Next</Text>
              </TouchableOpacity>
            )}
          </View>
      </KeyboardAvoidingView>

      {/* Face verification loading modal */}
      <Modal visible={isVerifying} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingTitle}>Verifying identity</Text>
            <Text style={styles.loadingSub}>Comparing your ID photo and selfie...</Text>
          </View>
        </View>
      </Modal>

      {/* Notice Modal */}
      <Modal visible={noticeVisible} transparent animationType="fade" onRequestClose={() => setNoticeVisible(false)}>
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <Ionicons name="alert-circle" size={22} color="#ef4444" />
            <Text style={styles.loadingTitle}>{noticeTitle}</Text>
            <Text style={styles.loadingSub}>{noticeMessage}</Text>
            <View style={{ height: 8 }} />
            <TouchableOpacity style={[styles.footerPrimary]} onPress={() => setNoticeVisible(false)}>
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={styles.footerPrimaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successVisible} transparent animationType="fade" onRequestClose={() => setSuccessVisible(false)}>
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <Ionicons name="checkmark-circle" size={22} color="#10b981" />
            <Text style={styles.loadingTitle}>{successTitle}</Text>
            <Text style={styles.loadingSub}>{successMessage}</Text>
            <View style={{ height: 8 }} />
            <TouchableOpacity style={[styles.footerPrimary]} onPress={() => { 
              console.log('Success modal continue pressed');
              setSuccessVisible(false); 
              handleNext(); 
            }}>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
              <Text style={styles.footerPrimaryText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmSubmit}
        onEdit={handleEdit}
        title="ID Request"
        data={{
          full_name: fullName,
          birth_date: birthDate,
          address: userAddress,
          contact: contactNumber,
        }}
        dataLabels={{
          full_name: "Full Name",
          birth_date: "Birth Date",
          address: "Address",
          contact: "Contact Number",
        }}
        loading={loading}
      />
      {renderDatePickerModal()}
      {/* Region/City/Barangay pickers */}
      {(() => {
        const DATA = PH_GEOGRAPHY;
        const regionOptions = DATA.regions.map(r => r.name);
        const currentRegion = DATA.regions.find(r => r.name === addrRegion);
        const cityOptions = (currentRegion?.cities || []).map(c => c.name);
        const currentCity = currentRegion?.cities.find(c => c.name === addrCity);
        const barangayOptions = (currentCity?.barangays || []);

        const renderOptionsModal = (
          visible: boolean,
          title: string,
          options: string[],
          onSelect: (v: string) => void,
          onClose: () => void
        ) => (
          <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlaySimple}>
              <View style={styles.modalCardSimple}>
                <Text style={styles.modalTitleSimple}>{title}</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {options.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                      <Text style={{ color: '#6b7280' }}>No options available</Text>
                    </View>
                  ) : options.map(opt => (
                    <TouchableOpacity key={opt} style={styles.dateOption} onPress={() => { onSelect(opt); onClose(); }}>
                      <Text style={styles.dateOptionText}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={styles.modalActionsRowSimple}>
                  <TouchableOpacity style={[styles.secondaryButton, { flex: 1 }]} onPress={onClose}>
                    <Ionicons name="close" size={16} color="#6b7280" />
                    <Text style={styles.secondaryButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        );

        return (
          <>
            {renderOptionsModal(
              showRegionPicker,
              'Select Region',
              regionOptions,
              (v) => {
                setAddrRegion(v);
                // Reset dependent fields
                setAddrCity("");
                setAddrBarangay("");
                updateAddressFromParts(addrUnit, addrStreet, addrPurok, "", "", addrProvince, v, addrZip);
                validateAddressParts();
              },
              () => setShowRegionPicker(false)
            )}

            {renderOptionsModal(
              showCityPicker,
              'Select City/Municipality',
              cityOptions,
              (v) => {
                setAddrCity(v);
                setAddrBarangay("");
                updateAddressFromParts(addrUnit, addrStreet, addrPurok, "", v, addrProvince, addrRegion, addrZip);
                validateAddressParts();
              },
              () => setShowCityPicker(false)
            )}

            {renderOptionsModal(
              showBarangayPicker,
              'Select Barangay',
              barangayOptions,
              (v) => {
                setAddrBarangay(v);
                updateAddressFromParts(addrUnit, addrStreet, addrPurok, v, addrCity, addrProvince, addrRegion, addrZip);
                validateAddressParts();
              },
              () => setShowBarangayPicker(false)
            )}
          </>
        );
      })()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  stepperBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  stepperItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepDotWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepDotWrapActive: {
    backgroundColor: '#c7d2fe',
  },
  stepDotWrapDone: {
    backgroundColor: '#bbf7d0',
  },
  stepDot: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepConnector: {
    position: 'absolute',
    top: 14,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: '#e5e7eb',
    zIndex: 1,
  },
  stepConnectorActive: {
    backgroundColor: '#60a5fa',
  },
  stepLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 6,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#374151',
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 100,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  nonScrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 100,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  stepContainer: {
    flex: 1,
  },
  glassHeader: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
  },
  glassHeaderGradient: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 6,
    fontSize: 13,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eef2ff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  inputBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  fieldControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  fieldControlOk: {
    borderColor: '#e5e7eb',
  },
  fieldControlError: {
    borderColor: '#ef4444',
  },
  fieldIcon: {
    marginRight: 10,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  fieldSuffix: {
    marginLeft: 8,
  },
  fieldTextArea: {
    alignItems: 'flex-start',
  },
  fieldMultiline: {
    minHeight: 72,
  },
  fieldHelpError: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  dualRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dualCol: {
    flex: 1,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  summaryTile: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
  },
  summaryTileFull: {
    flex: 1,
  },
  summaryTileLabel: {
    marginTop: 6,
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  summaryTileValue: {
    marginTop: 4,
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
  },
  summaryTileBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  badgeOk: {
    backgroundColor: '#ecfdf5',
    color: '#065f46',
  },
  badgeWarn: {
    backgroundColor: '#fef2f2',
    color: '#7f1d1d',
  },
  successHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  successIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  successBodyText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
  },
  noticeBox: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 12,
  },
  noticeText: {
    color: '#7f1d1d',
    fontSize: 13,
    flex: 1,
  },
  ctaButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  ctaButtonDisabled: {
    opacity: 0.8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 6,
  },
  footerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  footerSecondaryText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 14,
  },
  footerPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  footerPrimaryText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 14,
  },
  footerPrimaryDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  footerDisabled: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  footerDisabledText: {
    color: '#9ca3af',
  },
  // ID View styles
  idHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentWrap: {
    padding: 16,
    gap: 14,
  },
  idHeaderBadge: {},
  idHeaderTitle: {},
  idHeaderSub: {},
  idHero: {
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  idHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  idHeroSub: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  idGradientBorder: {
    marginTop: 12,
    padding: 1,
    borderRadius: 18,
  },
  idCardShadowWrap: {
    marginTop: 0,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eef2ff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  idCardImage: {
    width: '100%',
    aspectRatio: 1012/638,
  },
  idCaption: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 12,
  },
  idCardPlaceholder: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  idInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  idInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  idInfoText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
  },
  idCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 10,
    marginTop: 10,
  },
  idPrimaryCta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6366f1',
  },
  idPrimaryCtaText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  idSecondaryCta: {
    width: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  idSecondaryCtaText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 13,
  },
  // Loading modal styles
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 12,
  },
  loadingTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  loadingSub: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Inline verification styles
  actionCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionCardText: {
    fontWeight: '700',
    color: '#111827',
  },
  imagePreviewContainer: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selfiePreviewContainer: {
    width: '100%',
    height: 360,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlayButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 8,
    backgroundColor: 'white',
  },
  inlineActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  inlineActionRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: 'white',
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 6,
  },
  primaryGhostArea: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 18,
    backgroundColor: '#e0f2fe',
  },
  primaryGhostTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  uploadDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  requirementTips: {
    marginTop: 10,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    color: '#6b7280',
  },
  // Simple modal styles for date picker
  modalOverlaySimple: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCardSimple: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 420,
  },
  modalTitleSimple: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  datePickersRow: {
    flexDirection: 'row',
    gap: 8,
    height: 200,
    marginBottom: 12,
  },
  datePickerCol: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateOption: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  dateOptionActive: {
    backgroundColor: '#eef2ff',
  },
  dateOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  dateOptionTextActive: {
    color: '#4f46e5',
    fontWeight: '700',
  },
  modalActionsRowSimple: {
    flexDirection: 'row',
    gap: 8,
  },
});

export default CreateIDScreen;