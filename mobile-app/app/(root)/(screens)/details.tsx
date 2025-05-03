import React from "react";
import { View, Text, Image, ScrollView, Linking, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AntDesign } from "@expo/vector-icons";
import { format } from "date-fns";
import { styles, detailRowStyles } from "@/styles/details_style";

interface DetailRowProps {
  icon: string;
  label: string;
  value?: string | null;
  isWarning?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value, isWarning = false }) => {
  if (!value) return null;

  return (
      <View style={detailRowStyles.row}>
        <AntDesign
            name={icon as any}
            size={20}
            color={isWarning ? '#F44336' : '#666'}
            style={detailRowStyles.icon}
        />
        <View style={detailRowStyles.content}>
          <Text style={detailRowStyles.label}>{label}</Text>
          <Text style={[detailRowStyles.value, isWarning && detailRowStyles.warning]}>
            {value}
          </Text>
        </View>
      </View>
  );
};

const DetailsScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();

  // Check if we're coming from a successful submission (has 'fromSubmission' param)
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

  const handleBackPress = () => {
    if (fromSubmission) {
      // If coming from submission, go back to home
      router.replace('/home');
    } else {
      // Otherwise, go back one page
      router.back();
    }
  };

  return (
      <ScrollView contentContainerStyle={styles.container}>
        {/* Back Button */}
        <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
        >
          <AntDesign name="arrowleft" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>
            {type === 'Document Request' && '📄 Document Request'}
            {type === 'Create ID' && '🆔 ID Creation Request'}
            {type === 'Incident Report' && '🚨 Incident Report'}
          </Text>

          {status && (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                <Text style={styles.statusText}>{String(status).toUpperCase()}</Text>
              </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Request Information</Text>
          <DetailRow icon="user" label="Submitted by" value={clerk_id as string} />
          <DetailRow icon="calendar" label="Date Submitted" value={formattedCreatedAt} />
          {status && <DetailRow icon="clock" label="Date Resolved" value={formattedResolvedAt} />}
          {rejection_reason && (
              <DetailRow
                  icon="closecircle"
                  label="Rejection Reason"
                  value={rejection_reason as string}
                  isWarning
              />
          )}
        </View>

        {type === "Document Request" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Document Details</Text>
              <DetailRow icon="filetext1" label="Document Type" value={document_type as string} />
              <DetailRow icon="questioncircle" label="Reason" value={reason as string} />
              {status === 'approved' && appointment_date && (
                  <DetailRow
                      icon="calendar"
                      label="Scheduled Pickup"
                      value={formattedAppointmentDate}
                  />
              )}
            </View>
        )}

        {type === "Create ID" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <DetailRow icon="user" label="Full Name" value={full_name as string} />
              <DetailRow icon="calendar" label="Birth Date" value={birth_date as string} />
              <DetailRow icon="home" label="Address" value={address as string} />
              <DetailRow icon="phone" label="Contact" value={contact as string} />
              {status === 'approved' && appointment_date && (
                  <DetailRow
                      icon="calendar"
                      label="Scheduled Pickup"
                      value={formattedAppointmentDate}
                  />
              )}
            </View>
        )}

        {type === "Incident Report" && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Incident Details</Text>
                <DetailRow icon="warning" label="Title" value={title as string} />
                <DetailRow icon="alignleft" label="Description" value={description as string} />

                {location && (
                    <View style={detailRowStyles.row}>
                      <AntDesign
                          name="enviroment"
                          size={20}
                          color="#666"
                          style={detailRowStyles.icon}
                      />
                      <View style={detailRowStyles.content}>
                        <Text style={detailRowStyles.label}>Location</Text>
                        <Text
                            style={[detailRowStyles.value, styles.link]}
                            onPress={handleLocationPress}
                        >
                          View on Map
                        </Text>
                      </View>
                    </View>
                )}
              </View>

              {media_url && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Attached Media</Text>
                    <Image
                        source={{ uri: `http://192.168.254.106:5000${media_url as string}` }}
                        style={styles.media}
                        resizeMode="contain"
                    />
                  </View>
              )}
            </>
        )}
      </ScrollView>
  );
};

export default DetailsScreen;