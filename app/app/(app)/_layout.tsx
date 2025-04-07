import { DefaultTheme, NavigationContainer, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Drawer } from "expo-router/drawer";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useSession } from "../../context/authContext";
import CustomDrawer from "@/components/CustomDrawer";
import SpaceMono from "@/assets/fonts/SpaceMono-Regular.ttf";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(console.error);

export default function AppLayout() {
  const { session } = useSession();
  const [loaded] = useFonts({ SpaceMono: SpaceMono, });

  useEffect(() => {
    (async () => {
      if (loaded) await SplashScreen.hideAsync();
    })();
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Drawer
          drawerContent={CustomDrawer}
          screenOptions={{
            drawerStyle: {
              width: 275, // 👈 Set the drawer width (adjust this value as needed)
            },
          }}
        >
          <Drawer.Screen
            name="index"
            options={{
              title: "Agenda",
              drawerIcon: ({ color }) => (
                <IconSymbol size={28} name="newspaper" color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="notifications"
            options={{
              title: "Notifications",
              drawerIcon: ({ color }) => (
                <IconSymbol size={28} name="bell" color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="resources"
            options={{
              title: "Resources",
              drawerIcon: ({ color }) => (
                <IconSymbol size={28} name="folder" color={color} />
              ),
            }}
          />
          <Drawer.Screen
            name="events"
            options={{
              title: "Events & Semifinalists",
              drawerIcon: ({ color }) => (
                <IconSymbol size={28} name="flag" color={color} />
              ),
            }}
          />
        </Drawer>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
