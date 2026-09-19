import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import {
  Filter,
  Paperclip,
  Mail,
  Star,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "../context/theme-context";

interface SearchFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  currentQuery: string;
  onApplyQuery: (query: string) => void;
}

export const SearchFilterSheet: React.FC<SearchFilterSheetProps> = ({
  visible,
  onClose,
  currentQuery,
  onApplyQuery,
}) => {
  const { theme, isDark } = useAppTheme();

  const [hasAttachment, setHasAttachment] = useState(false);
  const [isUnread, setIsUnread] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [isSpam, setIsSpam] = useState(false);
  const [dateRange, setDateRange] = useState<"all" | "24h" | "7d" | "30d">("all");
  const [sender, setSender] = useState("");
  const [recipient, setRecipient] = useState("");
  const [subjectKeyword, setSubjectKeyword] = useState("");

  // Parse initial query when opened
  React.useEffect(() => {
    if (visible) {
      setHasAttachment(currentQuery.includes("has:attachment"));
      setIsUnread(currentQuery.includes("is:unread"));
      setIsStarred(currentQuery.includes("is:starred"));
      setIsSpam(currentQuery.includes("is:spam"));

      const fromMatch = currentQuery.match(/from:([^\s]+)/);
      setSender(fromMatch ? fromMatch[1] : "");

      const toMatch = currentQuery.match(/to:([^\s]+)/);
      setRecipient(toMatch ? toMatch[1] : "");

      const subjectMatch = currentQuery.match(/subject:([^\s]+)/);
      setSubjectKeyword(subjectMatch ? subjectMatch[1] : "");
    }
  }, [visible, currentQuery]);

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHasAttachment(false);
    setIsUnread(false);
    setIsStarred(false);
    setIsSpam(false);
    setDateRange("all");
    setSender("");
    setRecipient("");
    setSubjectKeyword("");
  };

  const handleApply = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const tokens: string[] = [];

    if (hasAttachment) tokens.push("has:attachment");
    if (isUnread) tokens.push("is:unread");
    if (isStarred) tokens.push("is:starred");
    if (isSpam) tokens.push("is:spam");

    if (sender.trim()) tokens.push(`from:${sender.trim()}`);
    if (recipient.trim()) tokens.push(`to:${recipient.trim()}`);
    if (subjectKeyword.trim()) tokens.push(`subject:${subjectKeyword.trim()}`);

    if (dateRange === "24h") {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      tokens.push(`after:${yesterday}`);
    } else if (dateRange === "7d") {
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      tokens.push(`after:${lastWeek}`);
    } else if (dateRange === "30d") {
      const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      tokens.push(`after:${lastMonth}`);
    }

    const compiledQuery = tokens.join(" ");
    onApplyQuery(compiledQuery);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              {/* Drag Handle */}
              <View
                style={[
                  styles.handleBar,
                  { backgroundColor: isDark ? "#334155" : "#cbd5e1" },
                ]}
              />

              {/* Header */}
              <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Filter size={20} color={theme.primary} />
                  <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                    Search Filter Engine
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleReset}
                  style={[styles.resetBtn, { backgroundColor: theme.cardSubtle }]}
                >
                  <RotateCcw size={14} color={theme.textSecondary} />
                  <Text style={[styles.resetText, { color: theme.textSecondary }]}>Reset</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
                {/* 1. Instant Filter Pills */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  QUICK OPERATORS
                </Text>
                <View style={styles.pillGrid}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      setHasAttachment(!hasAttachment);
                    }}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: hasAttachment ? theme.primarySubtle : theme.cardSubtle,
                        borderColor: hasAttachment ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Paperclip size={15} color={hasAttachment ? theme.primary : theme.textSecondary} />
                    <Text
                      style={[
                        styles.pillText,
                        { color: hasAttachment ? theme.primary : theme.textPrimary },
                      ]}
                    >
                      Has Attachment
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      setIsUnread(!isUnread);
                    }}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: isUnread ? theme.primarySubtle : theme.cardSubtle,
                        borderColor: isUnread ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Mail size={15} color={isUnread ? theme.primary : theme.textSecondary} />
                    <Text
                      style={[
                        styles.pillText,
                        { color: isUnread ? theme.primary : theme.textPrimary },
                      ]}
                    >
                      Unread Only
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      setIsStarred(!isStarred);
                    }}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: isStarred ? "rgba(245, 158, 11, 0.15)" : theme.cardSubtle,
                        borderColor: isStarred ? "#f59e0b" : theme.border,
                      },
                    ]}
                  >
                    <Star
                      size={15}
                      color={isStarred ? "#f59e0b" : theme.textSecondary}
                      fill={isStarred ? "#f59e0b" : "transparent"}
                    />
                    <Text
                      style={[
                        styles.pillText,
                        { color: isStarred ? "#f59e0b" : theme.textPrimary },
                      ]}
                    >
                      Starred Only
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      setIsSpam(!isSpam);
                    }}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: isSpam ? "rgba(239, 68, 68, 0.15)" : theme.cardSubtle,
                        borderColor: isSpam ? "#ef4444" : theme.border,
                      },
                    ]}
                  >
                    <AlertTriangle size={15} color={isSpam ? "#ef4444" : theme.textSecondary} />
                    <Text
                      style={[
                        styles.pillText,
                        { color: isSpam ? "#ef4444" : theme.textPrimary },
                      ]}
                    >
                      Include Spam
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 2. Date Range Filter */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: 18 }]}>
                  RECEIVED DATE
                </Text>
                <View style={styles.pillGrid}>
                  {(
                    [
                      { id: "all", label: "Any Time" },
                      { id: "24h", label: "Last 24 Hours" },
                      { id: "7d", label: "Last 7 Days" },
                      { id: "30d", label: "Last 30 Days" },
                    ] as const
                  ).map((d) => {
                    const active = dateRange === d.id;
                    return (
                      <TouchableOpacity
                        key={d.id}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setDateRange(d.id);
                        }}
                        style={[
                          styles.datePill,
                          {
                            backgroundColor: active ? theme.primarySubtle : theme.cardSubtle,
                            borderColor: active ? theme.primary : theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            { color: active ? theme.primary : theme.textPrimary },
                          ]}
                        >
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 3. Sender / Recipient / Subject Inputs */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: 18 }]}>
                  TARGET CRITERIA
                </Text>

                <View style={[styles.inputGroup, { backgroundColor: theme.cardSubtle, borderColor: theme.border }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>From:</Text>
                  <TextInput
                    style={[styles.textInput, { color: theme.textPrimary }]}
                    placeholder="e.g. boss@company.com"
                    placeholderTextColor={theme.textMuted}
                    value={sender}
                    onChangeText={setSender}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={[styles.inputGroup, { backgroundColor: theme.cardSubtle, borderColor: theme.border, marginTop: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>To:</Text>
                  <TextInput
                    style={[styles.textInput, { color: theme.textPrimary }]}
                    placeholder="e.g. billing@domain.com"
                    placeholderTextColor={theme.textMuted}
                    value={recipient}
                    onChangeText={setRecipient}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={[styles.inputGroup, { backgroundColor: theme.cardSubtle, borderColor: theme.border, marginTop: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Subject:</Text>
                  <TextInput
                    style={[styles.textInput, { color: theme.textPrimary }]}
                    placeholder="e.g. Invoice, Contract"
                    placeholderTextColor={theme.textMuted}
                    value={subjectKeyword}
                    onChangeText={setSubjectKeyword}
                    autoCorrect={false}
                  />
                </View>
              </ScrollView>

              {/* Footer Action Button */}
              <View style={[styles.footer, { borderTopColor: theme.border }]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleApply}
                  style={[styles.applyBtn, { backgroundColor: theme.primary }]}
                >
                  <Sparkles size={18} color="#ffffff" />
                  <Text style={styles.applyBtnText}>Apply Search Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  handleBar: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  resetText: {
    fontSize: 12,
    fontWeight: "700",
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  datePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "800",
    width: 60,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  applyBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
