import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import FaceVerificationCamera from './FaceVerificationCamera';
import faceppService, { FaceVerificationResult } from '@/lib/facepp';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FaceVerificationStepProps {
  onVerificationComplete: (result: FaceVerificationResult) => void;
  onBack: () => void;
  idImage: string;
  selfieImage: string;
}

const FaceVerificationStep: React.FC<FaceVerificationStepProps> = ({
  onVerificationComplete,
  onBack,
  idImage,
  selfieImage,
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<FaceVerificationResult | null>(null);

  const handleSelfieCapture = (uri: string) => {
    // This is now handled in the parent component
    setShowCamera(false);
  };

  const handleVerification = async () => {
    if (!idImage || !selfieImage) {
      Alert.alert('Missing Images', 'Please upload your ID and take a selfie to continue.');
      return;
    }

    if (!faceppService.isConfigured()) {
      Alert.alert(
        'Service Not Configured', 
        'Face verification service is not properly configured. Please contact support.'
      );
      return;
    }

    setIsVerifying(true);
    try {
      const result = await faceppService.verifyFace(idImage, selfieImage, {
        minConfidence: 60, // Lowered threshold for better real-world usability
      });

      setVerificationResult(result);
      
      if (result.isMatch) {
        Alert.alert(
          '✅ Verification Successful',
          `Face verification completed successfully!\n\nConfidence Score: ${result.confidence.toFixed(1)}%\n\nYour identity has been verified.`,
          [
            {
              text: 'Continue',
              onPress: () => onVerificationComplete(result),
            },
          ]
        );
      } else {
        // Show different alerts based on error type
        let alertTitle = '❌ Verification Failed';
        let alertMessage = result.error || 'Face verification failed. Please try again.';
        let buttons: any[] = [
          {
            text: 'Cancel',
            style: 'cancel' as const,
          },
          {
            text: 'Retry',
            onPress: () => {
              setVerificationResult(null);
              setIsVerifying(false);
            },
          },
        ];

        // Customize alert based on error type
        switch (result.errorType) {
          case 'image_quality':
            alertTitle = '📸 Image Quality Issue';
            alertMessage = result.error + '\n\n💡 Tips:\n• Ensure good lighting\n• Remove sunglasses/hats\n• Keep face centered\n• Avoid shadows';
            buttons = [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Retake Photos',
                onPress: () => {
                  setVerificationResult(null);
                  setIsVerifying(false);
                },
              },
            ];
            break;
          
          case 'verification_failure':
            alertTitle = '👤 Identity Mismatch';
            alertMessage = result.error + '\n\n💡 Common causes:\n• Different lighting conditions\n• Different angles or expressions\n• Glasses, hats, or accessories\n• Age differences between ID and current photo\n\nTry taking a new selfie with better lighting and neutral expression.';
            buttons = [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Retake Selfie',
                onPress: () => {
                  setVerificationResult(null);
                  setIsVerifying(false);
                },
              },
            ];
            break;
          
          case 'technical_error':
            alertTitle = '🔧 Technical Issue';
            alertMessage = result.error + '\n\nThis is a technical problem, not an issue with your photos.';
            buttons = [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Retry',
                onPress: () => {
                  setVerificationResult(null);
                  setIsVerifying(false);
                },
              },
            ];
            break;
        }

        Alert.alert(alertTitle, alertMessage, buttons);
      }
    } catch (error) {
      console.error('Verification error:', error);
      
      // Handle different types of errors
      let errorMessage = 'Failed to verify identity. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('timeout')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('API') || error.message.includes('service')) {
          errorMessage = 'Service temporarily unavailable. Please try again in a few moments.';
        }
      }
      
      Alert.alert(
        '❌ Verification Error',
        errorMessage,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Retry',
            onPress: () => {
              setVerificationResult(null);
              setIsVerifying(false);
            },
          },
        ]
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const resetVerification = () => {
    setVerificationResult(null);
  };

  if (showCamera) {
    return (
      <FaceVerificationCamera
        onCapture={handleSelfieCapture}
        onClose={() => setShowCamera(false)}
        title="Take Selfie"
        subtitle="Position your face clearly in the frame"
      />
    );
  }

  return (
    <Animated.View 
      entering={SlideInRight.duration(400)}
      exiting={SlideOutLeft.duration(400)}
      style={styles.container}
    >
      {/* Compact Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.iconGradient}
          >
            <Ionicons name="shield-checkmark" size={24} color="white" />
          </LinearGradient>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Identity Verification</Text>
          <Text style={styles.headerSubtitle}>Upload ID and take selfie</Text>
        </View>
      </View>

      {/* Compact Steps Layout */}
      <View style={styles.stepsLayout}>
        {/* Step 1: ID Upload */}
        <View style={styles.stepSection}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Upload ID</Text>
            {idImage && (
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            )}
          </View>
          
          <View style={[styles.uploadBox, styles.uploadBoxFilled]}>
            <View style={styles.imageBox}>
              <Image source={{ uri: idImage }} style={styles.uploadedImage} />
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark" size={12} color="white" />
              </View>
            </View>
          </View>
        </View>

        {/* Step 2: Selfie */}
        <View style={styles.stepSection}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={styles.stepTitle}>Take Selfie</Text>
            {selfieImage && (
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.uploadBox, selfieImage && styles.uploadBoxFilled]} 
            onPress={() => setShowCamera(true)}
            disabled={isVerifying}
          >
            {selfieImage ? (
              <View style={styles.imageBox}>
                <Image source={{ uri: selfieImage }} style={styles.uploadedImage} />
                <TouchableOpacity 
                  style={styles.changeButton}
                  onPress={() => setShowCamera(true)}
                >
                  <Ionicons name="camera" size={14} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadPrompt}>
                <Ionicons name="camera" size={24} color="#667eea" />
                <Text style={styles.uploadPromptText}>Tap to capture</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Compact Result */}
      {verificationResult && (
        <Animated.View 
          entering={FadeInDown.duration(300)}
          style={styles.resultBox}
        >
          <Ionicons 
            name={verificationResult.isMatch ? "checkmark-circle" : "close-circle"} 
            size={24} 
            color={verificationResult.isMatch ? "#10b981" : "#ef4444"} 
          />
          <View style={styles.resultText}>
            <Text style={[
              styles.resultTitle,
              { color: verificationResult.isMatch ? "#10b981" : "#ef4444" }
            ]}>
              {verificationResult.isMatch ? "Success" : "Failed"}
            </Text>
            <Text style={styles.resultDetails}>
              {verificationResult.isMatch 
                ? `${verificationResult.confidence.toFixed(1)}% match`
                : verificationResult.errorType === 'verification_failure'
                ? `${verificationResult.confidence.toFixed(1)}% match (too low)`
                : verificationResult.errorType === 'image_quality'
                ? 'Image quality issue'
                : 'Technical error'
              }
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Compact Tips */}
      <View style={styles.tipsRow}>
        <View style={styles.tipItem}>
          <Ionicons name="sunny" size={14} color="#667eea" />
          <Text style={styles.tipText}>Good lighting</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="eye" size={14} color="#667eea" />
          <Text style={styles.tipText}>Clear face</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="locate" size={14} color="#667eea" />
          <Text style={styles.tipText}>Centered</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={styles.resetButton} 
          onPress={resetVerification}
          disabled={isVerifying}
        >
          <Ionicons name="refresh" size={16} color="#6b7280" />
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.verifyButton, 
            (!idImage || !selfieImage || isVerifying) && styles.verifyButtonDisabled
          ]} 
          onPress={handleVerification}
          disabled={!idImage || !selfieImage || isVerifying}
        >
          {isVerifying ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={18} color="white" />
              <Text style={styles.verifyButtonText}>Verify</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  stepsLayout: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  stepSection: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stepNumber: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    minHeight: 80,
  },
  uploadBoxFilled: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  uploadPrompt: {
    alignItems: 'center',
  },
  uploadPromptText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginTop: 6,
  },
  imageBox: {
    width: '100%',
    height: 60,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resultText: {
    marginLeft: 12,
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultDetails: {
    fontSize: 12,
    color: '#6b7280',
  },
  tipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipText: {
    fontSize: 11,
    color: '#374151',
    marginLeft: 4,
    fontWeight: '500',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 'auto',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 4,
  },
  verifyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  verifyButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 6,
  },
});

export default FaceVerificationStep; 