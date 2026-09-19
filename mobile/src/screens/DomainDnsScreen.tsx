import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Server,
  Zap,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../context/theme-context";
import { api } from "../api/client";
import { DomainInfo } from "../types";

export const DomainDnsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme } = useAppTheme();
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingDomainId, setCheckingDomainId] = useState<string | null>(null);

  const fetchDomains = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await api.getDomains();
      setDomains(data || []);
    } catch (err: any) {
      console.error("Failed to load domains:", err);
      Alert.alert("Error", err.message || "Failed to load domain configurations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleLiveCheck = async (domainId: string) => {
    try {
      setCheckingDomainId(domainId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const updated = await api.checkDomainDns(domainId);
      setDomains((prev) => prev.map((d) => (d.id === domainId ? updated : d)));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("DNS Check Complete", `Domain status: ${updated.status.toUpperCase()}`);
    } catch (err: any) {
      Alert.alert("DNS Check Failed", err.message || "Could not query Cloudflare DNS.");
    } finally {
      setCheckingDomainId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      {/* Navbar */}
      <View style={[styles.navbar, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => navigation.goBack()}
          style={styles.navBtn}
        >
          <ArrowLeft size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.textPrimary }]}>Domain & DNS Health</Text>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          disabled={loading || refreshing}
          onPress={() => fetchDomains(true)}
          style={[styles.refreshBtn, { backgroundColor: theme.primarySubtle }]}
        >
          <RefreshCw size={16} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchDomains(true)}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {domains.map((dom) => {
            const isChecking = checkingDomainId === dom.id;
            const isVerified = dom.status === "active";

            return (
              <View
                key={dom.id}
                style={[
                  styles.domainCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                {/* Domain Header */}
                <View style={styles.domainHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <View style={[styles.domainIconCircle, { backgroundColor: theme.primarySubtle }]}>
                      <Globe size={22} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.hostname, { color: theme.textPrimary }]} numberOfLines={1}>
                        {dom.hostname}
                      </Text>
                      <Text style={[styles.zoneId, { color: theme.textMuted }]}>
                        Zone: {dom.zoneId ? `${dom.zoneId.slice(0, 10)}...` : "Cloudflare"}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: isVerified ? theme.successSubtle : theme.warningSubtle,
                        borderColor: isVerified ? theme.success : theme.warning,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: isVerified ? theme.success : theme.warning },
                      ]}
                    >
                      {dom.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Capability Badges */}
                <View style={styles.capabilityRow}>
                  <View
                    style={[
                      styles.capBadge,
                      {
                        backgroundColor: dom.routingEnabled ? theme.successSubtle : theme.cardSecondary,
                        borderColor: dom.routingEnabled ? theme.success : theme.border,
                      },
                    ]}
                  >
                    <CheckCircle2 size={12} color={dom.routingEnabled ? theme.success : theme.textMuted} />
                    <Text
                      style={[
                        styles.capBadgeText,
                        { color: dom.routingEnabled ? theme.success : theme.textMuted },
                      ]}
                    >
                      INBOUND ROUTING
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.capBadge,
                      {
                        backgroundColor: dom.sendingEnabled ? theme.successSubtle : theme.cardSecondary,
                        borderColor: dom.sendingEnabled ? theme.success : theme.border,
                      },
                    ]}
                  >
                    <CheckCircle2 size={12} color={dom.sendingEnabled ? theme.success : theme.textMuted} />
                    <Text
                      style={[
                        styles.capBadgeText,
                        { color: dom.sendingEnabled ? theme.success : theme.textMuted },
                      ]}
                    >
                      OUTBOUND SENDING
                    </Text>
                  </View>
                </View>

                {/* DNS Records Breakdown */}
                <View style={[styles.dnsSection, { borderTopColor: theme.border }]}>
                  <Text style={[styles.dnsSectionTitle, { color: theme.textSecondary }]}>
                    SECURITY & ROUTING RECORDS
                  </Text>

                  <View style={styles.dnsList}>
                    {/* MX Record */}
                    <View style={[styles.dnsRow, { backgroundColor: theme.cardSecondary }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dnsType, { color: theme.textPrimary }]}>MX (Email Inbound)</Text>
                        <Text style={[styles.dnsValue, { color: theme.textMuted }]}>
                          route1.mx.cloudflare.net (Priority 10)
                        </Text>
                      </View>
                      <CheckCircle2 size={18} color={theme.success} />
                    </View>

                    {/* SPF Record */}
                    <View style={[styles.dnsRow, { backgroundColor: theme.cardSecondary }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dnsType, { color: theme.textPrimary }]}>TXT (SPF Authentication)</Text>
                        <Text style={[styles.dnsValue, { color: theme.textMuted }]}>
                          v=spf1 include:_spf.mx.cloudflare.net ~all
                        </Text>
                      </View>
                      <CheckCircle2 size={18} color={theme.success} />
                    </View>

                    {/* DKIM Record */}
                    <View style={[styles.dnsRow, { backgroundColor: theme.cardSecondary }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dnsType, { color: theme.textPrimary }]}>CNAME (DKIM Signing)</Text>
                        <Text style={[styles.dnsValue, { color: theme.textMuted }]}>
                          resend._domainkey.{dom.hostname}
                        </Text>
                      </View>
                      <CheckCircle2 size={18} color={theme.success} />
                    </View>

                    {/* DMARC Record */}
                    <View style={[styles.dnsRow, { backgroundColor: theme.cardSecondary }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dnsType, { color: theme.textPrimary }]}>TXT (DMARC Policy)</Text>
                        <Text style={[styles.dnsValue, { color: theme.textMuted }]}>
                          v=DMARC1; p=none; sp=none; aspf=r; adkim=r;
                        </Text>
                      </View>
                      <CheckCircle2 size={18} color={theme.success} />
                    </View>
                  </View>
                </View>

                {/* Recheck Action */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isChecking}
                  onPress={() => handleLiveCheck(dom.id)}
                  style={[styles.checkBtn, { backgroundColor: theme.primarySubtle }]}
                >
                  {isChecking ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <>
                      <RefreshCw size={14} color={theme.primary} />
                      <Text style={[styles.checkBtnText, { color: theme.primary }]}>
                        Query Live Cloudflare DNS
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { padding: 4 },
  navTitle: { fontSize: 17, fontWeight: "800" },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  domainCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  domainHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  domainIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  hostname: { fontSize: 16, fontWeight: "800" },
  zoneId: { fontSize: 11, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 10, fontWeight: "800" },
  capabilityRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  capBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  capBadgeText: { fontSize: 9, fontWeight: "800" },
  dnsSection: {
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dnsSectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  dnsList: { gap: 8 },
  dnsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 10,
  },
  dnsType: { fontSize: 12, fontWeight: "700" },
  dnsValue: { fontSize: 10, marginTop: 2, fontFamily: "monospace" },
  checkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 14,
  },
  checkBtnText: { fontSize: 12, fontWeight: "800" },
});
