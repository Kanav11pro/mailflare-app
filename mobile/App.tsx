import React, { useEffect } from "react";
import { View, ActivityIndicator, Linking } from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";

import { ThemeProvider, useAppTheme } from "./src/context/theme-context";
import { AuthProvider, useAuth } from "./src/context/auth-context";
import { BiometricProvider, useBiometric } from "./src/context/biometric-context";
import { MainTabNavigator } from "./src/navigation/MainTabNavigator";
import { LoginScreen } from "./src/screens/LoginScreen";
import { MessageDetailScreen } from "./src/screens/MessageDetailScreen";
import { ComposeScreen } from "./src/screens/ComposeScreen";
import { BiometricLockScreen } from "./src/screens/BiometricLockScreen";
import { MaskedAliasesScreen } from "./src/screens/MaskedAliasesScreen";
import { NewsletterFeedScreen } from "./src/screens/NewsletterFeedScreen";
import { ContactsScreen } from "./src/screens/ContactsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { MfaSecurityScreen } from "./src/screens/MfaSecurityScreen";
import { AutoReplyScreen } from "./src/screens/AutoReplyScreen";
import { SignaturesScreen } from "./src/screens/SignaturesScreen";
import { RoutingRulesScreen } from "./src/screens/RoutingRulesScreen";
import { DomainDnsScreen } from "./src/screens/DomainDnsScreen";
import { AccountSecurityScreen } from "./src/screens/AccountSecurityScreen";
import { SpamSettingsScreen } from "./src/screens/SpamSettingsScreen";
import { WebhooksScreen } from "./src/screens/WebhooksScreen";
import { registerQuickActionHandler } from "./src/lib/quick-actions";
import { parseDeepLinkUrl } from "./src/lib/share-handler";

export const navigationRef = createNavigationContainerRef<any>();

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ["mailflare://", "mailto:", "https://mail.studyholic.xyz"],
  config: {
    screens: {
      Main: {
        screens: {
          MailTab: "inbox",
          FeedsTab: "feed",
          PrivacyTab: "masked",
          ContactsTab: "contacts",
          SettingsTab: "settings",
        },
      },
      MessageDetail: "message/:messageId",
      Compose: "compose",
      AccountSecurity: "settings/account",
      SpamSettings: "settings/spam",
      Webhooks: "settings/webhooks",
      MfaSecurity: "settings/mfa",
      AutoReply: "settings/auto-reply",
      Signatures: "settings/signatures",
      RoutingRules: "settings/rules",
      DomainDns: "settings/domains",
    },
  },
};

function RootNavigator() {
  const { token, isLoading } = useAuth();
  const { isLocked } = useBiometric();
  const { theme } = useAppTheme();

  useEffect(() => {
    // Register 3D Touch App Icon Quick Action Handler
    const unsubQuick = registerQuickActionHandler((action) => {
      if (!navigationRef.isReady()) return;

      if (action.id === "action_compose") {
        navigationRef.navigate("Compose");
      } else if (action.id === "action_masked") {
        navigationRef.navigate("Main", { screen: "PrivacyTab" });
      } else if (action.id === "action_search") {
        navigationRef.navigate("Main", { screen: "MailTab" });
      } else if (action.id === "action_outbox") {
        navigationRef.navigate("Main", { screen: "MailTab" });
      }
    });

    // Handle deep link / system share URL
    const handleUrl = (event: { url: string }) => {
      const parsed = parseDeepLinkUrl(event.url);
      if (parsed && navigationRef.isReady()) {
        navigationRef.navigate(parsed.screen, parsed.params);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    const unsubLink = Linking.addEventListener("url", handleUrl);

    return () => {
      unsubQuick();
      unsubLink.remove();
    };
  }, []);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // If user is authenticated but biometric lock is triggered, show Biometric Lock Shield
  if (token && isLocked) {
    return <BiometricLockScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
        animation: "slide_from_right",
      }}
    >
      {!token ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="MessageDetail" component={MessageDetailScreen} />
          <Stack.Screen
            name="Compose"
            component={ComposeScreen}
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen name="MfaSecurity" component={MfaSecurityScreen} />
          <Stack.Screen name="AccountSecurity" component={AccountSecurityScreen} />
          <Stack.Screen name="SpamSettings" component={SpamSettingsScreen} />
          <Stack.Screen name="Webhooks" component={WebhooksScreen} />
          <Stack.Screen name="AutoReply" component={AutoReplyScreen} />
          <Stack.Screen name="Signatures" component={SignaturesScreen} />
          <Stack.Screen name="RoutingRules" component={RoutingRulesScreen} />
          <Stack.Screen name="DomainDns" component={DomainDnsScreen} />
          <Stack.Screen name="MaskedAliases" component={MaskedAliasesScreen} />
          <Stack.Screen name="NewsletterFeed" component={NewsletterFeedScreen} />
          <Stack.Screen name="Contacts" component={ContactsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

function ThemedApp() {
  const { theme, isDark } = useAppTheme();

  const navigationTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.textPrimary,
      border: theme.border,
      notification: theme.primary,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} linking={linking} theme={navigationTheme}>
      <ExpoStatusBar style={theme.statusBarStyle} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <BiometricProvider>
            <ThemedApp />
          </BiometricProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
