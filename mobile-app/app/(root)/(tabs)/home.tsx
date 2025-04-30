import { useState } from "react";
import { View, Image, Dimensions, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants"; // Make sure this contains multiple images
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { PanGestureHandler } from "react-native-gesture-handler";
import CustomButton from "@/components/CustomButton"; // Make sure the path is correct
import styles from "@/styles/styles"; // Import the styles
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function Page() {
  const router = useRouter();
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

      {/* Button Container */}
      <View style={styles.buttonContainer}>
        {/* Top Row - Button 1 and 2 */}
        <View style={styles.topRow}>
          <ImageBackground
              source={images.id}
              style={styles.bigButton} // keep same style
              imageStyle={{ borderRadius: 12 }} // optional, for rounded corners
          >
            <CustomButton
                title="" // remove text
                onPress={() => router.push("/create-id")}
                bgVariant="transparent" // no background color
                textVariant="default"
                className="rounded-lg"
                style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
            />
          </ImageBackground>
          <ImageBackground
              source={images.request}
              style={styles.bigButton} // keep same style
              imageStyle={{ borderRadius: 12 }} // optional, for rounded corners
          >
            <CustomButton
                title="" // remove text
                onPress={() => router.push("/request-documents")}
                bgVariant="transparent" // no background color
                textVariant="default"
                className="rounded-lg"
                style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
            />
          </ImageBackground>
        </View>
        <ImageBackground
            source={images.incident}
            style={styles.rectButton} // keep same size/position
            imageStyle={{ borderRadius: 12 }} // optional: match your button styling
        >
          <CustomButton
              title="" // remove text since it's in the image
              onPress={() => router.push("/incident-report")}
              bgVariant="transparent"
              textVariant="default"
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
          />
        </ImageBackground>
      </View>
    </SafeAreaView>
  );
}
