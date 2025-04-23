import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import axios from "axios";
import styles from "@/styles/styles";

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
      Alert.alert("Missing Fields", "Please fill out all fields.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("type", "Incident Report");
      formData.append("description", description);
      formData.append("user", "User Name");

      const file = {
        uri: media.uri,
        name: media.uri.split("/").pop() || "media",
        type: media.mimeType || "image/jpeg", // Use mimeType instead of media.type
      };

      formData.append("media", file as any); // Cast to any to bypass TS issues

      const response = await axios.post(
        "http://192.168.254.106:5000/api/requests", // 🔁 replace with your computer's IP
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      console.log("Report submitted:", response.data);

      router.push({
        pathname: "/details",
        params: { ...response.data },
      });

      setDescription("");
      setMedia(null);
      setIsSubmitting(false);

      Alert.alert("Success", "Incident report submitted successfully!");
    } catch (error) {
      console.error("Error submitting request:", error);
      Alert.alert("Error", "There was an error submitting your request.");
      setIsSubmitting(false);
    }
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
