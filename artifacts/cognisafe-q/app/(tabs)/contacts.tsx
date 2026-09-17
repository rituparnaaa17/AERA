import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, PrimaryButton, ScreenHeader } from '@/components/AppPrimitives';
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
      Alert.alert('Add a little more', 'A name and phone number are required.');
      return;
    }
    if (editing) await updateContact({ ...editing, name: name.trim(), phone: phone.trim(), email: email.trim() });
    else await addContact({ name: name.trim(), phone: phone.trim(), email: email.trim() });
    setAdding(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 110 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow="Your response circle"
        title="Contacts"
        action={
          !adding ? (
            <Pressable onPress={() => openForm()} style={[styles.iconButton, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={21} color={colors.primaryForeground} />
            </Pressable>
          ) : null
        }
      />
      {adding ? (
        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>{editing ? 'Edit contact' : 'Add trusted contact'}</Text>
          <Text style={[styles.formBody, { color: colors.mutedForeground }]}>They’ll be notified if you can’t respond to an alert.</Text>
          <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Priya Sharma" colors={colors} />
          <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" colors={colors} />
          <Field label="Email (optional)" value={email} onChangeText={setEmail} placeholder="priya@example.com" keyboardType="email-address" colors={colors} />
          <View style={styles.formActions}>
            <PrimaryButton variant="ghost" onPress={() => setAdding(false)} style={styles.formAction}>Cancel</PrimaryButton>
            <PrimaryButton icon="check" onPress={() => void save()} style={styles.formAction}>Save contact</PrimaryButton>
          </View>
        </View>
      ) : contacts.length ? (
        <View style={styles.list}>
          {contacts.map((contact) => (
            <View key={contact.id} style={[styles.contactRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>{contact.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.contactCopy}>
                <Text style={[styles.contactName, { color: colors.foreground }]}>{contact.name}</Text>
                <Text style={[styles.contactDetails, { color: colors.mutedForeground }]}>{contact.phone}</Text>
                {contact.email ? <Text style={[styles.contactDetails, { color: colors.mutedForeground }]}>{contact.email}</Text> : null}
              </View>
              <View style={styles.contactActions}>
                <Pressable onPress={() => openForm(contact)} hitSlop={10}><Feather name="edit-2" size={17} color={colors.mutedForeground} /></Pressable>
                <Pressable onPress={() => Alert.alert('Remove contact?', `${contact.name} won’t receive emergency alerts anymore.`, [{ text: 'Keep', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void removeContact(contact.id) }])} hitSlop={10}><Feather name="trash-2" size={17} color={colors.mutedForeground} /></Pressable>
              </View>
            </View>
          ))}
          <PrimaryButton icon="plus" variant="secondary" onPress={() => openForm()}>Add another contact</PrimaryButton>
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <EmptyState icon="users" title="Build your response circle" body="Add at least one trusted person so Cognisafe-Q knows who to reach." />
          <PrimaryButton icon="plus" onPress={() => openForm()} style={styles.emptyButton}>Add first contact</PrimaryButton>
        </View>
      )}
    </ScrollView>
  );
}

function Field({
  label,
  colors,
  ...props
}: { label: string; colors: ReturnType<typeof useColors> } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput {...props} placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.input, color: colors.foreground }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  iconButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  list: { gap: 10 },
  contactRow: { borderWidth: 1, borderRadius: 20, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  contactCopy: { flex: 1 },
  contactName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  contactDetails: { fontSize: 12, lineHeight: 17 },
  contactActions: { gap: 17, paddingLeft: 4 },
  form: { borderRadius: 22, borderWidth: 1, padding: 18 },
  formTitle: { fontSize: 20, fontWeight: '700', marginBottom: 7 },
  formBody: { fontSize: 13, lineHeight: 19, marginBottom: 20 },
  field: { marginBottom: 15 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 5 },
  formAction: { flex: 1 },
  emptyWrap: { gap: 14 },
  emptyButton: { marginTop: 0 },
});