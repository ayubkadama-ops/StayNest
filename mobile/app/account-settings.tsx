import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
} from 'react-native';
import { Link, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/AuthProvider';
import { Text, View } from '@/components/Themed';
import {
  changeAccountPassword,
  getNotificationPreferences,
  requestAccountDeletion,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/constants/marketplaceApi';

const preferenceOptions: { key: keyof NotificationPreferences; label: string }[] = [
  { key: 'saved_searches', label: 'New properties matching saved searches' },
  { key: 'price_drops', label: 'Price changes on saved properties' },
  { key: 'booking_updates', label: 'Booking and viewing request updates' },
  { key: 'messages', label: 'Messages from agents' },
  { key: 'followed_agents', label: 'New listings from followed agents' },
  { key: 'marketing', label: 'Makazi Go recommendations and updates' },
];

export default function AccountSettingsScreen() {
  const { user, loading: sessionLoading, refresh } = useAuth();
  const router = useRouter();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [preferencesMessage, setPreferencesMessage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [deletionPassword, setDeletionPassword] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  const [deletionSubmitting, setDeletionSubmitting] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    setPreferencesLoading(true);
    setPreferencesError(null);
    try {
      setPreferences(await getNotificationPreferences());
    } catch (requestError: unknown) {
      setPreferencesError(
        requestError instanceof Error ? requestError.message : 'Notification preferences could not be loaded.',
      );
    } finally {
      setPreferencesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (user?.roles.includes('tenant')) void loadPreferences();
    else {
      setPreferences(null);
      setPreferencesLoading(false);
    }
  }, [loadPreferences, sessionLoading, user?.id, user?.roles]);

  const savePreferences = async () => {
    if (!preferences || preferencesSaving) return;
    setPreferencesSaving(true);
    setPreferencesError(null);
    setPreferencesMessage(null);
    try {
      setPreferences(await updateNotificationPreferences(preferences));
      setPreferencesMessage('Notification preferences saved.');
    } catch (requestError: unknown) {
      setPreferencesError(
        requestError instanceof Error ? requestError.message : 'Notification preferences could not be saved.',
      );
    } finally {
      setPreferencesSaving(false);
    }
  };

  const savePassword = async () => {
    setPasswordError(null);
    if (newPassword.length < 12) {
      setPasswordError('Use at least 12 characters for your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      await changeAccountPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password updated', 'Your password was changed successfully.');
    } catch (requestError: unknown) {
      setPasswordError(
        requestError instanceof Error ? requestError.message : 'The password could not be changed.',
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const submitDeletionRequest = () => {
    setDeletionError(null);
    if (!deletionPassword) {
      setDeletionError('Enter your password to continue.');
      return;
    }
    Alert.alert(
      'Submit account deletion request?',
      'This sends a request to the Makazi Go administration team and signs you out. It does not immediately delete your account.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Submit request',
          style: 'destructive',
          onPress: () => void sendDeletionRequest(),
        },
      ],
    );
  };

  const sendDeletionRequest = async () => {
    setDeletionSubmitting(true);
    setDeletionError(null);
    try {
      await requestAccountDeletion(deletionPassword, deletionReason);
      setDeletionPassword('');
      setDeletionReason('');
      Alert.alert(
        'Request submitted',
        'Your deletion request was sent for review and you have been signed out.',
        [{
          text: 'Continue',
          onPress: () => {
            void refresh();
            router.replace('/(tabs)/account');
          },
        }],
      );
    } catch (requestError: unknown) {
      setDeletionError(
        requestError instanceof Error ? requestError.message : 'The deletion request could not be submitted.',
      );
    } finally {
      setDeletionSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Account settings', headerShown: true }} />
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>Account settings</Text>
        <Text style={styles.intro}>
          Manage your password, notification preferences, and account access.
        </Text>

        {sessionLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#087f5b" size="large" />
            <Text style={styles.intro}>Checking your session…</Text>
          </View>
        ) : !user ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in to manage account settings</Text>
            <Link href="/(tabs)/account" asChild>
              <Pressable accessibilityRole="button" style={styles.primaryButton}>
                <Text style={styles.primaryText}>Open account</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <>
            {user.roles.includes('tenant') ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Notification preferences</Text>
                <Text style={styles.intro}>
                  Choose the account notifications you want to receive.
                </Text>
                {preferencesLoading ? (
                  <ActivityIndicator color="#087f5b" style={styles.preferenceLoader} />
                ) : preferences ? (
                  <>
                    {preferenceOptions.map(({ key, label }) => (
                      <View key={key} style={styles.preferenceRow}>
                        <Text style={styles.preferenceLabel}>{label}</Text>
                        <Switch
                          accessibilityLabel={label}
                          onValueChange={(enabled) => setPreferences((current) => (
                            current ? { ...current, [key]: enabled } : current
                          ))}
                          trackColor={{ false: '#cbd5ce', true: '#8ac9a5' }}
                          value={preferences[key]}
                        />
                      </View>
                    ))}
                    <Pressable
                      accessibilityRole="button"
                      disabled={preferencesSaving}
                      onPress={() => void savePreferences()}
                      style={[styles.primaryButton, preferencesSaving && styles.disabled]}>
                      <Text style={styles.primaryText}>
                        {preferencesSaving ? 'Saving preferences…' : 'Save preferences'}
                      </Text>
                    </Pressable>
                    {preferencesMessage ? (
                      <Text accessibilityRole="status" style={styles.success}>{preferencesMessage}</Text>
                    ) : null}
                  </>
                ) : (
                  <Pressable accessibilityRole="button" onPress={() => void loadPreferences()} style={styles.secondaryButton}>
                    <Text style={styles.secondaryText}>Retry loading preferences</Text>
                  </Pressable>
                )}
                {preferencesError ? <Text accessibilityRole="alert" style={styles.error}>{preferencesError}</Text> : null}
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Change password</Text>
              <TextInput
                accessibilityLabel="Current password"
                autoComplete="current-password"
                onChangeText={setCurrentPassword}
                placeholder="Current password"
                secureTextEntry
                style={styles.input}
                value={currentPassword}
              />
              <TextInput
                accessibilityLabel="New password"
                autoComplete="new-password"
                onChangeText={setNewPassword}
                placeholder="New password (at least 12 characters)"
                secureTextEntry
                style={styles.input}
                value={newPassword}
              />
              <TextInput
                accessibilityLabel="Confirm new password"
                autoComplete="new-password"
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
              />
              {passwordError ? <Text accessibilityRole="alert" style={styles.error}>{passwordError}</Text> : null}
              <Pressable
                accessibilityRole="button"
                disabled={passwordSaving}
                onPress={() => void savePassword()}
                style={[styles.primaryButton, passwordSaving && styles.disabled]}>
                <Text style={styles.primaryText}>{passwordSaving ? 'Updating password…' : 'Update password'}</Text>
              </Pressable>
            </View>

            <View style={styles.dangerCard}>
              <Text style={styles.cardTitle}>Request account deletion</Text>
              <Text style={styles.intro}>
                Your request is reviewed by the Makazi Go team. Your account is not deleted immediately.
              </Text>
              <TextInput
                accessibilityLabel="Password to confirm deletion request"
                autoComplete="current-password"
                onChangeText={setDeletionPassword}
                placeholder="Confirm with your password"
                secureTextEntry
                style={styles.input}
                value={deletionPassword}
              />
              <TextInput
                accessibilityLabel="Optional deletion reason"
                maxLength={500}
                multiline
                onChangeText={setDeletionReason}
                placeholder="Reason (optional)"
                style={[styles.input, styles.reasonInput]}
                value={deletionReason}
              />
              {deletionError ? <Text accessibilityRole="alert" style={styles.error}>{deletionError}</Text> : null}
              <Pressable
                accessibilityRole="button"
                disabled={deletionSubmitting}
                onPress={submitDeletionRequest}
                style={[styles.dangerButton, deletionSubmitting && styles.disabled]}>
                <Text style={styles.dangerText}>
                  {deletionSubmitting ? 'Submitting request…' : 'Request account deletion'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f5' },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 36 },
  title: { marginBottom: 8, color: '#173222', fontSize: 28, lineHeight: 34, fontWeight: '800' },
  intro: { marginTop: 5, color: '#53665b', fontSize: 14, lineHeight: 21 },
  card: { marginTop: 18, padding: 17, borderRadius: 16, borderWidth: 1, borderColor: '#dce8df', backgroundColor: '#fff' },
  dangerCard: { marginTop: 18, padding: 17, borderRadius: 16, borderWidth: 1, borderColor: '#efc3c0', backgroundColor: '#fffafa' },
  cardTitle: { color: '#173222', fontSize: 18, lineHeight: 24, fontWeight: '800' },
  preferenceLoader: { marginTop: 18 },
  preferenceRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: '#edf2ee' },
  preferenceLabel: { flex: 1, color: '#344a3c', fontSize: 14, lineHeight: 20 },
  input: { minHeight: 48, marginTop: 12, paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: '#cbd9ce', backgroundColor: '#fff', color: '#173222', fontSize: 14 },
  reasonInput: { minHeight: 84, paddingTop: 12, textAlignVertical: 'top' },
  primaryButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 14, paddingHorizontal: 14, borderRadius: 11, backgroundColor: '#087f5b' },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginTop: 14, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#b8d7c2' },
  secondaryText: { color: '#176b48', fontSize: 13, fontWeight: '700' },
  dangerButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 14, paddingHorizontal: 14, borderRadius: 11, backgroundColor: '#a12622' },
  dangerText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  success: { marginTop: 10, color: '#176b48', fontSize: 13, lineHeight: 19 },
  error: { marginTop: 10, color: '#a12622', fontSize: 13, lineHeight: 19 },
  disabled: { opacity: 0.6 },
  centered: { alignItems: 'center', padding: 30 },
});
