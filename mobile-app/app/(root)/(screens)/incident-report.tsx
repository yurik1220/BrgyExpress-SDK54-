//  Import necessary React libraries and hooks
import React, { useState, useEffect, useRef } from "react";
//  Import UI and utility components from React Native
import {
    View, Text, TextInput, TouchableOpacity,
    Image, ScrollView, ActivityIndicator, Alert,
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
import { styles } from "@/styles/ir_styles";

//  Type definition for media (image)
type Media = {
    uri: string;
    type: string;
} | null;

//  Coordinates defining the allowed geofence area for submissions
const polygonCoordinates: [number, number][] = [
    [121.0075039,14.7452766],
    [121.0075468,14.7447578],
    [121.008786,14.7448771],
    [121.0087216,14.745427],
    [121.0075039,14.7452766],
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
            setMedia({
                uri: photo.uri,
                type: "image/jpeg",
            });
            setCameraVisible(false); // Close camera view
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
        if (!title || !description || !media) {
            Alert.alert("Missing Fields", "Please fill out all fields and take a photo.");
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
            <View style={styles.container}>
                <Text>Camera permission is required to use this feature</Text>
                <CustomButton
                    title="Grant Permission"
                    onPress={requestPermission}
                    containerStyle={styles.permissionButton}
                />
            </View>
        );
    }

    //  Main render UI
    return (
        <View style={styles.container}>
            {/* Background gradient and decorative floating elements */}
            <LinearGradient colors={["#fff1f2", "#fee2e2", "#fecaca"]} style={styles.gradientBackground} />
            <View style={styles.floatingDecoration} />
            <View style={styles.floatingDecoration2} />

            {/* If camera view is active, show camera */}
            {cameraVisible ? (
                <View style={styles.cameraContainer}>
                    <CameraView style={styles.camera} ref={cameraRef} facing={facing}>
                        <View style={styles.cameraControls}>
                            <TouchableOpacity style={styles.cameraButton} onPress={takePicture}>
                                <View style={styles.cameraButtonInner} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraType}>
                                <Text style={styles.flipButtonText}>Flip</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.closeButton} onPress={() => setCameraVisible(false)}>
                                <Text style={styles.closeButtonText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </CameraView>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    {/* Form Header */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <View style={styles.iconBackground}>
                                <Image source={images.warning} style={styles.icon} resizeMode="contain" />
                            </View>
                        </View>
                        <Text style={styles.heading}>Incident Report</Text>
                        <Text style={styles.subheading}>
                            Please provide accurate details about the incident you're reporting
                        </Text>
                    </View>

                    {/* Input: Title */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Incident Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter incident title..."
                            placeholderTextColor="#94a3b8"
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    {/* Input: Camera */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Take Photo</Text>
                        <TouchableOpacity style={styles.uploadButton} onPress={() => setCameraVisible(true)}>
                            <Text style={styles.uploadButtonText}>Open Camera</Text>
                        </TouchableOpacity>
                        {media && (
                            <Image
                                source={{ uri: media.uri }}
                                style={styles.mediaPreview}
                                resizeMode="cover"
                            />
                        )}
                    </View>

                    {/* Input: Description */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.descriptionInput]}
                            multiline
                            placeholder="Describe the incident in detail..."
                            placeholderTextColor="#94a3b8"
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>Submit Report</Text>
                        )}
                    </TouchableOpacity>

                    {/* Modal for Warning Before Biometric */}
                    {isModalVisible && (
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainer}>
                                <Image source={images.warning} style={styles.modalIcon} resizeMode="contain" />
                                <Text style={styles.modalTitle}>Important Warning</Text>
                                <Text style={styles.modalText}>
                                    Submitting a false incident report can have serious legal
                                    consequences. Please ensure that the information you are
                                    submitting is accurate and truthful.
                                </Text>

                                <CustomButton
                                    title="I Understand - Proceed"
                                    onPress={handleModalConfirm}
                                    bgVariant="primary"
                                    textVariant="light"
                                    style={{ marginBottom: 12 }}
                                />

                                <CustomButton
                                    title="Cancel Report"
                                    onPress={handleModalCancel}
                                    bgVariant="danger"
                                    textVariant="light"
                                />
                            </View>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
};

export default IncidentReportScreen;
