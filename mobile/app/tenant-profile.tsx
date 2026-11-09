import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Link, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/AuthProvider';
import { Text, View } from '@/components/Themed';
import {
  getTenantProfile,
  resolveMediaUrl,
  updateTenantProfile,
  uploadTenantProfilePhoto,
  type TenantProfile,
  type TenantProfileInput,
} from '@/constants/marketplaceApi';

const supportedPhotoTypes: Record<string, string> = {
  'image/avif': 'avif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export default function TenantProfileScreen() {
  const { user, loading: sessionLoading, refresh } = useAuth();
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [failedFollowingAvatars, setFailedFollowingAvatars] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const isTenant = Boolean(user?.roles.includes('tenant'));

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTenantProfile();
      setProfile(result);
      setFirstName(result.firstName);
      setLastName(result.lastName);
      setPhone(result.phone ?? '');
      setCity(result.city ?? '');
      setBio(result.bio ?? '');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Your profile could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!isTenant) {
      setLoading(false);
      setError(null);
      return;
    }
    void loadProfile();
  }, [isTenant, loadProfile, retryKey, sessionLoading, user?.id]);

  const choosePhoto = async () => {
    setPhotoError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoError('Allow photo library access to choose a profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) {
        setPhotoError('No photo was selected.');
        return;
      }
      if (asset.fileSize !== undefined && asset.fileSize > 20 * 1024 * 1024) {
        setPhotoError('Choose an image smaller than 20 MB.');
        return;
      }
      if (asset.mimeType && !supportedPhotoTypes[asset.mimeType]) {
        setPhotoError('Choose a JPG, PNG, WebP, or AVIF image.');
        return;
      }
      setSelectedPhoto(asset);
      setAvatarFailed(false);
    } catch (requestError: unknown) {
      setPhotoError(requestError instanceof Error ? requestError.message : 'The photo picker could not be opened.');
    }
  };

  const saveProfile = async () => {
    if (saving || !profile) return;
    setSaving(true);
    setError(null);
    setProfileMessage(null);
    try {
      const input: TenantProfileInput = { firstName, lastName, phone, city, bio };
      const updated = await updateTenantProfile(input);
      setProfile((current) => current ? { ...current, ...updated } : current);
      setFirstName(updated.firstName);
      setLastName(updated.lastName);
      setPhone(updated.phone ?? '');
      setCity(updated.city ?? '');
      setBio(updated.bio ?? '');
      setProfileMessage('Profile details saved.');
      await refresh();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Profile details could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async () => {
    if (!selectedPhoto || uploading) return;
    setUploading(true);
    setPhotoError(null);
    try {
      const mimeType = selectedPhoto.mimeType || 'image/jpeg';
      const extension = selectedPhoto.fileName?.split('.').pop()
        || supportedPhotoTypes[mimeType]
        || 'jpg';
      const filename = selectedPhoto.fileName || `profile.${extension}`;
      const uploadedUrl = await uploadTenantProfilePhoto(new File(selectedPhoto.uri), filename);
      setProfile((current) => current ? { ...current, avatarUrl: uploadedUrl } : current);
      setSelectedPhoto(null);
      setAvatarFailed(false);
      await refresh();
      Alert.alert('Photo updated', 'Your profile photo was uploaded successfully.');
    } catch (requestError: unknown) {
      setPhotoError(requestError instanceof Error ? requestError.message : 'The profile photo could not be uploaded.');
    } finally {
      setUploading(false);
    }
  };

  const avatarUri = selectedPhoto?.uri
    ?? (avatarFailed ? null : resolveMediaUrl(profile?.avatarUrl ?? null, 320));
  const initials = [profile?.firstName, profile?.lastName]
    .map((name) => name?.trim().charAt(0))
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'MG';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Your profile', headerShown: true }} />
      <StatusBar style="dark" />
      {sessionLoading || loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#087f5b" size="large" />
          <Text style={styles.bodyText}>Loading your profile…</Text>
        </View>
      ) : !user || !isTenant ? (
        <View style={styles.centered}>
          <Text accessibilityRole="header" style={styles.title}>Tenant profile</Text>
          <Text style={styles.bodyText}>Sign in with a tenant account to manage this profile.</Text>
          <Link href="/(tabs)/account" asChild>
            <Pressable accessibilityRole="button" style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Open account</Text>
            </Pressable>
          </Link>
        </View>
      ) : error && !profile ? (
        <View style={styles.centered}>
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => setRetryKey((key) => key + 1)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : profile ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.profileCard}>
            {avatarUri ? (
              <Image
                accessibilityLabel="Profile photo"
                onError={() => setAvatarFailed(true)}
                source={{ uri: avatarUri }}
                style={styles.avatar}
              />
            ) : (
              <View accessibilityLabel="Profile photo placeholder" style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <Text accessibilityRole="header" style={styles.title}>
              {[profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Your profile'}
            </Text>
            <Text style={styles.bodyText}>{profile.email}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={uploading}
              onPress={() => void choosePhoto()}
              style={[styles.secondaryButton, uploading && styles.disabled]}>
              <Text style={styles.secondaryButtonText}>{selectedPhoto ? 'Choose a different photo' : 'Choose profile photo'}</Text>
            </Pressable>
            {selectedPhoto ? (
              <Pressable
                accessibilityRole="button"
                disabled={uploading}
                onPress={() => void uploadPhoto()}
                style={[styles.primaryButton, uploading && styles.disabled]}>
                <Text style={styles.primaryButtonText}>{uploading ? 'Uploading photo…' : 'Upload photo'}</Text>
              </Pressable>
            ) : null}
            {photoError ? <Text accessibilityRole="alert" style={styles.error}>{photoError}</Text> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Profile details</Text>
            <TextInput
              accessibilityLabel="First name"
              autoCapitalize="words"
              maxLength={80}
              onChangeText={setFirstName}
              placeholder="First name"
              style={styles.input}
              value={firstName}
            />
            <TextInput
              accessibilityLabel="Last name"
              autoCapitalize="words"
              maxLength={80}
              onChangeText={setLastName}
              placeholder="Last name"
              style={styles.input}
              value={lastName}
            />
            <TextInput
              accessibilityLabel="Phone number"
              autoComplete="tel"
              keyboardType="phone-pad"
              maxLength={32}
              onChangeText={setPhone}
              placeholder="Phone number"
              style={styles.input}
              value={phone}
            />
            <TextInput
              accessibilityLabel="City"
              autoCapitalize="words"
              maxLength={80}
              onChangeText={setCity}
              placeholder="City"
              style={styles.input}
              value={city}
            />
            <TextInput
              accessibilityLabel="About you"
              maxLength={5000}
              multiline
              onChangeText={setBio}
              placeholder="A little about you"
              style={[styles.input, styles.bioInput]}
              textAlignVertical="top"
              value={bio}
            />
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            {profileMessage ? <Text accessibilityRole="status" style={styles.success}>{profileMessage}</Text> : null}
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => void saveProfile()}
              style={[styles.primaryButton, saving && styles.disabled]}>
              <Text style={styles.primaryButtonText}>{saving ? 'Saving profile…' : 'Save profile details'}</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Agents you follow</Text>
            {profile.following.length ? profile.following.map((agent) => {
              const agentPhotoUrl = resolveMediaUrl(agent.profileImageUrl, 120);
              return (
                <Link key={agent.id} href={{ pathname: '/agent-profile', params: { id: String(agent.id) } }} asChild>
                  <Pressable accessibilityRole="link" style={styles.followedAgent}>
                    {agentPhotoUrl && !failedFollowingAvatars[agent.id] ? (
                      <Image
                        accessibilityLabel={`${agent.firstName} ${agent.lastName} profile photo`}
                        onError={() => setFailedFollowingAvatars((current) => ({ ...current, [agent.id]: true }))}
                        source={{ uri: agentPhotoUrl }}
                        style={styles.smallAvatar}
                      />
                    ) : (
                      <View style={styles.smallAvatarFallback}>
                        <Text style={styles.smallAvatarInitials}>
                          {[agent.firstName, agent.lastName].map((name) => name.charAt(0)).join('').toUpperCase() || 'A'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.agentCopy}>
                      <Text style={styles.agentName}>
                        {[agent.firstName, agent.lastName].filter(Boolean).join(' ') || 'Makazi Go agent'}
                      </Text>
                      <Text style={styles.agentMeta}>
                        {agent.followers} followers{agent.badgeLabel ? ` · ${agent.badgeLabel}` : ''}
                      </Text>
                      {agent.bio ? <Text numberOfLines={2} style={styles.agentBio}>{agent.bio}</Text> : null}
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                </Link>
              );
            }) : (
              <Text style={styles.bodyText}>You are not following any agents yet. Visit an agent profile from a listing to follow them.</Text>
            )}
          </View>

          <View style={styles.quickLinks}>
            <Link href="/saved" asChild>
              <Pressable accessibilityRole="button" style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Saved properties</Text>
              </Pressable>
            </Link>
            <Link href="/bookings" asChild>
              <Pressable accessibilityRole="button" style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Your bookings</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f5' },
  content: { padding: 18, paddingBottom: 36, gap: 14 },
  profileCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dce8df',
    backgroundColor: '#fff',
    gap: 8,
  },
  card: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dce8df',
    backgroundColor: '#fff',
    gap: 4,
  },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#e8f3ec' },
  avatarFallback: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 48,
    backgroundColor: '#e8f3ec',
  },
  avatarInitials: { color: '#087f5b', fontSize: 28, fontWeight: '800' },
  title: { marginTop: 4, color: '#173222', fontSize: 24, lineHeight: 30, fontWeight: '800' },
  sectionTitle: { marginBottom: 6, color: '#173222', fontSize: 19, fontWeight: '800' },
  bodyText: { color: '#53665b', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  input: {
    minHeight: 48,
    marginTop: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#dce8df',
    borderRadius: 11,
    color: '#173222',
    backgroundColor: '#fbfdfb',
    fontSize: 15,
  },
  bioInput: { minHeight: 112 },
  primaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 15,
    borderRadius: 11,
    backgroundColor: '#087f5b',
  },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#dce8df',
    backgroundColor: '#fff',
  },
  secondaryButtonText: { color: '#173222', fontSize: 14, fontWeight: '700' },
  followedAgent: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  smallAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e8f3ec' },
  smallAvatarFallback: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#e8f3ec',
  },
  smallAvatarInitials: { color: '#087f5b', fontSize: 14, fontWeight: '800' },
  agentCopy: { flex: 1, gap: 3 },
  agentName: { color: '#173222', fontSize: 15, fontWeight: '800' },
  agentMeta: { color: '#53665b', fontSize: 12 },
  agentBio: { color: '#53665b', fontSize: 12, lineHeight: 17 },
  chevron: { color: '#087f5b', fontSize: 24, fontWeight: '700' },
  quickLinks: { gap: 2 },
  error: { marginTop: 7, color: '#9e2929', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  success: { marginTop: 7, color: '#087f5b', fontSize: 13, lineHeight: 19 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  disabled: { opacity: 0.6 },
});
