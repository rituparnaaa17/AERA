/**
 * Contacts Screen — Premium emergency contact profile cards
 */

import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, PrimaryButton, GlassCard, IconButton } from '@/components/AppPrimitives';
import { AppBackground } from '@/components/AppBackground';
import { Mascot } from '@/components/Mascot';
import { useTrip, Contact } from '@/components/TripContext';
import { useColors } from '@/hooks/useColors';

export default function ContactsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { contacts, addContact, updateContact, removeContact } = useTrip();
  const [editing, setEditing] = useState<Contact | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const openForm = (contact?: Contact) => {
    setEditing(contact ?? null);
    setName(contact?.name ?? '');
    setPhone(contact?.phone ?? '');
    setEmail(contact?.email ?? '');
    setAdding(true);
  };

  const save = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Required fields', 'Name and phone number are required.');
      return;
    }
    if (editing) await updateContact({ ...editing, name: name.trim(), phone: phone.trim(), email: email.trim() });
    else await addContact({ name: name.trim(), phone: phone.trim(), email: email.trim() });
    setAdding(false);
  };

  const priorityLabel = (idx: number) =>
    idx === 0 ? 'PRIMARY' : idx === 1 ? 'SECONDARY' : `#${idx + 1}`;
  const priorityColor = (idx: number) =>
    idx === 0 ? colors.brandBlue : idx === 1 ? colors.warning : colors.text3;

  return (
    <AppBackground fadeStrength="default">
    <ScrollView
      style={[styles.container, { backgroundColor: 'transparent' }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 110 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.text1 }]}>Contacts</Text>
          <Text style={[styles.screenSub, { color: colors.text3 }]}>Your emergency response circle</Text>
        </View>
        {!adding && (
          <IconButton
            icon="plus"
            onPress={() => openForm()}
            variant="primary"
          />
        )}
      </View>

      {/* ── Info banner ── */}
      {contacts.length > 0 && !adding && (
        <View style={[styles.infoBanner, { backgroundColor: '#F0FBF5', borderColor: colors.safeBorder }]}>
          <Feather name="shield" size={15} color={colors.safe} />
          <Text style={[styles.infoText, { color: colors.safe }]}>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} will be notified in an emergency
          </Text>
        </View>
      )}

      {/* ── Add / Edit Form ── */}
      {adding && (
        <GlassCard style={styles.form}>
          <View style={styles.formHeader}>
            <View style={[styles.formIconWrap, { backgroundColor: colors.brandBlueSubtle }]}>
              <Feather name="user-plus" size={20} color={colors.brandBlue} />
            </View>
            <View>
              <Text style={[styles.formTitle, { color: colors.text1 }]}>
                {editing ? 'Edit Contact' : 'Add Emergency Contact'}
              </Text>
              <Text style={[styles.formSub, { color: colors.text3 }]}>
                They'll be alerted if you can't respond
              </Text>
            </View>
          </View>

          <Field label="Full Name" value={name} onChangeText={setName} placeholder="e.g. Priya Sharma" colors={colors} />
          <Field label="Phone Number" value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" colors={colors} />
          <Field label="Email (optional)" value={email} onChangeText={setEmail} placeholder="priya@example.com" keyboardType="email-address" colors={colors} />

          <View style={styles.formActions}>
            <PrimaryButton variant="ghost" onPress={() => setAdding(false)} style={styles.formBtn}>
              Cancel
            </PrimaryButton>
            <PrimaryButton icon="check" onPress={() => void save()} style={styles.formBtn}>
              Save Contact
            </PrimaryButton>
          </View>
        </GlassCard>
      )}

      {/* ── Contact Cards ── */}
      {!adding && contacts.length > 0 && (
        <View style={styles.contactList}>
          {contacts.map((contact, idx) => (
            <GlassCard key={contact.id} style={styles.contactCard}>
              {/* Priority badge */}
              <View style={[styles.priorityBadge, { backgroundColor: priorityColor(idx) + '18' }]}>
                <Text style={[styles.priorityText, { color: priorityColor(idx) }]}>
                  {priorityLabel(idx)}
                </Text>
              </View>

              <View style={styles.contactBody}>
                {/*
                  Avatar — the Contact model has no gender field, so we use a
                  neutral person icon for everyone. Do not infer gender from
                  the name. If a gender field is added later, this is the
                  place to branch on it.
                */}
                <View style={[styles.avatar, { backgroundColor: priorityColor(idx) + '20' }]}>
                  <Feather name="user" size={24} color={priorityColor(idx)} />
                </View>

                {/* Info */}
                <View style={styles.contactInfo}>
                  <Text style={[styles.contactName, { color: colors.text1 }]}>{contact.name}</Text>
                  <Text style={[styles.contactPhone, { color: colors.text3 }]}>{contact.phone}</Text>
                  {contact.email ? (
                    <Text style={[styles.contactEmail, { color: colors.text4 }]}>{contact.email}</Text>
                  ) : null}
                </View>

                {/* Actions */}
                <View style={styles.contactActions}>
                  <Pressable
                    onPress={() => openForm(contact)}
                    style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                  >
                    <Feather name="edit-2" size={15} color={colors.text2} />
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        'Remove contact?',
                        `${contact.name} won't receive emergency alerts anymore.`,
                        [
                          { text: 'Keep', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => void removeContact(contact.id) },
                        ]
                      )
                    }
                    style={[styles.actionBtn, { backgroundColor: '#FFF0F0' }]}
                  >
                    <Feather name="trash-2" size={15} color={colors.destructive} />
                  </Pressable>
                </View>
              </View>

              {/* Status */}
              <View style={[styles.readyBadge, { backgroundColor: '#F0FBF5', borderColor: colors.safeBorder }]}>
                <View style={[styles.readyDot, { backgroundColor: colors.safe }]} />
                <Text style={[styles.readyText, { color: colors.safe }]}>Ready to receive alerts</Text>
              </View>
            </GlassCard>
          ))}

          <PrimaryButton icon="plus" variant="secondary" onPress={() => openForm()}>
            Add Another Contact
          </PrimaryButton>
        </View>
      )}

      {/* ── Empty state ── */}
      {!adding && contacts.length === 0 && (
        <View style={styles.emptySection}>
          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            <Mascot size={140} pose="heart" />
          </View>
          <EmptyState
            icon="users"
            title="No contacts yet"
            body="Add at least one trusted person so Cognisafe-Q knows who to reach in an emergency."
          />
          <PrimaryButton icon="plus" onPress={() => openForm()} style={{ marginTop: 4 }}>
            Add Emergency Contact
          </PrimaryButton>
        </View>
      )}
    </ScrollView>
    </AppBackground>
  );
}

