import { Tabs, useRouter } from "expo-router";
import { Image, ImageSourcePropType, View, TouchableOpacity } from "react-native";
import { icons } from "@/constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "expo-router";
import Animated, { 
    useAnimatedStyle, 
    withTiming, 
    interpolate,
    useSharedValue
} from "react-native-reanimated";

// Initialize QueryClient
const queryClient = new QueryClient();

// Create context for tab bar visibility
export const TabBarVisibilityContext = createContext({
    isTabBarVisible: true,
    setIsTabBarVisible: (visible: boolean) => {},
});

export const useTabBarVisibility = () => useContext(TabBarVisibilityContext);

const TabIcon = ({
    source,
    focused,
    onPress,
}: {
    source: ImageSourcePropType;
    focused: boolean;
    onPress: () => void;
}) => (
    <TouchableOpacity 
        onPress={onPress}
        style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
        }}
    >
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
    </TouchableOpacity>
);

export default function TabLayout() {
    const [isTabBarVisible, setIsTabBarVisible] = useState(true);
    const pathname = usePathname();
    const router = useRouter();
    const opacity = useSharedValue(1);
    const translateY = useSharedValue(0);

    // Ensure tab bar is always visible on home screen
    useEffect(() => {
        if (pathname === '/home') {
            setIsTabBarVisible(true);
        }
    }, [pathname]);

    // Animate tab bar visibility
    useEffect(() => {
        opacity.value = withTiming(isTabBarVisible ? 1 : 0, { duration: 200 });
        translateY.value = withTiming(isTabBarVisible ? 0 : 100, { duration: 200 });
    }, [isTabBarVisible]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }],
        };
    });

    const handleTabPress = (route: string) => {
        router.push(route);
    };

    return (
        <QueryClientProvider client={queryClient}>
            <TabBarVisibilityContext.Provider value={{ isTabBarVisible, setIsTabBarVisible }}>
                <Tabs
                    initialRouteName="home"
                    screenOptions={{
                        tabBarActiveTintColor: "white",
                        tabBarInactiveTintColor: "white",
                        tabBarShowLabel: false,
                        tabBarStyle: {
                            display: 'none', // Hide the original tab bar
                        },
                    }}
                >
                    <Tabs.Screen
                        name="home"
                        options={{
                            title: "Home",
                            headerShown: false,
                        }}
                    />
                    <Tabs.Screen
                        name="activity"
                        options={{
                            title: "Activity",
                            headerShown: false,
                        }}
                    />
                    <Tabs.Screen
                        name="announcement/index"
                        options={{
                            title: "Announcement",
                            headerShown: false,
                        }}
                    />
                    <Tabs.Screen
                        name="announcement/[id]"
                        options={{
                            headerShown: false,
                            href: null,
                        }}
                    />
                    <Tabs.Screen
                        name="profile"
                        options={{
                            title: "Profile",
                            headerShown: false,
                        }}
                    />
                </Tabs>
                <Animated.View 
                    style={[{
                        position: 'absolute',
                        bottom: 20,
                        left: 20,
                        right: 20,
                        height: 78,
                        backgroundColor: "#333333",
                        borderRadius: 50,
                        overflow: "hidden",
                    }, animatedStyle]}
                >
                    <View style={{
                        flex: 1,
                        flexDirection: "row",
                        justifyContent: "space-around",
                        alignItems: "center",
                        paddingHorizontal: 20,
                    }}>
                        <TabIcon 
                            source={icons.home} 
                            focused={pathname === '/home'} 
                            onPress={() => handleTabPress('/home')}
                        />
                        <TabIcon 
                            source={icons.list} 
                            focused={pathname === '/activity'} 
                            onPress={() => handleTabPress('/activity')}
                        />
                        <TabIcon 
                            source={icons.chat} 
                            focused={pathname === '/announcement'} 
                            onPress={() => handleTabPress('/announcement')}
                        />
                        <TabIcon 
                            source={icons.profile} 
                            focused={pathname === '/profile'} 
                            onPress={() => handleTabPress('/profile')}
                        />
                    </View>
                </Animated.View>
            </TabBarVisibilityContext.Provider>
        </QueryClientProvider>
    );
}