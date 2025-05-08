import { ScrollView, Text, View, Image, Alert, Dimensions } from "react-native";
import { icons, images } from "@/constants";
import InputField from "@/components/InputField";
import { useCallback, useState } from "react";
import CustomButton from "@/components/CustomButton";
import { Link, useRouter } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";

const { width } = Dimensions.get("window");

const SignIn = () => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [form, setForm] = useState({
    phoneNumber: "",
    password: "",
  });

  const onSignInPress = useCallback(async () => {
    if (!isLoaded) return;

    // Validate if fields are filled
    if (!form.phoneNumber || !form.password) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }

    try {
      // Format phone number
      const formattedPhoneNumber = form.phoneNumber.startsWith("0")
        ? "+63" + form.phoneNumber.substring(1)
        : form.phoneNumber.startsWith("+63")
          ? form.phoneNumber
          : "+63" + form.phoneNumber;

      const signInAttempt = await signIn.create({
        identifier: formattedPhoneNumber,
        password: form.password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(root)/(tabs)/home"); // Navigate to home
      } else {
        console.log(JSON.stringify(signInAttempt, null, 2));
        Alert.alert("Error", "Log in failed. Please try again.");
      }
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      Alert.alert("Error", err.errors?.[0]?.longMessage || "Something went wrong");
    }
  }, [isLoaded, form]);

  return (
    <ScrollView className="flex-1 bg-white">
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        className="absolute w-full h-full"
      />
      
      <View className="flex-1">
        <Animated.View 
          entering={FadeIn.delay(200)}
          className="relative w-full h-[300px]"
        >
          <Image 
            source={images.signUpCar} 
            className="w-full h-full"
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            className="absolute bottom-0 w-full h-32"
          />
          <Text className="text-3xl text-white font-Jakarta-Bold absolute bottom-8 left-6">
            Welcome Back 👋
          </Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(400).springify()}
          className="p-6 bg-white rounded-t-[32px] -mt-8"
        >
          <Text className="text-2xl font-Jakarta-Bold text-gray-800 mb-6">
            Sign In
          </Text>

          <InputField
            label="Phone Number"
            placeholder="Enter your phone number"
            icon={icons.email}
            keyboardType="phone-pad"
            value={form.phoneNumber}
            onChangeText={(value) => setForm({ ...form, phoneNumber: value })}
            className="mb-4"
          />
          
          <InputField
            label="Password"
            placeholder="Enter your password"
            icon={icons.lock}
            secureTextEntry={true}
            value={form.password}
            onChangeText={(value) => setForm({ ...form, password: value })}
            className="mb-6"
          />

          <CustomButton
            title="Sign In"
            onPress={onSignInPress}
            className="h-[56px] rounded-xl"
          />

          <Link
            href="/sign-up"
            className="mt-8"
          >
            <Text className="text-center text-gray-600">
              Don't have an account?{" "}
              <Text className="text-primary-500 font-Jakarta-SemiBold">
                Sign Up
              </Text>
            </Text>
          </Link>
        </Animated.View>
      </View>
    </ScrollView>
  );
};

export default SignIn;
