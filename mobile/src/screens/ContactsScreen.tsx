import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Modal,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  Plus,
  Mail,
  User,
  ShieldAlert,
  X,
  Sparkles,
  Users,
  ChevronRight,
  Send,
  Inbox,
  AlertTriangle,
  RotateCw,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../context/theme-context";
import { api } from "../api/client";
import { ContactItem } from "../types";
import { Avatar } from "../components/Avatar";
import { ContactDossierSheet } from "../components/ContactDossierSheet";

export const ContactsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { theme, isDark } = useAppTheme();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter Tab: "all" | "inbound" | "outbound" | "manual"
  const [activeFilter, setActiveFilter] = useState<"all" | "inbound" | "outbound" | "manual">("all");

  // Contact Dossier Sheet
  const [selectedDossier, setSelectedDossier] = useState<{ email: string; name?: string } | null>(null);

  // Add Contact Modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchContacts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      setFetchError(null);
      const data = await api.getContacts(searchQuery.trim() || undefined);
      setContacts(data || []);
    } catch (err: any) {
      console.error("Failed to load contacts:", err);
      setFetchError(err.message || "Failed to load contacts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filteredContacts = contacts.filter((c) => {
    if (activeFilter === "all") return true;
    return c.source === activeFilter;
  });

  const handleCreateContact = async () => {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      Alert.alert("Invalid Email", "Please provide a valid email address.");
      return;
    }

    try {
      setCreating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const created = await api.createContact({
        email: newEmail.trim().toLowerCase(),
        displayName: newName.trim() || undefined,
      });

      setContacts((prev) => [created, ...prev.filter((c) => c.email !== created.email)]);
      setAddModalVisible(false);
      setNewEmail("");
      setNewName("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Creation Failed", err.message || "Could not save contact.");
    } finally {
      setCreating(false);
    }
  };

  const handleQuickCompose = (contact: ContactItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Compose", {
      initialTo: contact.displayName ? `${contact.displayName} <${contact.email}>` : contact.email,
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.navbar, { borderBottomColor: theme.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={[styles.headerIconCircle, { backgroundColor: theme.primarySubtle }]}>
            <Users size={20} color={theme.primary} />
          </View>
          <View>
            <Text style={[styles.navTitle, { color: theme.textPrimary }]}>Contacts CRM</Text>
            <Text style={[styles.navSubtitle, { color: theme.textSecondary }]}>
              {contacts.length} verified contacts
            </Text>
          </View>
        </View>

        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setAddModalVisible(true);
          }}
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
        >
          <Plus size={18} color="#ffffff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Search name, domain, or address..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(["all", "inbound", "outbound", "manual"] as const).map((filter) => {
          const isActive = activeFilter === filter;
          const labels = {
            all: "All Contacts",
            inbound: "Inbound Senders",
            outbound: "Outbound Recipients",
            manual: "Saved VIPs",
          };
          return (
            <TouchableOpacity
              key={filter}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveFilter(filter);
              }}
              style={[
                styles.filterPill,
                { backgroundColor: isActive ? theme.primarySubtle : theme.card, borderColor: isActive ? theme.primary : theme.border },
              ]}
            >
              <Text style={[styles.filterPillText, { color: isActive ? theme.primary : theme.textSecondary }]}>
                {labels[filter]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Contact List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : fetchError ? (
        <View style={styles.centerBox}>
          <AlertTriangle size={40} color={theme.warning} />
          <Text style={[styles.errorTitle, { color: theme.warning }]}>Could Not Load Contacts</Text>
          <Text style={[styles.errorSubtitle, { color: theme.textSecondary }]}>{fetchError}</Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              fetchContacts();
            }}
            style={[styles.retryBtn, { backgroundColor: theme.primary }]}
          >
            <RotateCw size={16} color="#ffffff" />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredContacts.length === 0 ? (
        <View style={styles.centerBox}>
          <Users size={48} color={theme.textMuted} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No Contacts Found</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            {searchQuery ? "No contacts match your query." : "As you send and receive emails, contacts will populate automatically."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id || item.email}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchContacts(true)}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedDossier({ email: item.email, name: item.displayName || undefined });
              }}
              style={[
                styles.contactCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Avatar name={item.displayName || item.email} email={item.email} size={44} />

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.contactName, { color: theme.textPrimary }]} numberOfLines={1}>
                    {item.displayName || item.email.split("@")[0]}
                  </Text>
                  {item.blocked && (
                    <View style={[styles.badge, { backgroundColor: theme.dangerSubtle }]}>
                      <Text style={[styles.badgeText, { color: theme.danger }]}>BLOCKED</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.contactEmail, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>

              {/* Fast Actions */}
              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => handleQuickCompose(item)}
                style={[styles.actionBtn, { backgroundColor: theme.primarySubtle }]}
              >
                <Send size={15} color={theme.primary} />
              </TouchableOpacity>
              <ChevronRight size={18} color={theme.textMuted} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Contact Dossier Inspector Sheet */}
      {selectedDossier && (
        <ContactDossierSheet
          visible={!!selectedDossier}
          email={selectedDossier.email}
          name={selectedDossier.name}
          onClose={() => setSelectedDossier(null)}
          onCompose={(email) => {
            setSelectedDossier(null);
            navigation.navigate("Compose", { initialTo: email });
          }}
        />
      )}

      {/* Add Contact Modal */}
      <Modal visible={addModalVisible} animationType="fade" transparent onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Add New Contact</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>FULL NAME</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.cardSecondary, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="e.g. Alex Miller"
              placeholderTextColor={theme.textMuted}
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>EMAIL ADDRESS</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.cardSecondary, borderColor: theme.border, color: theme.textPrimary }]}
              placeholder="alex@company.com"
              placeholderTextColor={theme.textMuted}
              value={newEmail}
              onChangeText={setNewEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={creating}
              onPress={handleCreateContact}
              style={[styles.modalSubmitBtn, { backgroundColor: theme.primary }]}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Save Contact</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  navSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  retryBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  contactName: {
    fontSize: 15,
    fontWeight: "700",
  },
  contactEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalSubmitBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
  },
  modalSubmitBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});
