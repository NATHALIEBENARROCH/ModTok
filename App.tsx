import React, { useState, useEffect } from "react";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StyleSheet, View, ActivityIndicator, Platform, useWindowDimensions } from "react-native";
import { Session } from "@supabase/supabase-js";
import AppNavigator from "./src/navigation/AppNavigator";
import SignInScreen from "./src/screens/SignInScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import { ClosetProvider } from "./src/context/ClosetContext";
import { OutfitProvider } from "./src/context/OutfitContext";
import { Colors } from "./src/theme";
import ModTokLogo from "./src/components/ModTokLogo";
import { supabase } from "./src/lib/supabase";

const MAX_APP_WIDTH = 430;

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const { width } = useWindowDimensions();

  useEffect(() => {
    async function openPasswordRecovery(url: string) {
      const hash = url.split('#')[1] || '';
      const query = url.split('?')[1]?.split('#')[0] || '';
      const hashParams = new URLSearchParams(hash);
      const queryParams = new URLSearchParams(query);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const code = queryParams.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) setIsPasswordRecovery(true);
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) setIsPasswordRecovery(true);
      }
    }

    // Check for an existing session and for a password-reset link that opened the app.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });
    Linking.getInitialURL().then((url) => {
      if (url?.includes('reset-password')) openPasswordRecovery(url);
    });
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('reset-password')) openPasswordRecovery(url);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
    };
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

  const content = isPasswordRecovery ? (
    <ResetPasswordScreen onComplete={() => setIsPasswordRecovery(false)} />
  ) : session ? (
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
