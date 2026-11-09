import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Text, View } from '@/components/Themed';
import { useAuth } from '@/components/AuthProvider';
import { requestPasswordReset } from '@/constants/marketplaceApi';

export default function AccountScreen() {
  const { user, loading, error: sessionError, signIn, signInAdminGate, signOut } = useAuth();
  const [adminMode, setAdminMode] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [awaitingMfa, setAwaitingMfa] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    if (adminMode && !username.trim()) {
      setFormError('Enter your administrator username.');
      return;
    }
    if (!adminMode
      && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginIdentifier.trim())
      && !/^[A-Za-z0-9._-]{3,120}$/.test(loginIdentifier.trim())) {
      setFormError('Enter a valid email address or username.');
      return;
    }
    if (!password) {
      setFormError('Enter your password.');
      return;
    }
    if (awaitingMfa && !mfaCode.trim()) {
      setFormError('Enter your authenticator code.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      if (adminMode) {
        await signInAdminGate(username, password);
      } else {
        const result = await signIn(loginIdentifier, password, rememberMe, awaitingMfa ? mfaCode : undefined);
        if (result.mfaRequired) {
          setAwaitingMfa(true);
          setFormError(null);
          return;
        }
      }
      setPassword('');
      setMfaCode('');
      setAwaitingMfa(false);
    } catch (requestError: unknown) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : 'Sign-in could not be completed.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    setFormError(null);
    try {
      await signOut();
      setPassword('');
      setMfaCode('');
      setAwaitingMfa(false);
    } catch (requestError: unknown) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : 'Sign-out could not be completed.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail.trim())) {
      setFormError('Enter a valid email address.');
      setRecoveryMessage(null);
      return;
    }
    setRecoveryBusy(true);
    setRecoveryMessage(null);
    setFormError(null);
    try {
      setRecoveryMessage(await requestPasswordReset(recoveryEmail));
    } catch (requestError: unknown) {
      setFormError(
        requestError instanceof Error
          ? requestError.message
          : 'Password recovery could not be requested.',
      );
    } finally {
      setRecoveryBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>MAKAZI GO</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {user ? 'Your account' : adminMode ? 'Administrator access' : 'Welcome back'}
        </Text>

        {loading && !user ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#087f5b" size="large" />
            <Text style={styles.bodyText}>Checking your session…</Text>
          </View>
        ) : user ? (
          <View style={styles.card}>
            <Text style={styles.name}>
              {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Makazi Go account'}
            </Text>
            <Text style={styles.bodyText}>Signed in as {user.roles.join(', ') || 'account'}</Text>
            {user.isSubAgent ? (
              <Text style={styles.bodyText}>Sub-agent access follows your assigned permissions.</Text>
            ) : null}

            <Link href="/messages" asChild>
              <Pressable accessibilityRole="button" style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Secure inbox</Text>
              </Pressable>
            </Link>
            <Link href="/notifications" asChild>
              <Pressable accessibilityRole="button" style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Notifications</Text>
              </Pressable>
            </Link>

            {user.roles.includes('agent') ? (
              <Link href="/(tabs)/agent" asChild>
                <Pressable accessibilityRole="button" style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Open agent workspace</Text>
                </Pressable>
              </Link>
            ) : null}

            {user.roles.includes('tenant') ? (
              <>
                <Link href="/tenant-profile" asChild>
                  <Pressable accessibilityRole="button" style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Your profile</Text>
                  </Pressable>
                </Link>
                <Link href="/account-settings" asChild>
                  <Pressable accessibilityRole="button" style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Account settings</Text>
                  </Pressable>
                </Link>
                <Link href="/search-alerts" asChild>
                  <Pressable accessibilityRole="button" style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Search alerts</Text>
                  </Pressable>
                </Link>
                <Link href="/saved" asChild>
                  <Pressable accessibilityRole="button" style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Saved properties</Text>
                  </Pressable>
                </Link>
                <Link href="/bookings" asChild>
                  <Pressable accessibilityRole="button" style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Your bookings</Text>
                  </Pressable>
                </Link>
                <Link href="/reviews" asChild>
                  <Pressable accessibilityRole="button" style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Review completed stays</Text>
                  </Pressable>
                </Link>
              </>
            ) : null}

            {!user.roles.includes('tenant') ? (
              <Link href="/account-settings" asChild>
                <Pressable accessibilityRole="button" style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Account settings</Text>
                </Pressable>
              </Link>
            ) : null}

            {user.roles.includes('administrator') ? (
              <Link href="/(tabs)/admin" asChild>
                <Pressable accessibilityRole="button" style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Open admin workspace</Text>
                </Pressable>
              </Link>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={handleSignOut}
              style={[styles.secondaryButton, busy && styles.disabled]}>
              <Text style={styles.secondaryButtonText}>{busy ? 'Signing out…' : 'Sign out'}</Text>
            </Pressable>
            {formError ? <Text accessibilityRole="alert" style={styles.errorText}>{formError}</Text> : null}
          </View>
        ) : (
          <View style={styles.card}>
            {sessionError ? (
              <View accessibilityRole="alert" style={styles.notice}>
                <Text style={styles.noticeText}>{sessionError}</Text>
              </View>
            ) : null}

            {adminMode ? (
              <>
                <Text style={styles.bodyText}>
                  Use the protected founder-console credentials configured for this StayNest environment.
                </Text>
                <TextInput
                  accessibilityLabel="Administrator username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setUsername}
                  placeholder="Administrator username"
                  placeholderTextColor="#52655a"
                  style={styles.input}
                  value={username}
                />
              </>
            ) : !recoveryOpen ? (
              <>
                <TextInput
                  accessibilityLabel="Email or username"
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  onChangeText={setLoginIdentifier}
                  placeholder="Email or username"
                  placeholderTextColor="#52655a"
                  style={styles.input}
                  textContentType="username"
                  value={loginIdentifier}
                />
              </>
            ) : null}
            {!recoveryOpen ? (
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoComplete={adminMode ? 'off' : 'current-password'}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#52655a"
                secureTextEntry
                style={styles.input}
                textContentType="password"
                value={password}
              />
            ) : null}

            {awaitingMfa && !adminMode && !recoveryOpen ? (
              <TextInput
                accessibilityLabel="Authenticator code"
                autoCapitalize="none"
                autoComplete="one-time-code"
                keyboardType="number-pad"
                maxLength={8}
                onChangeText={setMfaCode}
                placeholder="Authenticator code"
                placeholderTextColor="#52655a"
                style={styles.input}
                textContentType="oneTimeCode"
                value={mfaCode}
              />
            ) : null}

            {!adminMode && !recoveryOpen ? (
              <View style={styles.rememberRow}>
                <Text style={styles.rememberText}>Keep me signed in</Text>
                <Switch
                  accessibilityLabel="Keep me signed in"
                  onValueChange={setRememberMe}
                  trackColor={{ false: '#cbd5ce', true: '#8ac5a5' }}
                  value={rememberMe}
                />
              </View>
            ) : null}

            {recoveryOpen ? (
              <View style={styles.recoveryPanel}>
                <Text style={styles.recoveryTitle}>Reset your password</Text>
                <Text style={styles.bodyText}>
                  Enter your email address and we’ll send recovery instructions if an account matches.
                </Text>
                <TextInput
                  accessibilityLabel="Recovery email address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={setRecoveryEmail}
                  placeholder="Email address"
                  placeholderTextColor="#52655a"
                  style={styles.input}
                  textContentType="emailAddress"
                  value={recoveryEmail}
                />
                {recoveryMessage ? (
                  <Text accessibilityRole="status" style={styles.successText}>
                    {recoveryMessage}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {formError ? <Text accessibilityRole="alert" style={styles.errorText}>{formError}</Text> : null}

            {recoveryOpen ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  disabled={recoveryBusy}
                  onPress={handlePasswordReset}
                  style={[styles.primaryButton, recoveryBusy && styles.disabled]}>
                  <Text style={styles.primaryButtonText}>
                    {recoveryBusy ? 'Sending…' : 'Send recovery instructions'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setRecoveryOpen(false);
                    setRecoveryMessage(null);
                    setFormError(null);
                  }}
                  style={styles.modeButton}>
                  <Text style={styles.modeButtonText}>Back to sign in</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={submit}
                style={[styles.primaryButton, busy && styles.disabled]}>
                <Text style={styles.primaryButtonText}>
                  {busy
                    ? 'Connecting…'
                    : awaitingMfa && !adminMode
                      ? 'Verify and sign in'
                      : adminMode
                        ? 'Sign in to admin'
                        : 'Sign in'}
                </Text>
              </Pressable>
            )}

            {!adminMode && !recoveryOpen ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setRecoveryEmail(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginIdentifier.trim())
                      ? loginIdentifier.trim()
                      : '');
                    setRecoveryOpen(true);
                    setRecoveryMessage(null);
                    setFormError(null);
                  }}
                  style={styles.modeButton}>
                  <Text style={styles.modeButtonText}>Forgot password?</Text>
                </Pressable>
                <View style={styles.signupRow}>
                  <Text style={styles.bodyText}>New to Makazi Go?</Text>
                  <Link href="/signup" asChild>
                    <Pressable accessibilityRole="button" style={styles.signupLink}>
                      <Text style={styles.modeButtonText}>Create an account</Text>
                    </Pressable>
                  </Link>
                </View>
              </>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAdminMode((current) => !current);
                setFormError(null);
                setPassword('');
                setAwaitingMfa(false);
                setMfaCode('');
                setRecoveryOpen(false);
                setRecoveryMessage(null);
              }}
              style={styles.modeButton}>
              <Text style={styles.modeButtonText}>
                {adminMode ? 'Sign in with email or username' : 'Founder console access'}
              </Text>
            </Pressable>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7f5',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },
  eyebrow: {
    color: '#087f5b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 8,
    marginBottom: 20,
    color: '#173222',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  card: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dce8df',
    backgroundColor: '#ffffff',
  },
  loading: {
    alignItems: 'center',
    padding: 30,
  },
  name: {
    color: '#173222',
    fontSize: 20,
    fontWeight: '800',
  },
  bodyText: {
    marginTop: 8,
    color: '#53665b',
    fontSize: 14,
    lineHeight: 21,
  },
  notice: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff8e8',
  },
  noticeText: {
    color: '#705714',
    fontSize: 13,
    lineHeight: 19,
  },
  input: {
    minHeight: 49,
    marginTop: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce8df',
    color: '#173222',
    backgroundColor: '#fbfdfb',
    fontSize: 15,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  rememberText: {
    color: '#53665b',
    fontSize: 14,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: '#087f5b',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce8df',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#173222',
    fontSize: 14,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
  modeButton: {
    alignSelf: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
  modeButtonText: {
    color: '#086747',
    fontSize: 14,
    fontWeight: '700',
  },
  recoveryPanel: {
    marginTop: 6,
  },
  recoveryTitle: {
    marginTop: 8,
    color: '#173222',
    fontSize: 18,
    fontWeight: '800',
  },
  successText: {
    marginTop: 12,
    color: '#155b3c',
    fontSize: 14,
    lineHeight: 21,
  },
  signupRow: {
    alignItems: 'center',
    marginTop: 12,
  },
  signupLink: {
    paddingVertical: 6,
  },
  errorText: {
    marginTop: 12,
    color: '#9a3024',
    fontSize: 13,
    lineHeight: 19,
  },
});
