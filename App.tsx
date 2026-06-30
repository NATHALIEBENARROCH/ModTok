import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StyleSheet, View, ActivityIndicator, Platform, useWindowDimensions } from "react-native";
import { Session } from "@supabase/supabase-js";
import AppNavigator from "./src/navigation/AppNavigator";
import SignInScreen from "./src/screens/SignInScreen";
import { ClosetProvider } from "./src/context/ClosetContext";
import { OutfitProvider } from "./src/context/OutfitContext";
import { Colors } from "./src/theme";
import ModTokLogo from "./src/components/ModTokLogo";
import { supabase } from "./src/lib/supabase";

const MAX_APP_WIDTH = 430;

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    // Check for existing session on app start
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
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

  const content = session ? (
    <AppNavigator />
  ) : (
    <SignInScreen />
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
