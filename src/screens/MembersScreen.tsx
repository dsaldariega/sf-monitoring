import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";
import { AppModal, ModalActions } from "../components/AppModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { ScreenLayout } from "../components/ScreenLayout";
import { SectionCard } from "../components/SectionCard";
import type { MemberRecord } from "../database/database.types";
import {
  createMember,
  deleteMember,
  listMembers,
} from "../services/memberService";
import { theme } from "../constants/theme";
import { useToast } from "../components/ToastProvider";

export function MembersScreen() {
  const db = useSQLiteContext();
  const { showToast } = useToast();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MemberRecord | null>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<number | null>(null);
  const [memberCode, setMemberCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [heads, setHeads] = useState("1");
  const [contactNumber, setContactNumber] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const refreshMembers = useCallback(async () => {
    try {
      setMembers(await listMembers(db));
    } catch {
      setError("Unable to load member records.");
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refreshMembers();
    }, [refreshMembers]),
  );

  const openAddModal = () => {
    setError("");
    setMemberCode("");
    setFullName("");
    setHeads("1");
    setContactNumber("");
    setModalVisible(true);
  };

  const handleAddMember = async () => {
    setError("");
    const nextHeads = Number(heads);
    if (!/^\d{1,10}$/.test(memberCode.trim())) {
      setError("Member ID must contain numbers only.");
      return;
    }
    if (!Number.isSafeInteger(nextHeads) || nextHeads < 1 || nextHeads > 999) {
      setError("Heads must be a whole number from 1 to 999.");
      return;
    }

    setSaving(true);
    try {
      await createMember(db, {
        memberCode,
        fullName,
        heads: nextHeads,
        contactNumber,
      });
      setModalVisible(false);
      await refreshMembers();
      showToast(`Member ${memberCode.trim()} added successfully.`, "success");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Unable to save this member.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      const deletedCode = deleteTarget.member_code;
      await deleteMember(db, deleteTarget.id);
      setDeleteTarget(null);
      await refreshMembers();
      showToast(`Member ${deletedCode} deleted successfully.`, "destructive");
    } catch (cause) {
      setDeleteTarget(null);
      const message =
        cause instanceof Error
          ? cause.message
          : "Unable to delete this member.";
      setError(message);
      showToast(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScreenLayout
      title="Members"
      description="Register members using a numeric ID. Full name is optional for privacy."
    >
      <SectionCard
        title="Member records"
        subtitle="Add new members from a modal. Members with financial history cannot be permanently deleted."
      >
        <Pressable style={styles.primaryButton} onPress={openAddModal}>
          <Text style={styles.primaryButtonText}>+ Add member</Text>
        </Pressable>
      </SectionCard>

      <SectionCard
        title={`Member records · ${members.length}`}
        subtitle="Use Delete only for a member that has no financial history."
      >
        {members.length === 0 ? (
          <Text style={styles.empty}>No members registered yet.</Text>
        ) : (
          members.map((member) => {
            const isExpanded = member.id === expandedMemberId;
            return (
              <View
                key={member.id}
                style={[styles.memberRow, isExpanded && styles.expandedRow]}
              >
                <Pressable
                  style={styles.memberInfo}
                  onPress={() =>
                    setExpandedMemberId((current) =>
                      current === member.id ? null : member.id,
                    )
                  }
                >
                  <Text style={styles.memberCode}>
                    Member {member.member_code}
                  </Text>
                  <Text style={styles.memberName}>
                    {member.full_name.trim() || "Name not provided"}
                  </Text>
                  <Text style={styles.meta}>
                    {member.heads} heads · PHP{" "}
                    {(member.heads * 50).toLocaleString("en-PH")}/week
                  </Text>
                  {isExpanded && member.contact_number ? (
                    <Text style={styles.meta}>{member.contact_number}</Text>
                  ) : null}
                  <Text style={styles.expandHint}>
                    {isExpanded ? "Tap to collapse" : "Tap to view actions"}
                  </Text>
                </Pressable>
                {isExpanded ? (
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => setDeleteTarget(member)}
                  >
                    <Text style={styles.deleteButtonText}>Delete member</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </SectionCard>

      <AppModal
        visible={modalVisible}
        title="Add member"
        subtitle="Create a new member record on this device."
        onClose={() => {
          if (!saving) setModalVisible(false);
        }}
        footer={
          <ModalActions
            primaryLabel="Save member"
            onPrimary={() => void handleAddMember()}
            onSecondary={() => setModalVisible(false)}
            busy={saving}
          />
        }
      >
        <Field
          label="Member ID"
          value={memberCode}
          onChangeText={setMemberCode}
          placeholder="e.g. 1"
          keyboardType="number-pad"
        />
        <Field
          label="Heads"
          value={heads}
          onChangeText={setHeads}
          placeholder="e.g. 4"
          keyboardType="number-pad"
        />
        <Field
          label="Full name (optional)"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Leave blank for privacy"
        />
        <Field
          label="Contact number (optional)"
          value={contactNumber}
          onChangeText={setContactNumber}
          placeholder="Contact number"
          keyboardType="phone-pad"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </AppModal>

      <ConfirmModal
        visible={Boolean(deleteTarget)}
        title="Delete member?"
        message={
          deleteTarget
            ? `Permanently delete Member ${deleteTarget.member_code}? This cannot be undone. Deletion is blocked if the member already has loan or Sinking Fund financial history.`
            : ""
        }
        confirmLabel="Delete member"
        onConfirm={() => void handleDeleteMember()}
        onCancel={() => setDeleteTarget(null)}
        busy={deleting}
        destructive
      />
    </ScreenLayout>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad" | "number-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor={theme.colors.muted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: theme.colors.text, fontSize: 12, fontWeight: "700" },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    color: theme.colors.text,
    fontSize: 14,
  },
  error: { color: "#B42318", fontSize: 12, lineHeight: 18 },
  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  deleteButton: {
    borderRadius: 9,
    backgroundColor: "#FCE8E6",
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  deleteButtonText: { color: "#B42318", fontSize: 11, fontWeight: "800" },
  empty: { color: theme.colors.muted, fontSize: 13 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  memberInfo: { flex: 1, gap: 3 },
  expandedRow: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  memberCode: { color: theme.colors.primary, fontSize: 11, fontWeight: "800" },
  memberName: { color: theme.colors.text, fontSize: 14, fontWeight: "700" },
  meta: { color: theme.colors.muted, fontSize: 11 },
  expandHint: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
  },
});