function Field({
  label,
  colors,
  ...props
}: { label: string; colors: ReturnType<typeof useColors> } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text3 }]}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.text4}
        style={[
          styles.input,
          { backgroundColor: 'transparent', borderColor: colors.input, color: colors.text1 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  screenTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  screenSub: { fontSize: 13, marginTop: 2 },

  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, borderWidth: 1.5, padding: 12 },
  infoText: { fontSize: 13, fontWeight: '600', flex: 1 },

  // Form
  form: { padding: 20, gap: 14 },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  formIconWrap: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  formTitle: { fontSize: 17, fontWeight: '700' },
  formSub: { fontSize: 12, marginTop: 2 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  formBtn: { flex: 1 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  input: { minHeight: 52, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, fontSize: 15 },

  // Contact cards
  contactList: { gap: 12 },
  contactCard: { padding: 18, gap: 14 },
  priorityBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  priorityText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  contactBody: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '800' },
  contactInfo: { flex: 1, gap: 2 },
  contactName: { fontSize: 17, fontWeight: '700' },
  contactPhone: { fontSize: 14 },
  contactEmail: { fontSize: 12 },
  contactActions: { gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  readyBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10, borderWidth: 1, padding: 9 },
  readyDot: { width: 7, height: 7, borderRadius: 3.5 },
  readyText: { fontSize: 12, fontWeight: '600' },

  emptySection: { gap: 14 },
});