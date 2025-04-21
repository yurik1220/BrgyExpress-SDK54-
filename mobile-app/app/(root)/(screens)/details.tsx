import React from "react";
import { View, Text, Image, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import styles from "@/styles/styles";

export default function DetailsScreen() {
  const params = useLocalSearchParams();

  const { type, document, reason, description, media } = params;

  // Debugging: Log media value to ensure it's being passed correctly
  console.log("Media URI: ", media);

  // Ensure media is a string (not an array) before passing to the Image component
  const mediaUri = Array.isArray(media) ? media[0] : media;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Request Details</Text>

      <View style={styles.detailsContainer}>
        <Text style={styles.detailLabel}>Request Type: </Text>
        <Text style={styles.detailValue}>{type}</Text>
      </View>

      {/* Document Request */}
      {type === "Document Request" && (
        <>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Document Requested: </Text>
            <Text style={styles.detailValue}>{document}</Text>
          </View>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Reason: </Text>
            <Text style={styles.detailValue}>{reason}</Text>
          </View>
        </>
      )}

      {/* Incident Report */}
      {type === "Incident Report" && (
        <>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Description: </Text>
            <Text style={styles.detailValue}>{description}</Text>
          </View>

          {mediaUri && (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailLabel}>Uploaded Media:</Text>
              <Image
                source={{ uri: mediaUri }}
                style={styles.mediaPreview}
                resizeMode="cover"
              />
            </View>
          )}
        </>
      )}

      {/* Barangay ID Request */}
      {type === "Barangay ID Request" && (
        <>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Full Name: </Text>
            <Text style={styles.detailValue}>{document}</Text>
          </View>
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Birth Date: </Text>
            <Text style={styles.detailValue}>{reason}</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}
