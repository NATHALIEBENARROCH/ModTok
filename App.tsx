import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StyleSheet, View, ActivityIndicator, Platform, useWindowDimensions } from "react-native";
import AppNavigator from "./src/navigation/AppNavigator";
import SignInScreen from "./src/screens/SignInScreen";
import { ClosetProvider } from "./src/context/ClosetContext";
import { OutfitProvider } from "./src/context/OutfitContext";
import { Colors } from "./src/theme";
import ModTokLogo from "./src/components/ModTokLogo";

const MAX_APP_WIDTH = 430;

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { width } = useWindowDimensions();

  useEffect(() => {
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

  const content = isAuthenticated ? (
    <AppNavigator />
  ) : (
    <SignInScreen onSignIn={() => setIsAuthenticated(true)} />
  );

  if (Platform.OS === 'web' && width > MAX_APP_WIDTH) {
    return (
      <View style={styles.webWrapper}>
        <View style={[styles.phoneContainer, { maxWidth: MAX_APP_WIDTH }]}>
          {content}
        </View>
      </View>
    );
  }

  return content;
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ClosetProvider>
          <OutfitProvider>
            <StatusBar style="dark" backgroundColor={Colors.background} />
            <AppContent />
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
  webWrapper: {
    flex: 1,
    backgroundColor: '#E0D8D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
});
