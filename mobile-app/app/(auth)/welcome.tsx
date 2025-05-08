import { Text, TouchableOpacity, View, Image, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Swiper from "react-native-swiper";
import { useRef, useState } from "react";
import { onboarding } from "@/constants";
import CustomButton from "@/components/CustomButton";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const Onboarding = () => {
  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isLastSlide = activeIndex === onboarding.length - 1;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        className="absolute w-full h-full"
      />
      
      {/* Skip Button */}
      <Animated.View 
        entering={FadeIn.delay(200)}
        className="w-full flex-row justify-between items-center px-5 py-3"
      >
        <View style={{ width: 40 }} />
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/sign-up")}
          className="bg-white/10 px-4 py-2 rounded-full border border-gray-200"
        >
          <Text className="text-gray-600 text-sm font-Jakarta-SemiBold">Skip</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Swiper Slides */}
      <Swiper
        ref={swiperRef}
        loop={false}
        dot={<View />}
        activeDot={<View />}
        onIndexChanged={(index) => setActiveIndex(index)}
        style={{ flexGrow: 0 }}
        paginationStyle={{ display: 'none' }}
      >
        {onboarding.map((item, index) => (
          <Animated.View 
            key={item.id} 
            entering={FadeInDown.delay(300).springify()}
            className="flex-1 items-center justify-center px-5"
          >
            <View className="w-full h-[400px] items-center justify-center">
              <Image
                source={item.image}
                className="w-full h-[300px]"
                resizeMode="contain"
              />
            </View>
            
            <View className="w-full px-5">
              <Animated.Text 
                entering={FadeInDown.delay(400).springify()}
                className="text-3xl font-Jakarta-Bold text-center text-gray-800 mb-4"
              >
                {item.title}
              </Animated.Text>
              
              <Animated.Text 
                entering={FadeInDown.delay(500).springify()}
                className="text-base font-Jakarta text-center text-gray-500 leading-6"
              >
                {item.description}
              </Animated.Text>
            </View>
          </Animated.View>
        ))}
      </Swiper>

      {/* Bottom Section */}
      <Animated.View 
        entering={FadeInDown.delay(600).springify()}
        className="w-full items-center px-5 pb-10"
      >
        <View className="flex-row items-center justify-center mb-6">
          {onboarding.map((_, index) => (
            <View
              key={index}
              className={`w-2 h-2 mx-1 rounded-full ${
                index === activeIndex ? "bg-primary-500 w-6" : "bg-gray-200"
              }`}
            />
          ))}
        </View>

        <CustomButton
          title={isLastSlide ? "Get Started" : "Next"}
          onPress={() =>
            isLastSlide
              ? router.replace("/(auth)/sign-up")
              : swiperRef.current?.scrollBy(1)
          }
          className="w-full h-[56px] rounded-xl"
        />
      </Animated.View>
    </SafeAreaView>
  );
};

export default Onboarding;
