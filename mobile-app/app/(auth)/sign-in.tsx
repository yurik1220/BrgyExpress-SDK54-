import { ScrollView, Text, View, Image, Alert } from "react-native";
import { icons, images } from "@/constants";
import InputField from "@/components/InputField";
import { useCallback, useState } from "react";
import CustomButton from "@/components/CustomButton";
import { Link, useRouter } from "expo-router";
import OAuth from "@/components/OAuth";
import { useSignIn } from "@clerk/clerk-expo";

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
      const phoneWithCountryCode = form.phoneNumber.startsWith("+63")
          ? form.phoneNumber
          : "+63" + form.phoneNumber;

      const signInAttempt = await signIn.create({
        identifier: phoneWithCountryCode,
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
        <View className="flex-1 bg-white">
          <View className="relative w-full h-[250px]">
            <Image source={images.signUpCar} className="z-0 w-full h-[250px]" />
            <Text className="text-2xl text-black font-Jakarta-SemiBold absolute bottom-5 left-5">
              Welcome 👋
            </Text>
          </View>

          <View className="p-5">
            <InputField
                label="Phone Number"
                placeholder="Enter your phone number"
                icon={icons.phone}
                keyboardType="phone-pad"
                value={form.phoneNumber}
                onChangeText={(value) => setForm({ ...form, phoneNumber: value })}
            />
            <InputField
                label="Password"
                placeholder="Enter your password"
                icon={icons.lock}
                secureTextEntry={true}
                value={form.password}
                onChangeText={(value) => setForm({ ...form, password: value })}
            />

            <CustomButton
                title="Sign In"
                onPress={onSignInPress}
                className="mt-6"
            />

            <OAuth />

            <Link
                href="/sign-up"
                className="text-lg text-center text-general-200 mt-10"
            >
              <Text>Don't have an account? </Text>
              <Text className="text-primary-500">Sign Up</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
  );
};

export default SignIn;
