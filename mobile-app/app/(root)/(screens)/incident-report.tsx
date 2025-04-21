import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import styles from "@/styles/styles";

// Define the type for media
type Media = ImagePicker.ImagePickerAsset | null;

export default function IncidentReport() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState<Media>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setMedia(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!description || !media) {
      alert("Please fill out all fields.");
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    // ✅ ENCODE the URI before sending it via params
    const mediaUri = encodeURIComponent(media.uri);

    const reportData = {
      type: "Incident Report",
      description,
      media: mediaUri,
    };

    router.push({
      pathname: "/details",
      params: reportData,
    });

    setDescription("");
    setMedia(null);
    setIsSubmitting(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Upload Photo or Video</Text>
      <TouchableOpacity style={styles.uploadButton} onPress={pickMedia}>
        <Text style={styles.uploadButtonText}>Choose File</Text>
      </TouchableOpacity>

      {media && (
        <Image
          source={{ uri: media.uri }}
          style={styles.preview}
          resizeMode="cover"
        />
      )}

      <Text style={styles.sectionTitle}>Description</Text>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={4}
        placeholder="Describe the incident..."
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity
        style={styles.submitReport}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Report</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
