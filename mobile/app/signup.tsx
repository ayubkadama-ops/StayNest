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
import {
  registerAccount,
  type RegistrationInput,
  type RegistrationResult,
} from '@/constants/marketplaceApi';

type RegistrationForm = RegistrationInput & { confirmPassword: string };
type TextField = Exclude<keyof RegistrationForm, 'role' | 'rememberMe'>;

const steps = ['Account type', 'Contact details', 'Secure your account'];

export default function SignupScreen() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RegistrationForm>({
    role: 'tenant',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    agencyName: '',
    bio: '',
    password: '',
    confirmPassword: '',
    rememberMe: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegistrationResult | null>(null);

  const updateText = (field: TextField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 0) {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        setError('Enter your first and last name to continue.');
        return false;
      }
      return true;
    }

    if (currentStep === 1) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        setError('Enter a valid email address.');
        return false;
      }
      if (!/^\+?[0-9][0-9\s().-]{6,24}$/.test(form.phone.trim())) {
        setError('Enter a valid phone number.');
        return false;
      }
      if (!form.city.trim()) {
        setError('Enter your city or region.');
        return false;
      }
      return true;
    }

    const passwordTypes = [
      /[a-z]/.test(form.password),
      /[A-Z]/.test(form.password),
      /\d/.test(form.password),
      /[^A-Za-z0-9]/.test(form.password),
    ].filter(Boolean).length;
    if (form.password.length < 12 || form.password.length > 200 || passwordTypes < 3) {
      setError('Use at least 12 characters with at least three character types: lowercase, uppercase, number, or symbol.');
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const goForward = () => {
    if (!validateStep(step)) return;
    setError(null);
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const submit = async () => {
    if (!validateStep(2)) return;
    setBusy(true);
    setError(null);
    try {
      const { confirmPassword: _confirmPassword, ...input } = form;
      setResult(await registerAccount(input));
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Your account could not be created.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Link href="/account" asChild>
          <Pressable accessibilityRole="button" style={styles.backLink}>
            <Text style={styles.backLinkText}>‹ Back to sign in</Text>
          </Pressable>
        </Link>
        <Text style={styles.eyebrow}>MAKAZI GO · TANZANIA</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {result
            ? result.pendingApproval
              ? 'Application received'
              : 'Account created'
            : 'Create your account'}
        </Text>

        {result ? (
          <View style={styles.card}>
            <Text style={styles.resultTitle}>
              {result.pendingApproval
                ? 'Your agent profile is under review.'
                : 'Your account is ready for sign in.'}
            </Text>
            <Text style={styles.bodyText}>
              {result.pendingApproval
                ? result.message || 'You can sign in after an administrator approves your agent account.'
                : result.emailVerificationSent
                  ? 'Check your email and verify your address before signing in.'
                  : 'Your account was created, but we could not send the verification email. Contact support before signing in.'}
            </Text>
            {result.approvalContact ? (
              <Text style={styles.bodyText}>
                Need an update? Contact {result.approvalContact.displayPhone || result.approvalContact.email || 'Makazi Go support'}.
              </Text>
            ) : null}
            <Link href="/account" asChild>
              <Pressable accessibilityRole="button" style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Continue to sign in</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <View style={styles.card}>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 1, max: steps.length, now: step + 1 }}
              style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${((step + 1) / steps.length) * 100}%` }]} />
            </View>
            <Text style={styles.stepLabel}>
              Step {step + 1} of {steps.length} · {steps[step]}
            </Text>

            {step === 0 ? (
              <>
                <Text style={styles.fieldLabel}>I’m here as a</Text>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: form.role === 'tenant' }}
                  onPress={() => setForm((current) => ({ ...current, role: 'tenant' }))}
                  style={[styles.roleOption, form.role === 'tenant' && styles.roleOptionSelected]}>
                  <Text style={styles.roleTitle}>Tenant</Text>
                  <Text style={styles.roleDescription}>
                    Find a place, request a stay, and contact agents.
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: form.role === 'agent' }}
                  onPress={() => setForm((current) => ({ ...current, role: 'agent' }))}
                  style={[styles.roleOption, form.role === 'agent' && styles.roleOptionSelected]}>
                  <Text style={styles.roleTitle}>Property agent</Text>
                  <Text style={styles.roleDescription}>
                    Share listings and respond to customer enquiries.
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: form.role === 'property_owner' }}
                  onPress={() => setForm((current) => ({ ...current, role: 'property_owner' }))}
                  style={[styles.roleOption, form.role === 'property_owner' && styles.roleOptionSelected]}>
                  <Text style={styles.roleTitle}>Property owner</Text>
                  <Text style={styles.roleDescription}>
                    Advertise your own property and manage enquiries.
                  </Text>
                </Pressable>
                <View style={styles.nameFields}>
                  <View style={styles.nameField}>
                    <Text style={styles.fieldLabel}>First name</Text>
                    <TextInput
                      accessibilityLabel="First name"
                      autoComplete="given-name"
                      autoCorrect={false}
                      maxLength={80}
                      onChangeText={(value) => updateText('firstName', value)}
                      placeholder="First name"
                      placeholderTextColor="#52655a"
                      style={styles.input}
                      value={form.firstName}
                    />
                  </View>
                  <View style={styles.nameField}>
                    <Text style={styles.fieldLabel}>Last name</Text>
                    <TextInput
                      accessibilityLabel="Last name"
                      autoComplete="family-name"
                      autoCorrect={false}
                      maxLength={80}
                      onChangeText={(value) => updateText('lastName', value)}
                      placeholder="Last name"
                      placeholderTextColor="#52655a"
                      style={styles.input}
                      value={form.lastName}
                    />
                  </View>
                </View>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <Text style={styles.fieldLabel}>Email address</Text>
                <TextInput
                  accessibilityLabel="Email address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  maxLength={254}
                  onChangeText={(value) => updateText('email', value)}
                  placeholder="you@example.com"
                  placeholderTextColor="#52655a"
                  style={styles.input}
                  textContentType="emailAddress"
                  value={form.email}
                />
                <Text style={styles.fieldLabel}>Phone number</Text>
                <TextInput
                  accessibilityLabel="Phone number"
                  autoComplete="tel"
                  keyboardType="phone-pad"
                  maxLength={32}
                  onChangeText={(value) => updateText('phone', value)}
                  placeholder="+255 700 000 000"
                  placeholderTextColor="#52655a"
                  style={styles.input}
                  textContentType="telephoneNumber"
                  value={form.phone}
                />
                <Text style={styles.fieldLabel}>City or region</Text>
                <TextInput
                  accessibilityLabel="City or region"
                  maxLength={100}
                  onChangeText={(value) => updateText('city', value)}
                  placeholder="Dar es Salaam"
                  placeholderTextColor="#52655a"
                  style={styles.input}
                  value={form.city}
                />
                {form.role === 'agent' ? (
                  <>
                    <Text style={styles.fieldLabel}>Agency or business name (optional)</Text>
                    <TextInput
                      accessibilityLabel="Agency or business name"
                      maxLength={160}
                      onChangeText={(value) => updateText('agencyName', value)}
                      placeholder="Agency or business name"
                      placeholderTextColor="#52655a"
                      style={styles.input}
                      value={form.agencyName}
                    />
                    <Text style={styles.fieldLabel}>Professional introduction (optional)</Text>
                    <TextInput
                      accessibilityLabel="Professional introduction"
                      maxLength={5000}
                      multiline
                      onChangeText={(value) => updateText('bio', value)}
                      placeholder="Tell customers about your local expertise"
                      placeholderTextColor="#52655a"
                      style={[styles.input, styles.multilineInput]}
                      textAlignVertical="top"
                      value={form.bio}
                    />
                  </>
                ) : null}
              </>
            ) : null}

            {step === 2 ? (
              <>
                <View style={styles.summary}>
                  <Text style={styles.summaryTitle}>
                    {[form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' ') || 'Your account'}
                  </Text>
                  <Text style={styles.bodyText}>
                    {form.role === 'agent' ? 'Property agent' : form.role === 'property_owner' ? 'Property owner' : 'Tenant'} · {form.city.trim()}
                  </Text>
                </View>
                <Text style={styles.fieldLabel}>Password</Text>
                <TextInput
                  accessibilityLabel="Password"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  onChangeText={(value) => updateText('password', value)}
                  placeholder="At least 12 characters"
                  placeholderTextColor="#52655a"
                  secureTextEntry
                  style={styles.input}
                  textContentType="newPassword"
                  value={form.password}
                />
                <Text style={styles.passwordHint}>
                  Use at least 12 characters and three character types.
                </Text>
                <Text style={styles.fieldLabel}>Confirm password</Text>
                <TextInput
                  accessibilityLabel="Confirm password"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  onChangeText={(value) => updateText('confirmPassword', value)}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#52655a"
                  secureTextEntry
                  style={styles.input}
                  textContentType="newPassword"
                  value={form.confirmPassword}
                />
                <View style={styles.rememberRow}>
                  <Text style={styles.fieldLabel}>Keep me signed in</Text>
                  <Switch
                    accessibilityLabel="Keep me signed in"
                    onValueChange={(rememberMe) => setForm((current) => ({ ...current, rememberMe }))}
                    trackColor={{ false: '#aebdb4', true: '#4e9a73' }}
                    value={form.rememberMe}
                  />
                </View>
              </>
            ) : null}

            {error ? (
              <Text accessibilityRole="alert" style={styles.errorText}>
                {error}
              </Text>
            ) : null}

            <View style={styles.actions}>
              {step > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => {
                    setError(null);
                    setStep((current) => current - 1);
                  }}
                  style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </Pressable>
              ) : null}
              {step < steps.length - 1 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={goForward}
                  style={[styles.primaryButton, step > 0 && styles.actionButton]}>
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={submit}
                  style={[styles.primaryButton, busy && styles.disabled, styles.actionButton]}>
                  {busy ? <ActivityIndicator color="#ffffff" /> : null}
                  <Text style={styles.primaryButtonText}>
                    {busy ? 'Creating account…' : 'Create account'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f7f4',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  backLink: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backLinkText: {
    color: '#07583d',
    fontSize: 14,
    fontWeight: '700',
  },
  eyebrow: {
    marginTop: 16,
    color: '#07583d',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    marginTop: 8,
    marginBottom: 20,
    color: '#102b20',
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '800',
  },
  card: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#cbd8cf',
    backgroundColor: '#ffffff',
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: '#dce6e0',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#087f5b',
  },
  stepLabel: {
    marginTop: 12,
    marginBottom: 16,
    color: '#354b40',
    fontSize: 13,
    fontWeight: '700',
  },
  fieldLabel: {
    marginTop: 10,
    marginBottom: 5,
    color: '#173222',
    fontSize: 14,
    fontWeight: '700',
  },
  roleOption: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#aebdb4',
    backgroundColor: '#ffffff',
  },
  roleOptionSelected: {
    borderColor: '#087f5b',
    backgroundColor: '#e8f3ec',
  },
  roleTitle: {
    color: '#102b20',
    fontSize: 15,
    fontWeight: '800',
  },
  roleDescription: {
    marginTop: 4,
    color: '#354b40',
    fontSize: 13,
    lineHeight: 19,
  },
  nameFields: {
    flexDirection: 'row',
    gap: 10,
  },
  nameField: {
    flex: 1,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#879b8e',
    color: '#102b20',
    backgroundColor: '#ffffff',
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 92,
    paddingTop: 12,
  },
  passwordHint: {
    marginTop: 6,
    color: '#354b40',
    fontSize: 12,
    lineHeight: 18,
  },
  summary: {
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#e8f3ec',
  },
  summaryTitle: {
    color: '#102b20',
    fontSize: 15,
    fontWeight: '800',
  },
  bodyText: {
    marginTop: 8,
    color: '#354b40',
    fontSize: 14,
    lineHeight: 21,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  errorText: {
    marginTop: 12,
    color: '#8f211a',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  actionButton: {
    flex: 1,
    marginTop: 0,
  },
  primaryButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 15,
    borderRadius: 11,
    backgroundColor: '#07583d',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#879b8e',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#173222',
    fontSize: 14,
    fontWeight: '700',
  },
  resultTitle: {
    color: '#102b20',
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
});
