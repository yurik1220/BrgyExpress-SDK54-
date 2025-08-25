import axios from 'axios';

// Face++ API endpoints
const FACEPP_BASE_URL = 'https://api-us.faceplusplus.com/facepp/v3';
const LIVENESS_BASE_URL = 'https://api-us.faceplusplus.com/facepp/v1';

// Get API credentials using existing pattern
const EXPO_PUBLIC_FACEPP_API_KEY = process.env.EXPO_PUBLIC_FACEPP_API_KEY || '';
const EXPO_PUBLIC_FACEPP_API_SECRET = process.env.EXPO_PUBLIC_FACEPP_API_SECRET || '';

// Types for Face++ API responses
export interface FaceDetectionResult {
  face_num: number;
  faces: Array<{
    face_token: string;
    face_rectangle: {
      top: number;
      left: number;
      width: number;
      height: number;
    };
    attributes?: {
      facequality?: {
        threshold: number;
        value: number;
      };
    };
  }>;
  error_message?: string;
}

export interface FaceCompareResult {
  confidence: number;
  thresholds: {
    '1e-3': number;
    '1e-4': number;
    '1e-5': number;
  };
  face_list1: Array<{
    face_token: string;
  }>;
  face_list2: Array<{
    face_token: string;
  }>;
  error_message?: string;
}

export interface FaceVerificationResult {
  isMatch: boolean;
  confidence: number;
  faceDetected: boolean;
  error?: string;
  errorType?: 'image_quality' | 'verification_failure' | 'technical_error';
  details?: {
    idFaceDetected: boolean;
    selfieFaceDetected: boolean;
    idQuality?: string;
    selfieQuality?: string;
  };
}

class FaceppService {
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = EXPO_PUBLIC_FACEPP_API_KEY;
    this.apiSecret = EXPO_PUBLIC_FACEPP_API_SECRET;
    
