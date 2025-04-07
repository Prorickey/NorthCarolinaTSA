import { Stack } from "expo-router";
import { SessionProvider } from "../context/authContext";

export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: "modal",
            title: "Privacy Policy",
            headerShown: false,
          }}
        />
      </Stack>
    </SessionProvider>
  );
}
