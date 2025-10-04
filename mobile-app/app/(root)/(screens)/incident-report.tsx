//  Import necessary React libraries and hooks
import React, { useState, useEffect, useRef } from "react";
//  Import UI and utility components from React Native
import {
    View, Text, TextInput, TouchableOpacity,
    Image, ActivityIndicator, Alert,
    KeyboardAvoidingView, Platform, SafeAreaView,
    ScrollView,
    Switch,
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
    [120.9883678, 14.7157794],
    [120.9890223, 14.7149233],
    [120.9902561, 14.7154317],
    [120.9898108, 14.716319],
    [120.9883678, 14.7157794],
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
    const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
    const [addressText, setAddressText] = useState<string>("");
    const [reportedAt, setReportedAt] = useState<string>("");
    const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);
    const [isUrgencyOpen, setIsUrgencyOpen] = useState<boolean>(false);

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

        if (!userLocation) {
            Alert.alert("Location Error", "Unable to determine your location.");
            return;
        }

        const isInside = isPointInPolygon(userLocation, polygonCoordinates);
        if (!isInside) {
            Alert.alert("Geofence Restriction", "You must be within the allowed area to submit a report.");
            return;
        }

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

            // Create FormData object to send image + text
            const formData = new FormData();
            formData.append("type", "Incident Report");
            formData.append("title", title);
            formData.append("description", description);
            formData.append("location", userLocation?.join(",") || "");
            formData.append("clerk_id", userId);
            formData.append("category", selectedCategory);
            formData.append("urgency", selectedUrgency);
            formData.append("anonymous", String(isAnonymous));
            if (addressText) formData.append("address", addressText);
            if (reportedAt) formData.append("reported_at", reportedAt);

            if (media) {
                formData.append("media", {
                    uri: media.uri,
                    name: media.uri.split("/").pop() || `media_${Date.now()}.jpg`,
                    type: media.type || "image/jpeg",
                } as any);
            }

            //  Send the report to the Express backend
            const response = await axios.post(
                `${process.env.EXPO_PUBLIC_API_URL}/api/requests`,
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
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
                            <Text style={styles.headerTitle}>Incident Report</Text>
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

                            {/* Anonymous Reporting */}
                            <View style={styles.anonRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Report Anonymously</Text>
                                    <Text style={styles.anonHint}>Your name will not be shared with responders.</Text>
                                </View>
                                <Switch
                                    value={isAnonymous}
                                    onValueChange={setIsAnonymous}
                                    thumbColor={isAnonymous ? "#ef4444" : "#e2e8f0"}
                                    trackColor={{ false: "#e2e8f0", true: "#fecaca" }}
                                />
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
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default IncidentReportScreen;
