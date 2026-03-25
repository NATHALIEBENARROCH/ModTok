import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StyleSheet, View, ActivityIndicator, Image } from "react-native";
import AppNavigator from "./src/navigation/AppNavigator";
import SignInScreen from "./src/screens/SignInScreen";
import { ClosetProvider } from "./src/context/ClosetContext";
import { OutfitProvider } from "./src/context/OutfitContext";
import { Colors } from "./src/theme";
import ModTokLogo from "./src/components/ModTokLogo";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Simulate splash screen / initial load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <ModTokLogo size="large" showTagline />
        <ActivityIndicator
          size="small"
          color={Colors.primary}
          style={styles.loader}
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ClosetProvider>
          <OutfitProvider>
            <StatusBar style="dark" backgroundColor={Colors.background} />
            {isAuthenticated ? (
              <AppNavigator />
            ) : (
              <SignInScreen onSignIn={() => setIsAuthenticated(true)} />
            )}
          </OutfitProvider>
        </ClosetProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    marginTop: 40,
  },
});
