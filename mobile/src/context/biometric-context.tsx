import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const BIOMETRIC_PREF_KEY = "mailflare_biometric_enabled";

interface BiometricContextType {
  isBiometricSupported: boolean;
  isBiometricEnabled: boolean;
  isLocked: boolean;
  biometricType: string;
  setBiometricEnabled: (enabled: boolean) => Promise<boolean>;
  authenticate: () => Promise<boolean>;
  unlock: () => void;
}

const BiometricContext = createContext<BiometricContextType | undefined>(undefined);

export const BiometricProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [biometricType, setBiometricType] = useState<string>("Biometrics");

  // Check hardware support and saved preference on mount
  useEffect(() => {
    async function init() {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const supported = hasHardware && isEnrolled;
        setIsBiometricSupported(supported);

        if (supported) {
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType("Face ID");
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType("Fingerprint");
          } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            setBiometricType("Iris");
          }
        }

        const storedPref = await AsyncStorage.getItem(BIOMETRIC_PREF_KEY);
        if (storedPref === "true" && supported) {
          setIsBiometricEnabled(true);
          setIsLocked(true);
        }
      } catch (err) {
        console.warn("Biometric init failed:", err);
      }
    }
    init();
  }, []);

  // Listen to AppState transitions (background -> active) to trigger lock
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && isBiometricEnabled && isBiometricSupported) {
        setIsLocked(true);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [isBiometricEnabled, isBiometricSupported]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Mailflare",
        cancelLabel: "Cancel",
        fallbackLabel: "Use Device Passcode",
        disableDeviceFallback: false,
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsLocked(false);
        return true;
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      }
    } catch (err) {
      console.warn("Authentication error:", err);
      return false;
    }
  }, []);

  const setBiometricEnabled = async (enabled: boolean): Promise<boolean> => {
    if (enabled) {
      // Prompt auth once before enabling
      const success = await authenticate();
      if (!success) return false;
    }

    setIsBiometricEnabled(enabled);
    await AsyncStorage.setItem(BIOMETRIC_PREF_KEY, enabled ? "true" : "false");
    return true;
  };

  const unlock = () => {
    setIsLocked(false);
  };

  return (
    <BiometricContext.Provider
      value={{
        isBiometricSupported,
        isBiometricEnabled,
        isLocked,
        biometricType,
        setBiometricEnabled,
        authenticate,
        unlock,
      }}
    >
      {children}
    </BiometricContext.Provider>
  );
};

export const useBiometric = (): BiometricContextType => {
  const context = useContext(BiometricContext);
  if (!context) {
    throw new Error("useBiometric must be used within a BiometricProvider");
  }
  return context;
};
