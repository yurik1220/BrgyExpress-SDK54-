import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import faceppService from '@/lib/facepp';

const FaceVerificationTest: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);

  const checkConfiguration = () => {
    setIsChecking(true);
    
    try {
      // Check if service is configured
      const isConfigured = faceppService.isConfigured();
      
      // Log environment variables (for debugging)
      console.log('Environment check:');
      console.log('EXPO_PUBLIC_FACEPP_API_KEY:', process.env.EXPO_PUBLIC_FACEPP_API_KEY ? 'SET' : 'NOT SET');
      console.log('EXPO_PUBLIC_FACEPP_API_SECRET:', process.env.EXPO_PUBLIC_FACEPP_API_SECRET ? 'SET' : 'NOT SET');
      
      if (isConfigured) {
        Alert.alert(
          '✅ Configuration OK',
          'Face++ service is properly configured!\n\nAPI Key: SET\nAPI Secret: SET',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '❌ Configuration Error',
          'Face++ service is not configured.\n\nPlease add to your .env file:\n\nEXPO_PUBLIC_FACEPP_API_KEY=your_api_key\nEXPO_PUBLIC_FACEPP_API_SECRET=your_api_secret',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Configuration check error:', error);
      Alert.alert('Error', 'Failed to check configuration');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.iconGradient}
            >
              <Ionicons name="bug" size={24} color="white" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Face++ Configuration Test</Text>
          <Text style={styles.subtitle}>
            Check if your Face++ API keys are properly configured
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Environment Variables</Text>
          <Text style={styles.sectionText}>
            The app is looking for these environment variables:
          </Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>
              EXPO_PUBLIC_FACEPP_API_KEY=your_api_key{'\n'}
              EXPO_PUBLIC_FACEPP_API_SECRET=your_api_secret
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Setup Instructions</Text>
          <Text style={styles.sectionText}>
            1. Add your Face++ API keys to the .env file{'\n'}
            2. Restart the development server{'\n'}
            3. Test the configuration
          </Text>
        </View>

        <TouchableOpacity
          style={styles.testButton}
          onPress={checkConfiguration}
          disabled={isChecking}
        >
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text style={styles.testButtonText}>
            {isChecking ? 'Checking...' : 'Test Configuration'}
          </Text>
        </TouchableOpacity>

        <View style={styles.note}>
          <Ionicons name="information-circle" size={16} color="#6b7280" />
          <Text style={styles.noteText}>
            Check the console logs for detailed debugging information
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  codeBlock: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
});

export default FaceVerificationTest; 