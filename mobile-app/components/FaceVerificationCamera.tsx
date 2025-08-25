import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInUp,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FaceVerificationCameraProps {
  onCapture: (uri: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

const FaceVerificationCamera: React.FC<FaceVerificationCameraProps> = ({
  onCapture,
  onClose,
  title = "Face Verification",
  subtitle = "Position your face within the frame and take a clear photo"
}) => {
  const [cameraType, setCameraType] = useState<CameraType>('front');
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const cameraRef = useRef<CameraView>(null);
  const scale = useSharedValue(1);
  const [permission, requestPermission] = useCameraPermissions();

  // Request permission via button to avoid re-render loops

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    scale.value = withSpring(0.9, { duration: 100 }, () => {
      scale.value = withSpring(1, { duration: 100 });
    });

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        exif: true,
        skipProcessing: false,
      });

      if (photo) {
        setCapturedImage(photo.uri);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setShowPreview(false);
  };

  const handleUsePhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={64} color="#ef4444" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            This app needs camera access to verify your identity. Please enable camera permissions in your device settings.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.permissionButton, { marginTop: 12, backgroundColor: '#6b7280' }]} onPress={onClose}>
            <Text style={styles.permissionButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showPreview && capturedImage) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedImage }} style={styles.previewImage} />
        
        <Animated.View 
          entering={SlideInUp.duration(300)}
          style={styles.previewControls}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)', 'transparent']}
            style={styles.previewGradient}
          >
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Photo Preview</Text>
              <Text style={styles.previewSubtitle}>Review your photo before proceeding</Text>
            </View>
            
            <View style={styles.previewButtons}>
              <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                <Ionicons name="refresh" size={20} color="#6b7280" />
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.usePhotoButton} onPress={handleUsePhoto}>
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.usePhotoButtonText}>Use Photo</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
      >
        {/* Header */}
        <Animated.View 
          entering={FadeIn.duration(500)}
          style={styles.header}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)', 'transparent']}
            style={styles.headerGradient}
          >
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>{subtitle}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Face Detection Overlay */}
        <View style={styles.faceOverlay}>
          <View style={styles.faceFrame}>
            <View style={styles.corner} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <Text style={styles.faceInstruction}>Position your face here</Text>
        </View>

        {/* Camera Controls */}
        <Animated.View 
          entering={SlideInUp.duration(500)}
          style={styles.controls}
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
            style={styles.controlsGradient}
          >
            <View style={styles.controlsContent}>
              <View style={styles.controlButtons}>
                <TouchableOpacity style={styles.controlButton}>
                  <Ionicons name="settings" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              <Animated.View style={[styles.captureButton, animatedStyle]}>
                <TouchableOpacity
                  style={styles.captureButtonInner}
                  onPress={handleCapture}
                  disabled={isCapturing}
                >
                  {isCapturing ? (
                    <ActivityIndicator color="white" size="large" />
                  ) : (
                    <View style={styles.captureButtonIcon} />
                  )}
                </TouchableOpacity>
              </Animated.View>
              
              <View style={styles.controlButtons}>
                <TouchableOpacity style={styles.controlButton}>
                  <Ionicons name="help-circle" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  faceOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceFrame: {
    width: 250,
    height: 300,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#667eea',
    top: -2,
    left: -2,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  cornerBottomLeft: {
    top: 'auto',
    bottom: -2,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  cornerBottomRight: {
    top: 'auto',
    bottom: -2,
    right: -2,
    left: 'auto',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  faceInstruction: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  controlsGradient: {
    paddingBottom: 40,
    paddingTop: 20,
  },
  controlsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  controlButtons: {
    width: 60,
    alignItems: 'center',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#667eea',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  previewGradient: {
    paddingBottom: 40,
    paddingTop: 20,
  },
  previewHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  previewSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  previewButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retakeButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  usePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  usePhotoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#f8fafc',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
    marginTop: 20,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 30,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default FaceVerificationCamera; 