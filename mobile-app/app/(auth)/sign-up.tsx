import { ScrollView, Text, View, Image, Alert } from "react-native";
import { icons, images } from "@/constants";
import InputField from "@/components/InputField";
import React, { useState } from "react";
import CustomButton from "@/components/CustomButton";
import OAuth from "@/components/OAuth";
import { useSignUp } from "@clerk/clerk-expo";
import { Link, router } from "expo-router";
import { ReactNativeModal } from "react-native-modal";
import { fetchAPI } from "@/lib/fetch";

const SignUp = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [form, setForm] = useState({
    name: "", // Added name field
    phoneNumber: "",
    password: "",
  });

  const [verification, setVerification] = useState({
    state: "default",
    error: "",
    code: "",
  });

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    try {
      // 1. Create account with name, phone number & password
      await signUp.create({
        phoneNumber: form.phoneNumber,
        password: form.password,
      });

      // 2. Send SMS verification code
      await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });

      // 3. Open the phone verification modal
      setVerification({ state: "pending", error: "", code: "" });
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.longMessage || "Sign up failed.");
    }
  };

  const onPressVerifyPhoneNumber = async () => {
    if (!isLoaded) return;

    try {
      const result = await signUp.attemptPhoneNumberVerification({
        code: verification.code,
      });

      if (result.status === "complete" && result.createdSessionId) {
        // 4. Send user data to your API
        await fetchAPI("/(api)/user", {
          method: "POST",
          body: JSON.stringify({
            name: form.name, // Sending the name along with the phone number
            phoneNumber: form.phoneNumber,
            clerkId: result.createdUserId,
            createdAt: new Date().toISOString(),
          }),
        });

        // Log the user in
        await setActive({ session: result.createdSessionId });

        // 5. Show the success modal
        setShowSuccessModal(true);
      } else {
        setVerification({
          ...verification,
          error: `Unexpected verification status: ${result.status}`,
          state: "failed",
        });
      }
    } catch (err: any) {
      setVerification({
        ...verification,
        error: err.errors?.[0]?.longMessage || "Verification failed.",
        state: "failed",
      });
    }
  };

  return (
      <ScrollView className="flex-1 bg-white">
        <View className="flex-1 bg-white">
          <View className="relative w-full h-[250px]">
            <Image source={images.signUpCar} className="z-0 w-full h-[250px]" />
            <Text className="text-2xl text-black font-Jakarta-SemiBold absolute bottom-5 left-5">
              Create Your Account
            </Text>
          </View>

          <View className="p-5">
            <InputField
                label="Name"
                placeholder="Enter your name"
                icon={icons.person}
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
            />
            <InputField
                label="Phone Number"
                placeholder="Enter your phone number"
                icon={icons.call}
                value={form.phoneNumber}
                keyboardType="phone-pad"
                onChangeText={(v) => setForm({ ...form, phoneNumber: v })}
            />
            <InputField
                label="Password"
                placeholder="Enter your password"
                icon={icons.lock}
                secureTextEntry
                value={form.password}
                onChangeText={(v) => setForm({ ...form, password: v })}
            />

            <CustomButton title="Sign Up" onPress={onSignUpPress} className="mt-6" />

            <OAuth />

            <Link href="/sign-in" className="text-lg text-center text-general-200 mt-10">
              <Text>Already have an account? </Text>
              <Text className="text-primary-500">Log In</Text>
            </Link>
          </View>

          {/* Phone Verification Modal */}
          <ReactNativeModal isVisible={verification.state === "pending"}>
            <View className="bg-white px-7 py-9 rounded-2xl min-h-[300px]">
              <Text className="text-2xl font-JakartaExtraBold mb-2">Phone Verification</Text>
              <Text className="font-Jakarta mb-5">We've sent a verification code to {form.phoneNumber}</Text>
              <InputField
                  label="Code"
                  icon={icons.lock}
                  placeholder="12345"
                  value={verification.code}
                  keyboardType="numeric"
                  onChangeText={(code) => setVerification({ ...verification, code })}
              />
              {verification.error && (
                  <Text className="text-red-500 text-sm mt-1">{verification.error}</Text>
              )}

              <CustomButton title="Verify Phone" onPress={onPressVerifyPhoneNumber} className="mt-5 bg-success-500" />
            </View>
          </ReactNativeModal>

          {/* Success Modal */}
          <ReactNativeModal isVisible={showSuccessModal}>
            <View className="bg-white px-7 py-9 rounded-2xl min-h-[300px]">
              <Image source={images.check} className="w-[110px] h-[110px] mx-auto my-5" />
              <Text className="text-3xl font-JakartaBold text-center">Verified</Text>
              <Text className="text-base text-gray-400 font-Jakarta text-center mt-2">
                You have successfully signed up
              </Text>
              <CustomButton
                  title="Browse Home"
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.push("/(root)/(tabs)/home");
                  }}
                  className="mt-5"
              />
            </View>
          </ReactNativeModal>
        </View>
      </ScrollView>
  );
};

export default SignUp;
