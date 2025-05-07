import React from "react";
import { View, Text, Image, ScrollView, Linking, TouchableOpacity, Dimensions, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AntDesign, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { format } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { 
  FadeInDown, 
  FadeIn, 
  SlideInRight,
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';
import { styles, detailRowStyles } from "@/styles/details_style";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DetailRowProps {
  icon: string;
  label: string;
  value?: string | null;
  isWarning?: boolean;
  iconType?: 'ant' | 'ion' | 'material';
}

const DetailRow: React.FC<DetailRowProps> = ({ 
  icon, 
  label, 
  value, 
  isWarning = false,
  iconType = 'ant'
}) => {
  if (!value) return null;

  const renderIcon = () => {
    switch (iconType) {
      case 'ion':
        return <Ionicons name={icon as any} size={24} color={isWarning ? '#F44336' : '#3b82f6'} />;
      case 'material':
        return <MaterialCommunityIcons name={icon as any} size={24} color={isWarning ? '#F44336' : '#3b82f6'} />;
      default:
        return <AntDesign name={icon as any} size={24} color={isWarning ? '#F44336' : '#3b82f6'} />;
    }
  };

  return (
    <Animated.View 
      entering={FadeInDown.duration(400).springify()}
      style={detailRowStyles.row}
    >
      <View style={detailRowStyles.iconContainer}>
        {renderIcon()}
      </View>
      <View style={detailRowStyles.content}>
        <Text style={detailRowStyles.label}>{label}</Text>
        <Text style={[detailRowStyles.value, isWarning && detailRowStyles.warning]}>
          {value}
        </Text>
      </View>
    </Animated.View>
  );
};

const DetailsScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const fromSubmission = params.fromSubmission === 'true';

  const {
    type,
    document_type,
    reason,
    description,
    media_url,
    full_name,
    birth_date,
    address,
    contact,
    clerk_id,
    title,
    location,
    created_at,
    status,
    resolved_at,
    rejection_reason,
    appointment_date
  } = params;

  const formattedCreatedAt = created_at
    ? format(new Date(created_at as string), 'MMM dd, yyyy hh:mm a')
    : 'Not available';

  const formattedResolvedAt = resolved_at
    ? format(new Date(resolved_at as string), 'MMM dd, yyyy hh:mm a')
    : 'Not resolved';

  const formattedAppointmentDate = appointment_date
    ? format(new Date(appointment_date as string), 'MMM dd, yyyy hh:mm a')
    : 'Not scheduled';

  const handleLocationPress = () => {
    if (location) {
      const [longitude, latitude] = (location as string).split(',');
      const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
      Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    }
  };

  const getStatusColor = () => {
    switch(status) {
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#2196F3';
    }
  };

  const getStatusGradient = () => {
    switch(status) {
      case 'approved': return ['#4CAF50', '#45a049'];
      case 'rejected': return ['#F44336', '#e53935'];
      default: return ['#2196F3', '#1e88e5'];
    }
  };

  const handleBackPress = () => {
    if (fromSubmission) {
      router.replace('/home');
    } else {
      router.back();
    }
  };

  const renderHeader = () => (
    <Animated.View 
      entering={FadeInDown.duration(600)}
      style={styles.headerContainer}
    >
      <LinearGradient
        colors={getStatusGradient()}
        style={styles.headerGradient}
      />
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackPress}
      >
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </TouchableOpacity>

      <View style={styles.headerContent}>
        <View style={styles.titleContainer}>
          {type === 'Document Request' && <Ionicons name="document-text" size={32} color="#ffffff" />}
          {type === 'Create ID' && <Ionicons name="card" size={32} color="#ffffff" />}
          {type === 'Incident Report' && <Ionicons name="warning" size={32} color="#ffffff" />}
          <Text style={styles.title}>
            {type === 'Document Request' && 'Document Request'}
            {type === 'Create ID' && 'ID Creation Request'}
            {type === 'Incident Report' && 'Incident Report'}
          </Text>
        </View>

        {status && (
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statusText}>{String(status).toUpperCase()}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderRequestInfo = () => (
    <Animated.View 
      entering={FadeInDown.duration(600).delay(100)}
      style={styles.section}
    >
      <View style={styles.sectionHeader}>
        <Ionicons name="information-circle" size={24} color="#3b82f6" />
        <Text style={styles.sectionTitle}>Request Information</Text>
      </View>
      <View style={styles.sectionContent}>
        <DetailRow icon="person" label="Submitted by" value={clerk_id as string} iconType="ion" />
        <DetailRow icon="calendar" label="Date Submitted" value={formattedCreatedAt} iconType="ion" />
        {status && <DetailRow icon="time" label="Date Resolved" value={formattedResolvedAt} iconType="ion" />}
        {rejection_reason && (
          <DetailRow
            icon="close-circle"
            label="Rejection Reason"
            value={rejection_reason as string}
            isWarning
            iconType="ion"
          />
        )}
      </View>
    </Animated.View>
  );

  const renderDocumentDetails = () => (
    <Animated.View 
      entering={FadeInDown.duration(600).delay(200)}
      style={styles.section}
    >
      <View style={styles.sectionHeader}>
        <Ionicons name="document-text" size={24} color="#3b82f6" />
        <Text style={styles.sectionTitle}>Document Details</Text>
      </View>
      <View style={styles.sectionContent}>
        <DetailRow icon="document-text" label="Document Type" value={document_type as string} iconType="ion" />
        <DetailRow icon="help-circle" label="Reason" value={reason as string} iconType="ion" />
        {status === 'approved' && appointment_date && (
          <DetailRow
            icon="calendar"
            label="Scheduled Pickup"
            value={formattedAppointmentDate}
            iconType="ion"
          />
        )}
      </View>
    </Animated.View>
  );

  const renderPersonalInfo = () => (
    <Animated.View 
      entering={FadeInDown.duration(600).delay(200)}
      style={styles.section}
    >
      <View style={styles.sectionHeader}>
        <Ionicons name="person" size={24} color="#3b82f6" />
        <Text style={styles.sectionTitle}>Personal Information</Text>
      </View>
      <View style={styles.sectionContent}>
        <DetailRow icon="person" label="Full Name" value={full_name as string} iconType="ion" />
        <DetailRow icon="calendar" label="Birth Date" value={birth_date as string} iconType="ion" />
        <DetailRow icon="home" label="Address" value={address as string} iconType="ion" />
        <DetailRow icon="call" label="Contact" value={contact as string} iconType="ion" />
        {status === 'approved' && appointment_date && (
          <DetailRow
            icon="calendar"
            label="Scheduled Pickup"
            value={formattedAppointmentDate}
            iconType="ion"
          />
        )}
      </View>
    </Animated.View>
  );

  const renderIncidentDetails = () => (
    <>
      <Animated.View 
        entering={FadeInDown.duration(600).delay(200)}
        style={styles.section}
      >
        <View style={styles.sectionHeader}>
          <Ionicons name="warning" size={24} color="#3b82f6" />
          <Text style={styles.sectionTitle}>Incident Details</Text>
        </View>
        <View style={styles.sectionContent}>
          <DetailRow icon="alert-circle" label="Title" value={title as string} iconType="ion" />
          <DetailRow icon="document-text" label="Description" value={description as string} iconType="ion" />
          {location && (
            <TouchableOpacity 
              style={detailRowStyles.row}
              onPress={handleLocationPress}
            >
              <View style={detailRowStyles.iconContainer}>
                <Ionicons name="location" size={24} color="#3b82f6" />
              </View>
              <View style={detailRowStyles.content}>
                <Text style={detailRowStyles.label}>Location</Text>
                <Text style={[detailRowStyles.value, styles.link]}>
                  View on Map
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {media_url && (
        <Animated.View 
          entering={FadeInDown.duration(600).delay(300)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="image" size={24} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Attached Media</Text>
          </View>
          <View style={styles.mediaContainer}>
            <Image
              source={{ uri: `${process.env.EXPO_PUBLIC_API_URL}${media_url as string}` }}
              style={styles.media}
              resizeMode="contain"
            />
          </View>
        </Animated.View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderRequestInfo()}
        {type === "Document Request" && renderDocumentDetails()}
        {type === "Create ID" && renderPersonalInfo()}
        {type === "Incident Report" && renderIncidentDetails()}
      </ScrollView>
    </View>
  );
};

export default DetailsScreen;