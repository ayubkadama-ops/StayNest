import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/AuthProvider';
import { Text, View } from '@/components/Themed';
import {
  getPublicAgentProfile,
  replyToAgentReview,
  reportAgentReview,
  resolveMediaUrl,
  type PublicAgentProfile,
} from '@/constants/marketplaceApi';

export default function AgentProfileScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicAgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    if (!id) {
      setError('Choose an agent profile to view.');
      setLoading(false);
      return () => { active = false; };
    }
    void getPublicAgentProfile(id)
      .then((result) => { if (active) setProfile(result); })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Agent profile could not be loaded.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, retryKey]);

  const report = (reviewId: number) => {
    Alert.alert('Report this review?', 'Our team will assess the review against marketplace standards.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        style: 'destructive',
        onPress: () => {
          void reportAgentReview(reviewId).then(
            () => Alert.alert('Report sent', 'Thank you for helping keep reviews trustworthy.'),
            (requestError: unknown) => Alert.alert(
              'Report not sent',
              requestError instanceof Error ? requestError.message : 'Please try again later.',
            ),
          );
        },
      },
    ]);
  };

  const submitReply = async (reviewId: number) => {
    if (!profile) return;
    const reply = (replyDrafts[reviewId] || '').trim();
    if (!reply) return;
    setReplyingTo(reviewId);
    setError(null);
    try {
      await replyToAgentReview(profile.id, reviewId, reply);
      setProfile((current) => current ? {
        ...current,
        reviews: current.reviews.map((review) => review.id === reviewId
          ? { ...review, agentReply: reply }
          : review),
      } : current);
      setReplyDrafts((current) => ({ ...current, [reviewId]: '' }));
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Your response could not be published.');
    } finally {
      setReplyingTo(null);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Agent reputation', headerShown: true }} />
      <StatusBar style="dark" />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#087f5b" size="large" />
          <Text style={styles.bodyText}>Loading agent profile…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => setRetryKey((key) => key + 1)} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      ) : profile ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.profileCard}>
            {profile.profileImageUrl ? (
              <Image source={{ uri: resolveMediaUrl(profile.profileImageUrl, 320) ?? undefined }} style={styles.avatar} />
            ) : null}
            <Text accessibilityRole="header" style={styles.name}>
              {[profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Makazi Go agent'}
            </Text>
            {profile.agencyName ? <Text style={styles.bodyText}>{profile.agencyName}</Text> : null}
            {profile.agentRating !== null ? (
              <Text style={styles.rating}>★ {profile.agentRating.toFixed(1)} · {profile.agentReviewCount} verified reviews</Text>
            ) : (
              <Text style={styles.bodyText}>No published verified reviews yet.</Text>
            )}
            {profile.bio ? <Text style={styles.bodyText}>{profile.bio}</Text> : null}
          </View>

          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Text style={styles.sectionTitle}>Guest experiences</Text>
          {profile.reviews.length ? profile.reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewer}>
                  {[review.firstName, review.lastName].filter(Boolean).join(' ') || 'Makazi Go guest'}
                </Text>
                <Text style={styles.rating}>★ {review.rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.verified}>Verified completed stay</Text>
              {review.listingTitle ? <Text style={styles.bodyText}>{review.listingTitle}</Text> : null}
              <Text style={styles.bodyText}>{review.comment}</Text>
              {review.agentReply ? (
                <View style={styles.reply}>
                  <Text style={styles.replyLabel}>Agent response</Text>
                  <Text style={styles.bodyText}>{review.agentReply}</Text>
                </View>
              ) : null}
              {!review.agentReply && user?.id === profile.id ? (
                <View style={styles.replyForm}>
                  <TextInput
                    accessibilityLabel="Agent response"
                    maxLength={2000}
                    multiline
                    onChangeText={(value) => setReplyDrafts((current) => ({ ...current, [review.id]: value }))}
                    placeholder="Write a respectful response"
                    placeholderTextColor="#68796f"
                    style={styles.replyInput}
                    value={replyDrafts[review.id] || ''}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={replyingTo !== null}
                    onPress={() => void submitReply(review.id)}
                    style={[styles.button, replyingTo !== null && styles.disabled]}>
                    <Text style={styles.buttonText}>{replyingTo === review.id ? 'Publishing…' : 'Publish response'}</Text>
                  </Pressable>
                </View>
              ) : null}
              {user ? (
                <Pressable accessibilityRole="button" onPress={() => report(review.id)} style={styles.reportButton}>
                  <Text style={styles.reportText}>Report review</Text>
                </Pressable>
              ) : null}
            </View>
          )) : (
            <View style={styles.reviewCard}>
              <Text style={styles.bodyText}>No published agent reviews are available yet.</Text>
            </View>
          )}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f5' },
  content: { padding: 18, paddingBottom: 36, gap: 14 },
  profileCard: { alignItems: 'flex-start', padding: 18, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce8df', gap: 8 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#e8f3ec' },
  name: { color: '#173222', fontSize: 24, fontWeight: '800' },
  sectionTitle: { marginTop: 6, color: '#173222', fontSize: 20, fontWeight: '800' },
  reviewCard: { padding: 16, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce8df', gap: 8 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  reviewer: { color: '#173222', fontWeight: '800' },
  rating: { color: '#785608', fontWeight: '800' },
  verified: { color: '#087f5b', fontSize: 12, fontWeight: '700' },
  bodyText: { color: '#53665b', fontSize: 14, lineHeight: 21 },
  reply: { marginTop: 4, padding: 12, borderRadius: 10, backgroundColor: '#eef5ef', gap: 4 },
  replyLabel: { color: '#173222', fontWeight: '800' },
  replyForm: { gap: 8 },
  replyInput: { minHeight: 88, padding: 10, borderWidth: 1, borderColor: '#dce8df', borderRadius: 9, color: '#173222' },
  reportButton: { alignSelf: 'flex-start', paddingVertical: 6 },
  reportText: { color: '#785050', fontSize: 13, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  error: { color: '#9e2929', textAlign: 'center', lineHeight: 21 },
  button: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#087f5b' },
  buttonText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
