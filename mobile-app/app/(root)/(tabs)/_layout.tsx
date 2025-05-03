import { Tabs } from "expo-router";
import { Image, ImageSourcePropType, View } from "react-native";
import { icons } from "@/constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Initialize QueryClient
const queryClient = new QueryClient();

const TabIcon = ({
                     source,
                     focused,
                 }: {
    source: ImageSourcePropType;
    focused: boolean;
}) => (
    <View className="items-center justify-center">
        <View
            className={`w-12 h-12 rounded-full flex items-center justify-center ${focused ? "bg-general-400" : ""}`}
        >
            <Image
                source={source}
                resizeMode="contain"
                className="w-7 h-7"
                tintColor="white"
            />
        </View>
    </View>
);

export default function TabLayout() {
    return (
        <QueryClientProvider client={queryClient}>
            <Tabs
                initialRouteName="home"
                screenOptions={{
                    tabBarActiveTintColor: "white",
                    tabBarInactiveTintColor: "white",
                    tabBarShowLabel: false,
                    tabBarStyle: {
                        backgroundColor: "#333333",
                        borderRadius: 50,
                        paddingBottom: 30,
                        overflow: "hidden",
                        marginHorizontal: 20,
                        marginBottom: 20,
                        height: 78,
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                        position: "absolute",
                        gap: 20,
                    },
                }}
            >
                <Tabs.Screen
                    name="home"
                    options={{
                        title: "Home",
                        headerShown: false,
                        tabBarIcon: ({ focused }) => (
                            <TabIcon source={icons.home} focused={focused} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="activity"
                    options={{
                        title: "Activity",
                        headerShown: false,
                        tabBarIcon: ({ focused }) => (
                            <TabIcon source={icons.list} focused={focused} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="announcement/index"
                    options={{
                        title: "Announcement",
                        headerShown: false,
                        tabBarIcon: ({ focused }) => (
                            <TabIcon source={icons.chat} focused={focused} />
                        ),
                    }}
                />
                {/* Explicitly hide the dynamic route from tab bar */}
                <Tabs.Screen
                    name="announcement/[id]"
                    options={{
                        headerShown: false,
                        href: null, // This prevents it from appearing in tab bar
                        tabBarStyle: { display: "none" }, // Hide tab bar for this screen
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: "Profile",
                        headerShown: false,
                        tabBarIcon: ({ focused }) => (
                            <TabIcon source={icons.profile} focused={focused} />
                        ),
                    }}
                />
            </Tabs>
        </QueryClientProvider>
    );
}