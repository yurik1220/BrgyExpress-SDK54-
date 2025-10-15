import { ScrollView, Text, View, Image, Alert, Dimensions, TouchableOpacity } from "react-native";
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
  const [showReset, setShowReset] = useState(false);
  const [resetPhone, setResetPhone] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetNeedsSecondFactor, setResetNeedsSecondFactor] = useState(false);
  const [resetError, setResetError] = useState("");

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

  const onSendResetCode = useCallback(async () => {
    if (!isLoaded) return;
    try {
      const formatted = resetPhone.startsWith("0")
        ? "+63" + resetPhone.substring(1)
        : resetPhone.startsWith("+63")
          ? resetPhone
          : "+63" + resetPhone;

      await signIn?.create({
        strategy: "reset_password_phone_code",
        identifier: formatted,
      });
      setResetSent(true);
      setResetError("");
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      setResetError(err.errors?.[0]?.longMessage || "Failed to send reset code");
    }
  }, [isLoaded, resetPhone, signIn]);

  const onResetPassword = useCallback(async () => {
    if (!isLoaded) return;
    try {
      const result = await signIn?.attemptFirstFactor({
        strategy: "reset_password_phone_code",
        code: resetCode,
        password: resetPassword,
      });

      if (!result) return;
      if (result.status === "needs_second_factor") {
        setResetNeedsSecondFactor(true);
        setResetError("");
      } else if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setResetError("");
        router.replace("/(root)/(tabs)/home");
      } else {
        console.log(result);
      }
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      setResetError(err.errors?.[0]?.longMessage || "Failed to reset password");
    }
  }, [isLoaded, resetCode, resetPassword, signIn]);

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
          {!showReset && (
            <>
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
                className="mb-3"
              />

              <View className="flex-row justify-between items-center mb-6">
                <TouchableOpacity onPress={() => setShowReset(true)}>
                  <Text className="text-primary-500 font-Jakarta-SemiBold">Forgot password?</Text>
                </TouchableOpacity>
              </View>

              <CustomButton
                title="Sign In"
                onPress={onSignInPress}
                className="h-[56px] rounded-xl"
              />

              <Text className="text-center text-gray-600 mt-8">
                Don't have an account?{" "}
                <Link href="/sign-up">
                  <Text className="text-primary-500 font-Jakarta-SemiBold">Sign Up</Text>
                </Link>
              </Text>
            </>
          )}

          {showReset && (
            <>
              <Text className="text-2xl font-Jakarta-Bold text-gray-800 mb-6">
                Reset Password
              </Text>

              {!resetSent && (
                <>
                  <InputField
                    label="Phone Number"
                    placeholder="e.g. +63XXXXXXXXXX"
                    icon={icons.email}
                    keyboardType="phone-pad"
                    value={resetPhone}
                    onChangeText={setResetPhone as any}
                    className="mb-4"
                  />
                  {resetError ? (
                    <Text className="text-red-500 mb-3">{resetError}</Text>
                  ) : null}
                  <CustomButton
                    title="Send reset code"
                    onPress={onSendResetCode}
                    className="h-[52px] rounded-xl"
                  />
                  <TouchableOpacity className="mt-4" onPress={() => setShowReset(false)}>
                    <Text className="text-center text-gray-600">Back to Sign In</Text>
                  </TouchableOpacity>
                </>
              )}

              {resetSent && (
                <>
                  <InputField
                    label="New Password"
                    placeholder="Enter new password"
                    icon={icons.lock}
                    secureTextEntry={true}
                    value={resetPassword}
                    onChangeText={setResetPassword as any}
                    className="mb-4"
                  />
                  <InputField
                    label="Reset Code"
                    placeholder="Enter the code sent to your phone"
                    icon={icons.lock}
                    value={resetCode}
                    onChangeText={setResetCode as any}
                    className="mb-3"
                  />
                  {resetError ? (
                    <Text className="text-red-500 mb-3">{resetError}</Text>
                  ) : null}
                  {resetNeedsSecondFactor ? (
                    <Text className="text-amber-600 mb-3">2FA required (not handled here)</Text>
                  ) : null}
                  <CustomButton
                    title="Reset password"
                    onPress={onResetPassword}
                    className="h-[52px] rounded-xl"
                  />
                  <TouchableOpacity className="mt-4" onPress={() => setShowReset(false)}>
                    <Text className="text-center text-gray-600">Back to Sign In</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </Animated.View>
      </View>
    </ScrollView>
  );
};

export default SignIn;
