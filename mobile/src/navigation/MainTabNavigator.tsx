import React from "react";
import { StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Inbox,
  Newspaper,
  Shield,
  Users,
  Settings,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../context/theme-context";
import { InboxScreen } from "../screens/InboxScreen";
import { NewsletterFeedScreen } from "../screens/NewsletterFeedScreen";
import { MaskedAliasesScreen } from "../screens/MaskedAliasesScreen";
import { ContactsScreen } from "../screens/ContactsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

const Tab = createBottomTabNavigator();

export const MainTabNavigator: React.FC = () => {
  const { theme, isDark } = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="MailTab"
        component={InboxScreen}
        options={{
          tabBarLabel: "Mail",
          tabBarIcon: ({ color, size, focused }) => (
            <Inbox size={size || 22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
        listeners={{
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        }}
      />

      <Tab.Screen
        name="FeedsTab"
        component={NewsletterFeedScreen}
        options={{
          tabBarLabel: "Feeds",
          tabBarIcon: ({ color, size, focused }) => (
            <Newspaper size={size || 22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
        listeners={{
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        }}
      />

      <Tab.Screen
        name="PrivacyTab"
        component={MaskedAliasesScreen}
        options={{
          tabBarLabel: "Privacy",
          tabBarIcon: ({ color, size, focused }) => (
            <Shield size={size || 22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
        listeners={{
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        }}
      />

      <Tab.Screen
        name="ContactsTab"
        component={ContactsScreen}
        options={{
          tabBarLabel: "Contacts",
          tabBarIcon: ({ color, size, focused }) => (
            <Users size={size || 22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
        listeners={{
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        }}
      />

      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size, focused }) => (
            <Settings size={size || 22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
        listeners={{
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        }}
      />
    </Tab.Navigator>
  );
};
