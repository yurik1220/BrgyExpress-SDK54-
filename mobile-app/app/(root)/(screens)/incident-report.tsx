import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    Alert,
} from "react-native";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import * as LocalAuthentication from "expo-local-authentication";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import axios from "axios";
import CustomButton from "@/components/CustomButton";
import { images } from "@/constants";
import { useAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "@/styles/ir_styles";

type Media = {
    uri: string;
    type: string;
} | null;

const polygonCoordinates: [number, number][] = [
    [120.9883678, 14.7157794],
    [120.9890223, 14.7149233],
    [120.9902561, 14.7154317],
    [120.9898108, 14.716319],
    [120.9883678, 14.7157794],
];

function isPointInPolygon(
    point: [number, number],
    polygon: [number, number][]
): boolean {
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

const IncidentReportScreen = () => {
    const router = useRouter();
    const { userId } = useAuth();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [media, setMedia] = useState<Media>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(
        null
    );
    const [cameraVisible, setCameraVisible] = useState(false);
    const [facing, setFacing] = useState<CameraType>("back");
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();

    useEffect(() => {
        (async () => {
            const { status: locationStatus } =
                await Location.requestForegroundPermissionsAsync();
            if (locationStatus !== "granted") {
                Alert.alert(
                    "Permission Denied",
                    "Location permission is required to submit a report."
                );
                return;
            }
            const location = await Location.getCurrentPositionAsync({});
            setUserLocation([location.coords.longitude, location.coords.latitude]);

            if (!permission?.granted) {
                await requestPermission();
            }
        })();
    }, []);

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
            setCameraVisible(false);
        } catch (error) {
            console.error("Error taking picture:", error);
            Alert.alert("Error", "Failed to take picture");
        }
    };

    const toggleCameraType = () => {
        setFacing((current) => (current === "back" ? "front" : "back"));
    };

    const handleSubmit = async () => {
        if (!title || !description || !media) {
            Alert.alert(
                "Missing Fields",
                "Please fill out all fields and take a photo."
            );
            return;
        }

        if (!userId) {
            Alert.alert(
                "Authentication Error",
                "You must be logged in to submit a report."
            );
            return;
        }

        if (!userLocation) {
            Alert.alert("Location Error", "Unable to determine your location.");
            return;
        }

        const isInside = isPointInPolygon(userLocation, polygonCoordinates);
        if (!isInside) {
            Alert.alert(
                "Geofence Restriction",
                "You must be within the allowed area to submit a report."
            );
            return;
        }

        setIsModalVisible(true);
    };

    const handleModalConfirm = async () => {
        setIsModalVisible(false);
        const isHardwareSupported = await LocalAuthentication.hasHardwareAsync();
        const isBiometricEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!isHardwareSupported || !isBiometricEnrolled) {
            Alert.alert(
                "Error",
                "Biometric authentication is not available or set up."
            );
            return;
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: "Authenticate to submit your report",
            fallbackLabel: "Use Passcode",
        });

        if (result.success) {
            await handleFormSubmit();
        } else {
            Alert.alert("Authentication Failed", "Unable to verify your identity.");
        }
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
    };

    const handleFormSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            if (!userId) {
                Alert.alert(
                    "Authentication Error",
                    "You must be logged in to submit a report."
                );
                return;
            }

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

            const response = await axios.post(
                "http://192.168.254.106:5000/api/requests",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            // Replace the current screen with details and prevent going back to form
            router.replace({
                pathname: "/details",
                params: {
                    ...response.data,
                    fromSubmission: 'true' // Add this flag
                },
            });

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

    if (!permission) {
        return <View style={styles.container} />;
    }

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

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={["#fff1f2", "#fee2e2", "#fecaca"]}
                style={styles.gradientBackground}
            />
            <View style={styles.floatingDecoration} />
            <View style={styles.floatingDecoration2} />

            {cameraVisible ? (
                <View style={styles.cameraContainer}>
                    <CameraView style={styles.camera} ref={cameraRef} facing={facing}>
                        <View style={styles.cameraControls}>
                            <TouchableOpacity
                                style={styles.cameraButton}
                                onPress={takePicture}
                            >
                                <View style={styles.cameraButtonInner} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.flipButton}
                                onPress={toggleCameraType}
                            >
                                <Text style={styles.flipButtonText}>Flip</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setCameraVisible(false)}
                            >
                                <Text style={styles.closeButtonText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </CameraView>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <View style={styles.iconBackground}>
                                <Image
                                    source={images.warning}
                                    style={styles.icon}
                                    resizeMode="contain"
                                />
                            </View>
                        </View>
                        <Text style={styles.heading}>Incident Report</Text>
                        <Text style={styles.subheading}>
                            Please provide accurate details about the incident you're reporting
                        </Text>
                    </View>

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

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Take Photo</Text>
                        <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={() => setCameraVisible(true)}
                        >
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

                    {isModalVisible && (
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainer}>
                                <Image
                                    source={images.warning}
                                    style={styles.modalIcon}
                                    resizeMode="contain"
                                />
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