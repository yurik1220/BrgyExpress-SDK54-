import React from "react";
import { View, Text, Image, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import styles from "@/styles/styles";

export default function DetailsScreen() {
  const params = useLocalSearchParams();

  const {
    type,
    document,
    reason,
    description,
    media,
    name,
    birthdate,
    userAddress,
    contact,
    user,
  } = params;

  // Ensure media is a string (not an array) before passing to the Image component
  const mediaUri = Array.isArray(media) ? media[0] : media;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Request Details</Text>

      <View style={styles.detailsContainer}>
        <Text style={styles.detailLabel}>Request Type:</Text>
        <Text style={styles.detailValue}>{type}</Text>
      </View>

      {/* Document Request */}
      {type === "Document Request" && (
        <>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Document Requested:</Text>
            <Text style={styles.detailValue}>{document}</Text>
          </View>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Reason:</Text>
            <Text style={styles.detailValue}>{reason}</Text>
          </View>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Submitted by:</Text>
            <Text style={styles.detailValue}>{user}</Text>
          </View>
        </>
      )}

      {/* Create ID */}
      {type === "Create ID" && (
        <>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Full Name:</Text>
            <Text style={styles.detailValue}>{name}</Text>
          </View>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Birth Date:</Text>
            <Text style={styles.detailValue}>{birthdate}</Text>
          </View>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Address:</Text>
            <Text style={styles.detailValue}>{userAddress}</Text>
          </View>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Contact:</Text>
            <Text style={styles.detailValue}>{contact}</Text>
          </View>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Submitted by:</Text>
            <Text style={styles.detailValue}>{user}</Text>
          </View>
        </>
      )}

      {/* Incident Report */}
      {type === "Incident Report" && (
        <>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Description:</Text>
            <Text style={styles.detailValue}>{description}</Text>
          </View>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Submitted by:</Text>
            <Text style={styles.detailValue}>{user}</Text>
          </View>
          {mediaUri && (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailLabel}>Uploaded Media:</Text>
              <Image
                source={{ uri: decodeURIComponent(mediaUri) }}
                style={styles.mediaPreview}
                resizeMode="cover"
              />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
