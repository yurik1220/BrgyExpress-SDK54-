import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import faceppService, { FaceVerificationResult } from '../lib/facepp';
import FaceVerificationCamera from './FaceVerificationCamera';

const { width: screenWidth } = Dimensions.get('window');

interface RequirementsStepProps {
  onRequirementsComplete: (idImage: string, selfieImage: string, verificationResult: any) => void;
  onBack: () => void;
}

const RequirementsStep: React.FC<RequirementsStepProps> = ({
  onRequirementsComplete,
  onBack,
}) => {
  const [idImage, setIdImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<FaceVerificationResult | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [subStep, setSubStep] = useState(1); // 1: ID, 2: Selfie, 3: Confirm

  // Debug useEffect to monitor modal state changes
  useEffect(() => {
    console.log('showVerificationModal state changed to:', showVerificationModal);
  }, [showVerificationModal]);

  const pickIdImage = async () => {
    try {
      setIsUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIdImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking ID image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelfieCapture = (uri: string) => {
    setSelfieImage(uri);
    setShowCamera(false);
  };

  const startIdCamera = async () => {
    try {
      setIsUploading(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0]) {
        setIdImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error capturing ID image:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const canGoNextFromId = () => !!idImage && !isUploading;
  const canGoNextFromSelfie = () => !!selfieImage && !isUploading;

  const handleNextSubStep = () => {
    if (subStep === 1 && canGoNextFromId()) {
      setSubStep(2);
      return;
    }
    if (subStep === 2 && canGoNextFromSelfie()) {
      setSubStep(3);
      return;
    }
  };

  const handlePrevSubStep = () => {
    if (subStep > 1) setSubStep(prev => prev - 1);
  };

  const handleContinue = async () => {
    if (!idImage || !selfieImage) {
      Alert.alert(
        'Requirements Incomplete',
        'Please upload both your ID and take a selfie before continuing.',
        [{ text: 'OK' }]
      );
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
      const result = await faceppService.verifyFace(idImage, selfieImage, { minConfidence: 60 });
      setVerificationResult(result);
      onRequirementsComplete(idImage, selfieImage, result);
    } catch (error) {
      console.error('Verification error:', error);
      const fallback = { 
        isMatch: false, 
        error: 'Verification failed due to technical issues',
        errorType: 'technical_error',
        confidence: 0,
        faceDetected: false
      } as FaceVerificationResult;
      setVerificationResult(fallback);
      onRequirementsComplete(idImage, selfieImage, fallback);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleModalOkay = () => {
    setShowVerificationModal(false);
  };

  const renderVerificationModal = () => {
    console.log('Modal render - showVerificationModal:', showVerificationModal);
    return (
      <Modal
        visible={showVerificationModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <LinearGradient
                  colors={isVerifying ? ['#667eea', '#764ba2'] : 
                          verificationResult?.isMatch ? ['#10b981', '#059669'] : ['#ef4444', '#dc2626']}
                  style={styles.modalIconGradient}
                >
                  <Ionicons 
                    name={isVerifying ? "shield" : verificationResult?.isMatch ? "checkmark-circle" : "close-circle"} 
                    size={32} 
                    color="white" 
                  />
                </LinearGradient>
              </View>
              <Text style={styles.modalTitle}>
                {isVerifying ? 'Verifying Identity' : 
                 verificationResult?.isMatch ? 'Verification Successful' : 'Verification Failed'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {isVerifying ? 'Please wait while we verify your identity...' :
                 verificationResult?.isMatch ? 'Your identity has been verified successfully.' :
                 'We were unable to verify your identity. You can still continue with your request.'}
              </Text>
            </View>

            <View style={styles.modalBody}>
              {isVerifying ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#667eea" />
                  <Text style={styles.loadingText}>Processing verification...</Text>
                </View>
              ) : (
                <View style={styles.resultContainer}>
                  {verificationResult?.isMatch && (
                    <View style={styles.successItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                      <Text style={styles.successText}>
                        Confidence Score: {verificationResult.confidence?.toFixed(1)}%
                      </Text>
                    </View>
                  )}
                  {!verificationResult?.isMatch && verificationResult?.error && (
                    <View style={styles.errorItem}>
                      <Ionicons name="alert-circle" size={20} color="#ef4444" />
                      <Text style={styles.errorText}>{verificationResult.error}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={[
                styles.modalButton,
                isVerifying && styles.modalButtonDisabled
              ]} 
              onPress={handleModalOkay}
              disabled={isVerifying}
            >
              <Text style={styles.modalButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
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
      style={styles.root}
    >
        {/* Header Section removed per design */}

        {/* Progress Indicator removed as requested */}

        {/* Sub-stepper removed as requested */}

        {/* Sub-step content */}
        {subStep === 1 && (
          <View style={styles.requirementsSection}>
            {idImage ? (
              <>
                <View style={styles.imagePreviewContainerMinimal}>
                  <Text style={styles.previewMiniLabel}>ID photo added</Text>
                  <View style={styles.previewMiniRow}>
                    <TouchableOpacity style={styles.changeButton} onPress={pickIdImage}>
                      <Ionicons name="cloud-upload" size={16} color="#1f2937" />
                      <Text style={styles.changeButtonText}>Replace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removeButton} onPress={() => setIdImage(null)}>
                      <Ionicons name="trash" size={16} color="#ef4444" />
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.ivHeader}>
                  <LinearGradient colors={["#60a5fa", "#22c55e"]} style={styles.ivIconCircle}>
                    <Ionicons name="shield-checkmark" size={28} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.ivTitle}>Identity Verification</Text>
                  <Text style={styles.ivSubtitle}>Verify Your Identity</Text>
                  <Text style={styles.ivHelper}>Upload or scan a valid Government-issued ID (JPG, PNG, PDF, max 5MB)</Text>
                </View>

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

                <View style={styles.tipsCard}>
                  <Text style={styles.tipsHeading}>Tips for Best Results</Text>
                  <View style={styles.tipLine}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.tipLineText}>Ensure text is clearly visible</Text>
                  </View>
                  <View style={styles.tipLine}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.tipLineText}>Avoid glare and shadows</Text>
                  </View>
                  <View style={styles.tipLine}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.tipLineText}>Use good lighting</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {subStep === 2 && (
          <View style={styles.requirementsSection}>
            <Text style={styles.sectionTitle}>Selfie Capture</Text>
            <Text style={styles.sectionSubtitle}>Take a clear selfie for face matching guidance</Text>
            <View style={styles.guidanceRow}>
              <Ionicons name="bulb" size={18} color="#f59e0b" />
              <Text style={styles.guidanceText}>Use bright, even lighting and keep the phone at eye level.</Text>
            </View>

            <View style={styles.requirementCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconContainer}>
                  <Ionicons name="camera" size={20} color="#667eea" />
                </View>
                <View style={styles.cardTitleContainer}>
                  <Text style={styles.cardTitle}>Real-time Capture</Text>
                  <Text style={styles.cardSubtitle}>Align your face within the frame</Text>
                </View>
                {selfieImage && (
                  <View style={styles.statusBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  </View>
                )}
              </View>

              {selfieImage ? (
                <View style={styles.imagePreviewContainerMinimal}>
                  <Text style={styles.previewMiniLabel}>Selfie captured</Text>
                  <View style={styles.previewMiniRow}>
                    <TouchableOpacity style={styles.changeButton} onPress={() => setShowCamera(true)}>
                      <Ionicons name="camera" size={16} color="#1f2937" />
                      <Text style={styles.changeButtonText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removeButton} onPress={() => setSelfieImage(null)}>
                      <Ionicons name="trash" size={16} color="#ef4444" />
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.primaryGhostArea} onPress={() => setShowCamera(true)}>
                  <Ionicons name="camera" size={28} color="#4f46e5" />
                  <Text style={styles.primaryGhostTitle}>Open Camera</Text>
                  <Text style={styles.uploadDescription}>Position your face clearly, remove glasses if possible</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {subStep === 3 && (
          <View style={styles.requirementsSection}>
            <Text style={styles.sectionTitle}>Match & Confirm</Text>
            <Text style={styles.sectionSubtitle}>We will compare your ID photo with your selfie</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusChip}><Ionicons name="checkmark-circle" size={16} color="#10b981" /><Text style={styles.statusChipText}>ID ready</Text></View>
              <View style={styles.statusChip}><Ionicons name="checkmark-circle" size={16} color="#10b981" /><Text style={styles.statusChipText}>Selfie ready</Text></View>
            </View>

            <View style={styles.requirementCard}>
              <View style={styles.previewRow}>
                <View style={styles.previewColumn}>
                  <Text style={styles.previewLabel}>ID</Text>
                  {idImage ? (
                    <Image source={{ uri: idImage }} style={styles.sidePreview} />
                  ) : (
                    <View style={styles.sidePreviewPlaceholder} />
                  )}
                </View>
                <View style={styles.previewColumn}>
                  <Text style={styles.previewLabel}>Selfie</Text>
                  {selfieImage ? (
                    <Image source={{ uri: selfieImage }} style={styles.sidePreview} />
                  ) : (
                    <View style={styles.sidePreviewPlaceholder} />
                  )}
                </View>
              </View>

              <View style={styles.requirementTips}>
                <Text style={styles.tipsTitle}>What happens next?</Text>
                <Text style={styles.tipText}>We compute a confidence score to check if the two faces match.</Text>
              </View>

              <TouchableOpacity 
                style={[
                  styles.primaryButton,
                  styles.fullWidth,
                  (isUploading || isVerifying || !idImage || !selfieImage) && styles.primaryButtonDisabled
                ]}
                onPress={handleContinue}
                disabled={isUploading || isVerifying || !idImage || !selfieImage}
              >
                {isVerifying ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={styles.buttonText}>Verifying...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons name="shield-checkmark" size={20} color="white" />
                    <Text style={styles.buttonText}>Run Verification</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Section: dynamic */}
        <View style={styles.actionSection}>
          {subStep === 1 && (
            <>
              <TouchableOpacity 
                style={[styles.primaryButton, styles.buttonLeft, !canGoNextFromId() && styles.primaryButtonDisabled]}
                onPress={handleNextSubStep}
                disabled={!canGoNextFromId()}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                  <Text style={styles.buttonText}>Next</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryButton, styles.buttonRight]} onPress={onBack}>
                <Ionicons name="arrow-back" size={18} color="#6b7280" />
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.privacyNote}>Your images are used only for verification and are securely handled.</Text>
            </>
          )}
          {subStep === 2 && (
            <>
              <TouchableOpacity 
                style={[styles.primaryButton, styles.buttonLeft, !canGoNextFromSelfie() && styles.primaryButtonDisabled]}
                onPress={handleNextSubStep}
                disabled={!canGoNextFromSelfie()}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                  <Text style={styles.buttonText}>Next</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryButton, styles.buttonRight]} onPress={handlePrevSubStep}>
                <Ionicons name="arrow-back" size={18} color="#6b7280" />
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.privacyNote}>We never share your data with third parties without consent.</Text>
            </>
          )}
          {subStep === 3 && (
            <>
              <TouchableOpacity 
                style={[styles.primaryButton, styles.fullWidth, (!verificationResult && !isVerifying) && styles.primaryButtonDisabled]}
                onPress={() => {
                  if (verificationResult) {
                    onRequirementsComplete(idImage!, selfieImage!, verificationResult);
                  }
                }}
                disabled={!verificationResult || isVerifying}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.buttonText}>Continue</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryButton, styles.buttonRight]} onPress={handlePrevSubStep}>
                <Ionicons name="arrow-back" size={18} color="#6b7280" />
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.privacyNote}>Verification results are linked to your application only.</Text>
            </>
          )}
        </View>

        {renderVerificationModal()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#eef2ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e7ff',
    maxWidth: 720,
    alignSelf: 'center',
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 22,
  },
  progressSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
    width: '50%',
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  requirementsSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    maxWidth: 720,
    alignSelf: 'center',
    flexGrow: 1,
  },
  ivHeader: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  ivIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  ivTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  ivSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  ivHelper: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 6,
  },
  actionCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 12,
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
  tipsCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tipsHeading: {
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  tipLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  tipLineText: {
    color: '#374151',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  subStepperSection: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  subStepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subStepItem: {
    alignItems: 'center',
    flex: 1,
  },
  subStepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  subStepDotActive: {
    backgroundColor: '#667eea',
  },
  subStepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  subStepNumberActive: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  subStepLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  subStepLabelActive: {
    color: '#374151',
  },
  requirementsGrid: {
    gap: 20,
  },
  dualActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  mediaButton: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    paddingVertical: 12,
    minWidth: '48%',
  },
  mediaButtonText: {
    marginLeft: 8,
    color: '#0284c7',
    fontWeight: '600',
  },
  mediaButtonOutline: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 12,
    minWidth: '48%',
  },
  mediaButtonOutlineText: {
    marginLeft: 8,
    color: '#0284c7',
    fontWeight: '600',
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
  formatsText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: -8,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#eef2ff',
    borderRadius: 999,
  },
  chipText: {
    fontSize: 11,
    color: '#4f46e5',
    fontWeight: '600',
  },
  chipSoft: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipTextSoft: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  guidanceText: {
    fontSize: 13,
    color: '#6b7280',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusChipText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '600',
  },
  orHelper: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 6,
  },
  privacyNote: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 8,
  },
  requirementCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 12,
  },
  previewColumn: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 6,
  },
  sidePreview: {
    width: '100%',
    height: 110,
    borderRadius: 12,
  },
  sidePreviewPlaceholder: {
    width: '100%',
    height: 110,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    marginLeft: 8,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#bae6fd',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    minHeight: 120,
  },
  uploadAreaFilled: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  uploadAreaDisabled: {
    opacity: 0.6,
  },
  imagePreviewContainer: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePreviewContainerMinimal: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    padding: 10,
    marginBottom: 8,
  },
  previewMiniLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 6,
  },
  previewMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  overlayButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changeButtonText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  removeButtonText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  uploadPrompt: {
    alignItems: 'center',
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  uploadDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 4,
  },
  uploadSpinner: {
    marginTop: 12,
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
    marginBottom: 6,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  tipText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  actionSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    maxWidth: 720,
    alignSelf: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionSecondarySpacing: {
    marginTop: 8,
  },
  fullWidth: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonLeft: {
    alignSelf: 'flex-start',
    minWidth: 140,
  },
  primaryButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: 'white',
  },
  buttonRight: {
    alignSelf: 'flex-start',
    marginTop: 8,
    minWidth: 140,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalBody: {
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  resultContainer: {
    gap: 12,
  },
  successItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  successText: {
    fontSize: 16,
    color: '#166534',
    marginLeft: 12,
    fontWeight: '500',
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 16,
    color: '#991b1b',
    marginLeft: 12,
    fontWeight: '500',
  },
  modalButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default RequirementsStep; 