import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import {
  Search,
  Menu,
  X,
  Inbox,
  Star,
  Send,
  AlertTriangle,
  Trash2,
  FileText,
  Clock,
  Filter,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Avatar } from "./Avatar";
import { useAuth } from "../context/auth-context";
import { useAppTheme } from "../context/theme-context";
import { FolderType } from "../types";
import { SyncManager } from "../lib/sync-manager";

interface HeaderProps {
  onOpenSheet: () => void;
  onOpenSettings: () => void;
  onOpenMaskedAliases?: () => void;
  onOpenNewsletterFeed?: () => void;
  onOpenFilter?: () => void;
  searchQuery: string;
  onSearchChange: (text: string) => void;
}

const CATEGORY_CHIPS: { id: FolderType; label: string; icon: any; color?: string }[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "starred", label: "Starred", icon: Star, color: "#eab308" },
  { id: "snoozed", label: "Snoozed", icon: Clock, color: "#a855f7" },
  { id: "outbox", label: "Outbox", icon: Send, color: "#38bdf8" },
  { id: "sent", label: "Sent", icon: Send },
  { id: "drafts", label: "Drafts", icon: FileText },
  { id: "spam", label: "Spam", icon: AlertTriangle, color: "#f87171" },
  { id: "trash", label: "Trash", icon: Trash2 },
];

export const Header: React.FC<HeaderProps> = ({
  onOpenSheet,
  onOpenSettings,
  onOpenMaskedAliases,
  onOpenNewsletterFeed,
  onOpenFilter,
  searchQuery,
  onSearchChange,
}) => {
  const { user, selectedMailbox, selectedFolder, setSelectedFolder } = useAuth();
  const { theme, isDark } = useAppTheme();
  const [outboxCount, setOutboxCount] = React.useState(0);

  React.useEffect(() => {
    const unsub = SyncManager.subscribe((items) => {
      setOutboxCount(items.filter((i) => i.status === "queued" || i.status === "failed").length);
    });
    return unsub;
  }, []);

  const mailboxBadge = selectedMailbox
    ? selectedMailbox.displayName || selectedMailbox.localPart
    : "All Mailboxes";

  const handleChipPress = (folder: FolderType) => {
    if (selectedFolder !== folder) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedFolder(folder);
    }
  };

  return (
    <View style={[styles.headerWrapper, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
      {/* Floating Search Capsule */}
      <View
        style={[
          styles.searchCapsule,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            shadowColor: isDark ? "#000000" : "#64748b",
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onOpenSheet();
          }}
          style={styles.menuButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Menu size={20} color={theme.textSecondary} />
          <View style={[styles.unreadPulse, { backgroundColor: theme.primary }]} />
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <Search size={16} color={theme.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder={`Search ${mailboxBadge}...`}
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.textPrimary }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => onSearchChange("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearBtn}
            >
              <X size={14} color={theme.textMuted} />
            </TouchableOpacity>
          )}
          {onOpenFilter && (
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                onOpenFilter();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ paddingHorizontal: 6 }}
            >
              <Filter size={15} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onOpenSettings();
          }}
          style={styles.avatarButton}
        >
          <Avatar
            name={user?.name}
            email={user?.email || "user@mailflare.app"}
            size={32}
          />
        </TouchableOpacity>
      </View>

      {/* Horizontal Category Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORY_CHIPS.map((chip) => {
          const isActive = selectedFolder === chip.id;
          const IconComponent = chip.icon;

          return (
            <TouchableOpacity
              key={chip.id}
              activeOpacity={0.75}
              onPress={() => handleChipPress(chip.id)}
              style={[
                styles.categoryChip,
                isActive
                  ? [styles.categoryChipActive, { backgroundColor: theme.primary, borderColor: theme.primary }]
                  : [styles.categoryChipInactive, { backgroundColor: theme.card, borderColor: theme.border }],
              ]}
            >
              <IconComponent
                size={14}
                color={isActive ? "#ffffff" : chip.color || theme.textSecondary}
                fill={chip.id === "starred" && isActive ? "#ffffff" : "transparent"}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  isActive
                    ? styles.categoryChipTextActive
                    : [styles.categoryChipTextInactive, { color: theme.textSecondary }],
                ]}
              >
                {chip.label}
              </Text>
              {chip.id === "outbox" && outboxCount > 0 && (
                <View style={[styles.outboxBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.outboxBadgeText}>{outboxCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchCapsule: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  menuButton: {
    position: "relative",
    padding: 6,
    marginRight: 6,
  },
  unreadPulse: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
    marginRight: 4,
  },
  avatarButton: {
    marginLeft: 6,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryChipInactive: {},
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  categoryChipTextInactive: {},
  outboxBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 2,
  },
  outboxBadgeText: {
    color: "#ffffff",
    fontSize: 9.5,
    fontWeight: "900",
  },
});