    if (!this.apiKey || !this.apiSecret) {
      console.warn('Face++ API credentials not found. Please check your environment variables.');
    }
  }

  /**
   * Convert image to base64
   */
  private imageToBase64(imageUri: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function() {
        const reader = new FileReader();
        reader.onloadend = function() {
          const base64data = reader.result as string;
          const base64 = base64data.split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = () => reject(new Error('Failed to load image'));
      xhr.open('GET', imageUri);
      xhr.responseType = 'blob';
      xhr.send();
    });
  }

  /**
   * Detect faces in an image
   */
  async detectFaces(imageUri: string): Promise<FaceDetectionResult> {
    try {
      const imageBase64 = await this.imageToBase64(imageUri);
      
      const formData = new FormData();
      formData.append('api_key', this.apiKey);
      formData.append('api_secret', this.apiSecret);
      formData.append('image_base64', imageBase64);
      formData.append('return_attributes', 'facequality');

      const response = await axios.post(`${FACEPP_BASE_URL}/detect`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      });

      // Check for API errors in response
      if (response.data.error_message) {
        throw new Error(`API Error: ${response.data.error_message}`);
      }

      return response.data;
    } catch (error) {
      console.error('Face detection error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          throw new Error('Request timeout. Please try again.');
        } else if (error.response && error.response.status === 401) {
          throw new Error('API authentication failed. Please contact support.');
        } else if (error.response && error.response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        } else if (error.response && error.response.status >= 500) {
          throw new Error('Service temporarily unavailable. Please try again later.');
        } else if (!error.response) {
          throw new Error('Network error. Please check your internet connection.');
        }
      }
      
      throw new Error('Failed to detect faces in image. Please try again.');
    }
  }

  /**
   * Compare two face images
   */
  async compareFaces(image1Uri: string, image2Uri: string): Promise<FaceCompareResult> {
    try {
      const image1Base64 = await this.imageToBase64(image1Uri);
      const image2Base64 = await this.imageToBase64(image2Uri);

      const formData = new FormData();
      formData.append('api_key', this.apiKey);
      formData.append('api_secret', this.apiSecret);
      formData.append('image_base64_1', image1Base64);
      formData.append('image_base64_2', image2Base64);

      const response = await axios.post(`${FACEPP_BASE_URL}/compare`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      });

      // Check for API errors in response
      if (response.data.error_message) {
        throw new Error(`API Error: ${response.data.error_message}`);
      }

      return response.data;
    } catch (error) {
      console.error('Face comparison error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          throw new Error('Request timeout. Please try again.');
        } else if (error.response && error.response.status === 401) {
          throw new Error('API authentication failed. Please contact support.');
        } else if (error.response && error.response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        } else if (error.response && error.response.status >= 500) {
          throw new Error('Service temporarily unavailable. Please try again later.');
        } else if (!error.response) {
          throw new Error('Network error. Please check your internet connection.');
        }
      }
      
      throw new Error('Failed to compare faces. Please try again.');
    }
  }



  /**
   * Comprehensive face verification including detection and comparison
   */
  async verifyFace(
    idImageUri: string, 
    selfieImageUri: string, 
    options: {
      minConfidence?: number;
    } = {}
  ): Promise<FaceVerificationResult> {
    const {
      minConfidence = 60  // Lowered from 80% to 60% for better real-world usability
    } = options;

    try {
      // Step 1: Detect faces in both images
      const [idDetection, selfieDetection] = await Promise.all([
        this.detectFaces(idImageUri),
        this.detectFaces(selfieImageUri)
      ]);

      // Check if faces are detected and analyze quality
      const idFaceDetected = idDetection.face_num > 0;
      const selfieFaceDetected = selfieDetection.face_num > 0;

      // Image quality issues
      if (!idFaceDetected) {
        return {
          isMatch: false,
          confidence: 0,
          faceDetected: false,
          errorType: 'image_quality',
          error: 'No face detected in ID image. Please ensure the face photo on your ID is clearly visible and not covered.',
          details: {
            idFaceDetected: false,
            selfieFaceDetected,
          }
        };
      }

      if (!selfieFaceDetected) {
        return {
          isMatch: false,
          confidence: 0,
          faceDetected: false,
          errorType: 'image_quality',
          error: 'No face detected in selfie. Please ensure your face is clearly visible, well-lit, and not wearing sunglasses.',
          details: {
            idFaceDetected,
            selfieFaceDetected: false,
          }
        };
      }

      // Step 2: Compare faces
      const comparison = await this.compareFaces(idImageUri, selfieImageUri);
      
      if (comparison.error_message) {
        return {
          isMatch: false,
          confidence: 0,
          faceDetected: true,
          errorType: 'technical_error',
          error: `Face comparison failed: ${comparison.error_message}`,
          details: {
            idFaceDetected,
            selfieFaceDetected,
          }
        };
      }

      const confidence = comparison.confidence;
      const isMatch = confidence >= minConfidence;

      // If verification failed but faces were detected, it's likely a verification failure
      if (!isMatch) {
        let errorMessage = `Face verification failed. Confidence: ${confidence.toFixed(1)}% (minimum required: ${minConfidence}%).`;
        
        // Provide more helpful guidance based on confidence level
        if (confidence >= 40) {
          errorMessage += '\n\nThe faces might be the same person, but the images have quality issues. Try:\n• Better lighting\n• Remove glasses/hats\n• Straight-on angle\n• Neutral expression';
        } else if (confidence >= 20) {
          errorMessage += '\n\nThe faces appear to be different people or have significant quality issues.';
        } else {
          errorMessage += '\n\nThe faces appear to be completely different people.';
        }
        
        return {
          isMatch: false,
          confidence,
          faceDetected: true,
          errorType: 'verification_failure',
          error: errorMessage,
          details: {
            idFaceDetected,
            selfieFaceDetected,
          }
        };
      }

      return {
        isMatch: true,
        confidence,
        faceDetected: true,
        details: {
          idFaceDetected,
          selfieFaceDetected,
        }
      };

    } catch (error) {
      console.error('Face verification error:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('timeout')) {
          return {
            isMatch: false,
            confidence: 0,
            faceDetected: false,
            errorType: 'technical_error',
            error: 'Network error. Please check your internet connection and try again.'
          };
        } else if (error.message.includes('API')) {
          return {
            isMatch: false,
            confidence: 0,
            faceDetected: false,
            errorType: 'technical_error',
            error: 'Service temporarily unavailable. Please try again in a few moments.'
          };
        }
      }
      
      return {
        isMatch: false,
        confidence: 0,
        faceDetected: false,
        errorType: 'technical_error',
        error: 'Verification failed. Please ensure both images are clear and try again.'
      };
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }
}

// Export singleton instance
export const faceppService = new FaceppService();
export default faceppService; 