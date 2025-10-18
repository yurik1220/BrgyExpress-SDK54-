//  Import necessary React libraries and hooks
import React, { useState, useEffect, useRef } from "react";
//  Import UI and utility components from React Native
import {
    View, Text, TextInput, TouchableOpacity,
    Image, ActivityIndicator, Alert,
    KeyboardAvoidingView, Platform, SafeAreaView,
    ScrollView,
    Modal,
} from "react-native";
// Import camera, location, biometric auth, and routing utilities
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import * as LocalAuthentication from "expo-local-authentication";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
// Axios for sending data to the backend API
import axios from "axios";
//  Custom UI components and styles
import CustomButton from "@/components/CustomButton";
import { images } from "@/constants";
import { useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { styles } from "@/styles/ir_styles";

//  Type definition for media (image)
type Media = {
    uri: string;
    type: string;
} | null;

//  Coordinates defining the allowed geofence area for submissions
const polygonCoordinates: [number, number][] = [
    [120.9956744,14.4423801],
    [120.9981045,14.440193],
    [120.999526,14.4415126],
    [120.9967205,14.4434762],
    [120.9956744,14.4423801],
];

//  Function to check if user's location is inside the polygon (geofencing)
function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
    let [x, y] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        const intersect =
            yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

//  Main screen component
const IncidentReportScreen = () => {
    const router = useRouter(); // Navigate between pages
    const { userId } = useAuth(); // Get current user's ID

    //  State variables for form input, location, camera, and modal
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [media, setMedia] = useState<Media>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [cameraVisible, setCameraVisible] = useState(false);
    const [facing, setFacing] = useState<CameraType>("back"); // Front/back camera
    const cameraRef = useRef<CameraView>(null); // Ref for accessing camera actions
    const [permission, requestPermission] = useCameraPermissions(); // Ask camera permission

    //  Additional UI state
    const categories = [
        "Theft",
        "Assault",
        "Fire",
        "Accident",
        "Disturbance",
        "Others",
    ];
    const urgencies = ["Low", "Medium", "High"] as const;
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedUrgency, setSelectedUrgency] = useState<string>("");
    const [addressText, setAddressText] = useState<string>("");
    const [reportedAt, setReportedAt] = useState<string>("");
    const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);
    const [isUrgencyOpen, setIsUrgencyOpen] = useState<boolean>(false);
    const [isVerified, setIsVerified] = useState<boolean>(false);
    const [eligibilityModalVisible, setEligibilityModalVisible] = useState<boolean>(false);
    const [devBypassEnabled, setDevBypassEnabled] = useState<boolean>(false);
    const [cooldownMessage, setCooldownMessage] = useState<string>("");

    //  useEffect runs on component mount
    useEffect(() => {
        (async () => {
            // Request location permission
            const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
            if (locationStatus !== "granted") {
                Alert.alert("Permission Denied", "Location permission is required to submit a report.");
                return;
            }

            // Get user's current location
            const location = await Location.getCurrentPositionAsync({});
            setUserLocation([location.coords.longitude, location.coords.latitude]);

            // Reverse geocode to readable address
            try {
                const geocode = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });
                if (geocode && geocode.length > 0) {
                    const g = geocode[0];
                    const line = [g.name, g.street, g.subregion, g.region]
                        .filter(Boolean)
                        .join(", ");
                    setAddressText(line);
                }
            } catch (e) {
                // Fallback to raw coords if reverse geocoding fails
                setAddressText(`${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`);
            }

            // Set timestamp
            setReportedAt(new Date().toISOString());

            // Request camera permission if not already granted
            if (!permission?.granted) {
                await requestPermission();
            }

            // Determine verification status by checking approved Create ID
            try {
                if (userId) {
                    const url = `${process.env.EXPO_PUBLIC_API_URL}/api/requests/${userId}?t=${Date.now()}`;
                    const r = await axios.get(url, { headers: { 'Cache-Control': 'no-cache' } });
                    const items = (r.data || []).filter((x: any) => x.type === 'Create ID');
                    const isApproved = items.some((x: any) => x.status === 'approved');
                    setIsVerified(isApproved);
                } else {
                    setIsVerified(false);
                }
            } catch (e) {
                setIsVerified(false);
            }
        })();
    }, []);

    //  Function to capture photo from camera
    const takePicture = async () => {
        if (!cameraRef.current) return;
        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.7,
                exif: true,
            });
            
            if (photo) {
                setMedia({
                    uri: photo.uri,
                    type: "image/jpeg",
                });
                setCameraVisible(false); // Close camera view
            }
        } catch (error) {
            console.error("Error taking picture:", error);
            Alert.alert("Error", "Failed to take picture");
        }
    };

    //  Toggle between front and back camera
    const toggleCameraType = () => {
        setFacing((current) => (current === "back" ? "front" : "back"));
    };

    // Upload incident image to Cloudinary (same approach as Create ID), fallback to backend
    const uploadIncidentImage = async (localUri: string): Promise<string> => {
        const fileName = localUri.split('/').pop() || `incident-${Date.now()}.jpg`;
        const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME as string | undefined;
        const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string | undefined;

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
                // fall through to backend upload / direct file append
            }
        }

        // As a secondary option, you may have a generic backend upload endpoint
        // If not available, we will return empty string to trigger file-based submit
        try {
            const fd: any = new FormData();
            fd.append('image', { uri: localUri, name: fileName, type: 'image/jpeg' } as any);
            const resp = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/api/upload-image`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (resp?.data?.url) return String(resp.data.url);
        } catch {}
        return '';
    };

    //  Handle initial form validation before submission
    const handleSubmit = async () => {
        if (!title || !description || !media || !selectedCategory || !selectedUrgency) {
            Alert.alert("Missing Fields", "Please complete all fields, choose a category and urgency, and take a photo.");
            return;
        }

        if (!userId) {
            Alert.alert("Authentication Error", "You must be logged in to submit a report.");
            return;
        }

        // Eligibility check for verified users unless dev bypass
        if (!devBypassEnabled && !isVerified) {
            setCooldownMessage("");
            setEligibilityModalVisible(true);
            return;
        }

        if (!userLocation) {
            Alert.alert("Location Error", "Unable to determine your location.");
            return;
        }

        const isInside = isPointInPolygon(userLocation, polygonCoordinates);
        if (!isInside) {
            Alert.alert("Geofence Restriction", "You must be within the allowed area to submit a report.");
            return;
        }

        // Cooldown checks (skip when dev bypass)
        if (!devBypassEnabled) {
            try {
                const resp = await axios.get(`${process.env.EXPO_PUBLIC_API_URL}/api/requests/${userId}?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
                const reports: any[] = (resp.data || []).filter((x: any) => x.type === 'Incident Report');
                const now = Date.now();
                const within15m = reports.filter((r: any) => {
                    const t = r.created_at ? new Date(r.created_at).getTime() : 0;
                    return now - t < 15 * 60 * 1000;
                });
                if (within15m.length > 0) {
                    setCooldownMessage("You can submit only one incident report every 15 minutes.");
                    setEligibilityModalVisible(true);
                    return;
                }
                const within24h = reports.filter((r: any) => {
                    const t = r.created_at ? new Date(r.created_at).getTime() : 0;
                    return now - t < 24 * 60 * 60 * 1000;
                });
                if (within24h.length >= 3) {
                    setCooldownMessage("Maximum of three incident reports per 24 hours reached.");
                    setEligibilityModalVisible(true);
                    return;
                }
            } catch (e) {
                // Do not block if unable to fetch history
            }
        }

        setCooldownMessage("");
        setIsModalVisible(true); // Show warning modal
    };

    //  Modal: Confirm submission and trigger biometric auth
    const handleModalConfirm = async () => {
        setIsModalVisible(false);

        // Check biometric hardware and enrollment
        const isHardwareSupported = await LocalAuthentication.hasHardwareAsync();
        const isBiometricEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!isHardwareSupported || !isBiometricEnrolled) {
            Alert.alert("Error", "Biometric authentication is not available or set up.");
            return;
        }

        // Ask user to authenticate using fingerprint/face
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: "Authenticate to submit your report",
            fallbackLabel: "Use Passcode",
        });

        if (result.success) {
            await handleFormSubmit(); // Continue to final form submission
        } else {
            Alert.alert("Authentication Failed", "Unable to verify your identity.");
        }
    };

    //  Modal: Cancel button handler
    const handleModalCancel = () => {
        setIsModalVisible(false);
    };

    //  Final form submission to backend API
    const handleFormSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            if (!userId) {
                Alert.alert("Authentication Error", "You must be logged in to submit a report.");
                return;
            }

            // Attempt Cloudinary direct upload first to get a hosted URL
            let hostedUrl = '';
            if (media?.uri) {
                hostedUrl = await uploadIncidentImage(media.uri);
            }

            // Build multipart payload; prefer passing media_url when available
            const formData = new FormData();
            formData.append('type', 'Incident Report');
            formData.append('title', title);
            formData.append('description', description);
            formData.append('location', userLocation?.join(',') || '');
            formData.append('clerk_id', userId);
            formData.append('category', selectedCategory);
            formData.append('urgency', selectedUrgency);
            if (addressText) formData.append('address', addressText);
            if (reportedAt) formData.append('reported_at', reportedAt);

            if (hostedUrl) {
                formData.append('media_url', hostedUrl);
            } else if (media) {
                formData.append('media', {
                    uri: media.uri,
                    name: media.uri.split('/').pop() || `media_${Date.now()}.jpg`,
                    type: media.type || 'image/jpeg',
                } as any);
            }

            const response = await axios.post(
                `${process.env.EXPO_PUBLIC_API_URL}/api/requests`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            //  Redirect to details page after successful submission
            router.replace({
                pathname: "/details",
                params: {
                    ...response.data,
                    fromSubmission: 'true',
                },
            });

            //  Reset form fields
            setTitle("");
            setDescription("");
            setMedia(null);
        } catch (error) {
            console.error("Error submitting request:", error);
            Alert.alert("Error", "There was an error submitting your request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show fallback UI if camera permission not handled yet
    if (!permission) {
        return <View style={styles.container} />;
    }

    //  Show camera permission request screen if not granted
    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient 
                    colors={["#fef2f2", "#fee2e2", "#fecaca"]} 
                    style={styles.gradientBackground} 
                />
                <View style={styles.permissionContainer}>
                    <View style={styles.permissionIconContainer}>
                        <Ionicons name="camera" size={48} color="#ef4444" />
                    </View>
                    <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                    <Text style={styles.permissionText}>
                        This feature requires camera access to capture photos of incidents.
                    </Text>
                    <CustomButton
                        title="Grant Permission"
                        onPress={requestPermission}
                        style={styles.permissionButton}
                    />
                </View>
            </SafeAreaView>
        );
    }

    //  Main render UI
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                {/* Professional Background */}
                <LinearGradient 
                    colors={["#fef2f2", "#fee2e2", "#fecaca"]} 
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientBackground} 
                />

                {/* Camera View */}
                {cameraVisible ? (
                    <View style={styles.cameraContainer}>
                        <CameraView style={styles.camera} ref={cameraRef} facing={facing}>
                            <View style={styles.cameraHeader}>
                                <TouchableOpacity 
                                    style={styles.closeButton} 
                                    onPress={() => setCameraVisible(false)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="close" size={24} color="white" />
                                </TouchableOpacity>
                                <Text style={styles.cameraTitle}>Take Photo</Text>
                                <TouchableOpacity 
                                    style={styles.flipButton} 
                                    onPress={toggleCameraType}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="camera-reverse-outline" size={24} color="white" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.cameraControls}>
                                <TouchableOpacity 
                                    style={styles.cameraButton} 
                                    onPress={takePicture}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.cameraButtonInner} />
                                </TouchableOpacity>
                            </View>
                        </CameraView>
                    </View>
                ) : (
                    <View style={styles.mainContainer}>
                        {/* Compact Header */}
                        <Animated.View 
                            entering={FadeInDown.duration(800).springify()}
                            style={styles.header}
                        >
                            <TouchableOpacity
                                style={styles.headerBackButton}
                                onPress={() => router.back()}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel="Go back"
                            >
                                <Ionicons name="chevron-back" size={24} color="#1e293b" />
                            </TouchableOpacity>
                            <View style={styles.headerIconContainer}>
                                <LinearGradient
                                    colors={['#ef4444', '#dc2626']}
                                    style={styles.headerIconBackground}
                                >
                                    <Ionicons name="warning" size={24} color="white" />
                                </LinearGradient>
                            </View>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onLongPress={() => {
                                    if (__DEV__) {
                                        const next = !devBypassEnabled;
                                        setDevBypassEnabled(next);
                                        console.warn(`[DEV MODE] Incident Report bypass ${next ? 'ENABLED' : 'DISABLED'}`);
                                        Alert.alert('Dev Mode', `Bypass ${next ? 'enabled' : 'disabled'}`);
                                    }
                                }}
                            >
                                <Text style={styles.headerTitle}>Incident Report{__DEV__ && devBypassEnabled ? ' (DEV BYPASS)' : ''}</Text>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Compact Form Container */}
                        <Animated.View 
                            entering={FadeInUp.duration(800).delay(200).springify()}
                            style={styles.formContainer}
                        >
                            <ScrollView 
                                contentContainerStyle={{ paddingBottom: 24 }}
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                            >
                            {/* Title Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Title *</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="document-text-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Enter incident title"
                                        placeholderTextColor="#94a3b8"
                                        value={title}
                                        onChangeText={setTitle}
                                    />
                                </View>
                            </View>

                            {/* Category Dropdown */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Category *</Text>
                                <View style={styles.dropdownContainer}>
                                    <TouchableOpacity
                                        style={styles.dropdownField}
                                        onPress={() => {
                                            setIsCategoryOpen((v) => !v);
                                            setIsUrgencyOpen(false);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={selectedCategory ? styles.dropdownValue : styles.dropdownPlaceholder} numberOfLines={1}>
                                            {selectedCategory || 'Select category'}
                                        </Text>
                                        <Ionicons name={isCategoryOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" style={styles.dropdownChevron} />
                                    </TouchableOpacity>
                                    {isCategoryOpen && (
                                        <View style={styles.dropdownOptions}>
                                            {categories.map((cat) => (
                                                <TouchableOpacity
                                                    key={cat}
                                                    style={styles.dropdownOption}
                                                    onPress={() => {
                                                        setSelectedCategory(cat);
                                                        setIsCategoryOpen(false);
                                                    }}
                                                >
                                                    <Text style={[styles.dropdownOptionText, selectedCategory === cat && styles.dropdownOptionTextSelected]}>{cat}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Urgency Dropdown */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Urgency *</Text>
                                <View style={styles.dropdownContainer}>
                                    <TouchableOpacity
                                        style={styles.dropdownField}
                                        onPress={() => {
                                            setIsUrgencyOpen((v) => !v);
                                            setIsCategoryOpen(false);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={selectedUrgency ? styles.dropdownValue : styles.dropdownPlaceholder} numberOfLines={1}>
                                            {selectedUrgency || 'Select urgency'}
                                        </Text>
                                        <Ionicons name={isUrgencyOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" style={styles.dropdownChevron} />
                                    </TouchableOpacity>
                                    {isUrgencyOpen && (
                                        <View style={styles.dropdownOptions}>
                                            {urgencies.map((lvl) => (
                                                <TouchableOpacity
                                                    key={lvl}
                                                    style={styles.dropdownOption}
                                                    onPress={() => {
                                                        setSelectedUrgency(lvl);
                                                        setIsUrgencyOpen(false);
                                                    }}
                                                >
                                                    <Text style={[styles.dropdownOptionText, selectedUrgency === lvl && styles.dropdownOptionTextSelected]}>{lvl}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Photo Section */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Photo *</Text>
                                <TouchableOpacity 
                                    style={styles.photoButton} 
                                    onPress={() => setCameraVisible(true)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.photoButtonContent}>
                                        <Ionicons name="camera-outline" size={24} color="#ef4444" />
                                        <Text style={styles.photoButtonText}>Take Photo</Text>
                                    </View>
                                </TouchableOpacity>

                                <View style={styles.mediaFrame}>
                                    {media ? (
                                        <Animated.View entering={FadeIn.duration(300)} style={styles.mediaContainer}>
                                            <Image
                                                source={{ uri: media.uri }}
                                                style={styles.mediaImage}
                                                resizeMode="cover"
                                            />
                                            <TouchableOpacity 
                                                style={styles.removeMediaButton}
                                                onPress={() => setMedia(null)}
                                            >
                                                <Ionicons name="close-circle" size={20} color="white" />
                                            </TouchableOpacity>
                                        </Animated.View>
                                    ) : (
                                        <View style={styles.mediaPlaceholder}>
                                            <Ionicons name="image-outline" size={24} color="#94a3b8" />
                                            <Text style={styles.mediaPlaceholderText}>No photo yet</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Description Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Description *</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="chatbubble-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.textInput, styles.descriptionInput]}
                                        multiline
                                        placeholder="Describe the incident..."
                                        placeholderTextColor="#94a3b8"
                                        value={description}
                                        onChangeText={setDescription}
                                    />
                                </View>
                            </View>

                            <View style={styles.disclaimerBox}>
                                <Ionicons name="shield-checkmark" size={18} color="#ef4444" style={{ marginRight: 8 }} />
                                <Text style={styles.disclaimerText}>False reporting is punishable. Provide truthful and accurate details.</Text>
                            </View>

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    isSubmitting && styles.submitButtonDisabled
                                ]}
                                onPress={handleSubmit}
                                disabled={isSubmitting}
                                activeOpacity={0.8}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#ffffff" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="send" size={18} color="white" style={{ marginRight: 8 }} />
                                        <Text style={styles.submitButtonText}>Submit Report</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            </ScrollView>
                        </Animated.View>

                        {/* Warning Modal */}
                        {isModalVisible && (
                            <Animated.View 
                                entering={FadeIn.duration(300)}
                                style={styles.modalOverlay}
                            >
                                <View style={styles.modalContainer}>
                                    <View style={styles.modalIconContainer}>
                                        <Ionicons name="warning" size={32} color="white" />
                                    </View>
                                    <Text style={styles.modalTitle}>Important Notice</Text>
                                    <Text style={styles.modalText}>
                                        Submitting a false incident report may result in legal consequences. 
                                        Please ensure all information provided is accurate and truthful.
                                    </Text>

                                    <View style={styles.modalButtons}>
                                        <TouchableOpacity
                                            style={styles.modalConfirmButton}
                                            onPress={handleModalConfirm}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.modalConfirmText}>I Understand - Continue</Text>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity
                                            style={styles.modalCancelButton}
                                            onPress={handleModalCancel}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.modalCancelText}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Animated.View>
                        )}
                        {/* Eligibility / Cooldown Modal */}
                        {eligibilityModalVisible && (
                            <View style={styles.modalOverlay}>
                                <View style={styles.modalContainer}>
                                    <View style={styles.modalIconContainer}>
                                        <Ionicons name="information-circle" size={32} color="white" />
                                    </View>
                                    <Text style={styles.modalTitle}>Action Restricted</Text>
                                    <Text style={styles.modalText}>
                                        {cooldownMessage || "You need to have a Barangay ID or complete verification first."}
                                    </Text>
                                    <View style={styles.modalButtons}>
                                        <TouchableOpacity
                                            style={styles.modalConfirmButton}
                                            onPress={() => setEligibilityModalVisible(false)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.modalConfirmText}>OK</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default IncidentReportScreen;
