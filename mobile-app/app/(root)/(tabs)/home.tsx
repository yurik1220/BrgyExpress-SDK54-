import { useState, useEffect } from "react";
import { View, Image, Dimensions, ImageBackground, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { PanGestureHandler } from "react-native-gesture-handler";
import CustomButton from "@/components/CustomButton";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";

const { width } = Dimensions.get("window");

export default function Page() {
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();
  const slideshowImages = [
    images.slideshow1,
    images.slideshow2,
    images.slideshow3,
  ];

  const translateX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-advance slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slideshowImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const onGestureEvent = (event) => {
    const { translationX } = event.nativeEvent;
    translateX.value = translationX;
  };

  const onGestureEnd = (event) => {
    const { translationX, velocityX } = event.nativeEvent;

    if (translationX < -50 || velocityX < -500) {
      setCurrentIndex((prev) => (prev + 1) % slideshowImages.length);
    } else if (translationX > 50 || velocityX > 500) {
      setCurrentIndex(
        (prev) => (prev - 1 + slideshowImages.length) % slideshowImages.length,
      );
    }

    translateX.value = withSpring(0);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient
        colors={['#f0f9ff', '#e0f2fe', '#bae6fd']}
        style={{ flex: 1 }}
      >
        {/* Header Section */}
        <View style={{ padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Image source={images.logo} style={{ width: 120, height: 40, resizeMode: 'contain' }} />
          <TouchableOpacity 
            onPress={() => router.push("/profile")}
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.8)', 
              padding: 8, 
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Ionicons name="person-circle-outline" size={24} color="#0f172a" />
            <Text style={{ color: '#0f172a', fontWeight: '500' }}>Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Welcome Message */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#0f172a' }}>
            Welcome{isSignedIn ? '!' : ''}
          </Text>
          <Text style={{ fontSize: 16, color: '#475569', marginTop: 4 }}>
            How can we help you today?
          </Text>
        </View>

        {/* Slideshow Container */}
        <View style={{ height: 200, marginBottom: 20 }}>
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onEnded={onGestureEnd}
          >
            <Animated.View style={[{ flex: 1 }, animatedStyle]}>
              <Image
                source={slideshowImages[currentIndex]}
                style={{ width: width - 40, height: 200, borderRadius: 16, marginHorizontal: 20 }}
              />
            </Animated.View>
          </PanGestureHandler>
          
          {/* Pagination Dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
            {slideshowImages.map((_, index) => (
              <View
                key={index}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: currentIndex === index ? '#0284c7' : '#cbd5e1',
                  marginHorizontal: 4,
                }}
              />
            ))}
          </View>
        </View>

        {/* Services Grid */}
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 }}>
            Available Services
          </Text>
          
          {/* Top Row */}
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
            <TouchableOpacity 
              onPress={() => router.push("/create-id")}
              style={{ flex: 1, height: 160, borderRadius: 16, overflow: 'hidden' }}
            >
              <ImageBackground
                source={images.id}
                style={{ width: '100%', height: '100%' }}
                imageStyle={{ borderRadius: 16 }}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={{ flex: 1, justifyContent: 'flex-end', padding: 16 }}
                >
                  <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                    Create ID
                  </Text>
                </LinearGradient>
              </ImageBackground>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => router.push("/request-documents")}
              style={{ flex: 1, height: 160, borderRadius: 16, overflow: 'hidden' }}
            >
              <ImageBackground
                source={images.request}
                style={{ width: '100%', height: '100%' }}
                imageStyle={{ borderRadius: 16 }}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={{ flex: 1, justifyContent: 'flex-end', padding: 16 }}
                >
                  <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                    Request Documents
                  </Text>
                </LinearGradient>
              </ImageBackground>
            </TouchableOpacity>
          </View>

          {/* Bottom Row */}
          <TouchableOpacity 
            onPress={() => router.push("/incident-report")}
            style={{ height: 100, borderRadius: 16, overflow: 'hidden' }}
          >
            <ImageBackground
              source={images.incident}
              style={{ width: '100%', height: '100%' }}
              imageStyle={{ borderRadius: 16 }}
            >
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={{ flex: 1, justifyContent: 'flex-end', padding: 16 }}
              >
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                  Report Incident
                </Text>
              </LinearGradient>
            </ImageBackground>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}
