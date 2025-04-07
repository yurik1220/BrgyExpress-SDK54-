import { useState } from "react";
import { View, Image, Dimensions, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants"; // Make sure this contains multiple images
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { PanGestureHandler } from "react-native-gesture-handler";
import CustomButton from "@/components/CustomButton"; // Make sure the path is correct

const { width } = Dimensions.get("window");

export default function Page() {
  const slideshowImages = [
    images.slideshow1,
    images.slideshow2,
    images.slideshow3,
  ];

  const translateX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const onGestureEvent = (event) => {
    const { translationX } = event.nativeEvent;

    // Move the slideshow while swiping
    translateX.value = translationX;
  };

  const onGestureEnd = (event) => {
    const { translationX, velocityX } = event.nativeEvent;

    if (translationX < -50 || velocityX < -500) {
      // Swipe left: Move to next image
      setCurrentIndex((prev) => (prev + 1) % slideshowImages.length);
    } else if (translationX > 50 || velocityX > 500) {
      // Swipe right: Move to previous image
      setCurrentIndex(
        (prev) => (prev - 1 + slideshowImages.length) % slideshowImages.length,
      );
    }

    // Reset position with animation
    translateX.value = withSpring(0);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo in the Upper Left */}
      <Image source={images.logo} style={styles.logo} />

      {/* Slideshow Container */}
      <View style={styles.slideshowContainer}>
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onEnded={onGestureEnd}
        >
          <Animated.View style={[styles.imageWrapper, animatedStyle]}>
            <Image
              source={slideshowImages[currentIndex]}
              style={styles.image}
            />
          </Animated.View>
        </PanGestureHandler>
      </View>

      {/* 3 Square Buttons in the Middle */}
      <View style={styles.buttonContainer}>
        <View style={styles.squareButtonWrapper}>
          <CustomButton
            title="Button 1"
            onPress={() => alert("Button 1 Pressed")}
            bgVariant="primary"
            textVariant="default"
            className="rounded-lg" // Optional: Use `rounded-lg` to give some rounded corners
          />
        </View>
        <View style={styles.squareButtonWrapper}>
          <CustomButton
            title="Button 2"
            onPress={() => alert("Button 2 Pressed")}
            bgVariant="secondary"
            textVariant="default"
            className="rounded-lg"
          />
        </View>
        <View style={styles.squareButtonWrapper}>
          <CustomButton
            title="Button 3"
            onPress={() => alert("Button 3 Pressed")}
            bgVariant="success"
            textVariant="default"
            className="rounded-lg"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: "contain",
    position: "absolute",
    top: -40,
    left: -20,
  },
  slideshowContainer: {
    width: 300,
    height: 125,
    backgroundColor: "#ddd",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 60,
    overflow: "hidden",
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "stretch",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center", // Center buttons horizontally
    alignItems: "center", // Center buttons vertically
    marginTop: 30, // Adjust the top margin as needed
    width: "100%", // Ensure the buttons are within the container width
    height: 100, // Increased height for the container
  },
  squareButtonWrapper: {
    width: 80, // Increased width for square button
    height: 80, // Increased height for square button
    margin: 10, // Space between buttons
    justifyContent: "center", // Center button contents horizontally
    alignItems: "center", // Center button contents vertically
  },
});
