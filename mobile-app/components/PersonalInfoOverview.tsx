import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';

interface PersonalInfoOverviewProps {
  fullName: string;
  birthDate: string;
  address: string;
  contactNumber: string;
  onConfirm: () => void;
  onBack: () => void;
}

const PersonalInfoOverview: React.FC<PersonalInfoOverviewProps> = ({
  fullName,
  birthDate,
  address,
  contactNumber,
  onConfirm,
  onBack,
}) => {
  return (
    <Animated.View 
      entering={SlideInRight.duration(400)}
      exiting={SlideOutLeft.duration(400)}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.iconGradient}
          >
            <Ionicons name="document-text" size={24} color="white" />
          </LinearGradient>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Personal Information</Text>
          <Text style={styles.headerSubtitle}>Review your details</Text>
        </View>
      </View>

      {/* Information Cards */}
      <View style={styles.infoContainer}>
        {/* Name */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="person" size={20} color="#667eea" />
            <Text style={styles.infoLabel}>Full Name</Text>
          </View>
          <Text style={styles.infoValue}>{fullName}</Text>
        </View>

        {/* Birth Date */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="calendar" size={20} color="#667eea" />
            <Text style={styles.infoLabel}>Birth Date</Text>
          </View>
          <Text style={styles.infoValue}>{birthDate}</Text>
        </View>

        {/* Address */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="location" size={20} color="#667eea" />
            <Text style={styles.infoLabel}>Address</Text>
          </View>
          <Text style={styles.infoValue}>{address}</Text>
        </View>

        {/* Contact */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="call" size={20} color="#667eea" />
            <Text style={styles.infoLabel}>Contact Number</Text>
          </View>
          <Text style={styles.infoValue}>{contactNumber}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={styles.confirmButton} 
          onPress={onConfirm}
        >
          <Ionicons name="checkmark" size={18} color="white" />
          <Text style={styles.confirmButtonText}>Confirm & Continue</Text>
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
    marginBottom: 24,
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
  infoContainer: {
    flex: 1,
    gap: 12,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    lineHeight: 22,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 4,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 6,
  },
});

export default PersonalInfoOverview; 