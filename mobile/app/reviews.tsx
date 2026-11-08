import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/AuthProvider';
import { Text, View } from '@/components/Themed';
import {
  getReviewableBookings,
  submitAgentReview,
  submitListingReview,
  type ReviewableBooking,
} from '@/constants/marketplaceApi';

type ReviewTarget = { booking: ReviewableBooking; kind: 'property' | 'agent' } | null;

export default function ReviewsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<ReviewableBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<ReviewTarget>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBookings(await getReviewableBookings());
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Completed stays could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings, retryKey]);

  const openForm = (booking: ReviewableBooking, kind: 'property' | 'agent') => {
    setTarget({ booking, kind });
    setRating(5);
    setComment('');
    setError(null);
  };

  const submit = async () => {
    if (!target) return;
    if (comment.trim().length < 10) {
      setError('Write at least 10 characters so your review is useful.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (target.kind === 'property') {
        await submitListingReview(target.booking.listingId, target.booking.bookingId, rating, comment);
      } else {
        await submitAgentReview(target.booking.agentId, target.booking.bookingId, rating, comment);
      }
      setTarget(null);
      await loadBookings();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Your review could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Your reviews', headerShown: true }} />
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>Share a verified experience</Text>
        <Text style={styles.intro}>
          Reviews are available after a completed stay. They are checked before appearing publicly.
        </Text>

        {target ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Review {target.kind === 'property' ? target.booking.listingTitle : target.booking.agentName}
            </Text>
            <Text style={styles.label}>Your rating</Text>
            <View style={styles.ratingPicker}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: rating === value }}
                  key={value}
                  onPress={() => setRating(value)}
                  style={styles.starButton}>
                  <Text style={[styles.star, rating >= value && styles.starSelected]}>★</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              accessibilityLabel="Review"
              maxLength={5000}
              multiline
              onChangeText={setComment}
              placeholder="What should other guests know? (at least 10 characters)"
              placeholderTextColor="#68796f"
              style={styles.input}
              textAlignVertical="top"
              value={comment}
            />
            <Text style={styles.counter}>{comment.length}/5000</Text>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={() => setTarget(null)}
                style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={() => void submit()}
                style={[styles.primaryButton, submitting && styles.disabled]}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Submit for review</Text>}
              </Pressable>
            </View>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#087f5b" size="large" />
            <Text style={styles.intro}>Loading completed stays…</Text>
          </View>
        ) : error && !target ? (
          <View style={styles.card}>
            <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => setRetryKey((key) => key + 1)} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Try again</Text>
            </Pressable>
          </View>
        ) : !user?.roles.includes('tenant') ? (
          <View style={styles.card}><Text style={styles.intro}>Sign in as a tenant to review completed stays.</Text></View>
        ) : bookings.length === 0 ? (
          <View style={styles.card}><Text style={styles.intro}>Completed stays will appear here when they are ready for review.</Text></View>
        ) : (
          bookings.map((booking) => (
            <View key={booking.bookingId} style={styles.card}>
              <Text style={styles.cardTitle}>{booking.listingTitle}</Text>
              <Text style={styles.intro}>
                Stay with {booking.agentName}
                {booking.checkIn && booking.checkOut ? ` · ${booking.checkIn} to ${booking.checkOut}` : ''}
              </Text>
              <View style={styles.actions}>
                <ReviewAction
                  label="Property"
                  status={booking.listingReviewStatus}
                  onPress={() => openForm(booking, 'property')}
                />
                <ReviewAction
                  label="Agent"
                  status={booking.agentReviewStatus}
                  onPress={() => openForm(booking, 'agent')}
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReviewAction({
  label,
  status,
  onPress,
}: {
  label: string;
  status: string | null;
  onPress: () => void;
}) {
  if (status) {
    return (
      <View style={styles.statusPill}>
        <Text style={styles.statusText}>{label}: {status === 'published' ? 'Published' : 'In review'}</Text>
      </View>
    );
  }
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondaryButton}>
      <Text style={styles.secondaryText}>Review {label.toLowerCase()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f5' },
  content: { padding: 20, paddingBottom: 36, gap: 14 },
  title: { color: '#173222', fontSize: 26, fontWeight: '800' },
  intro: { color: '#53665b', fontSize: 14, lineHeight: 21 },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#dce8df', backgroundColor: '#fff', gap: 10 },
  cardTitle: { color: '#173222', fontSize: 17, fontWeight: '800' },
  label: { color: '#173222', fontWeight: '700' },
  ratingPicker: { flexDirection: 'row', gap: 8 },
  starButton: { padding: 5 },
  star: { color: '#bdc6bf', fontSize: 30 },
  starSelected: { color: '#d39720' },
  input: { minHeight: 120, padding: 12, borderWidth: 1, borderColor: '#dce8df', borderRadius: 10, color: '#173222' },
  counter: { alignSelf: 'flex-end', color: '#68796f', fontSize: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  primaryButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#087f5b' },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#dce8df', backgroundColor: '#fff' },
  secondaryText: { color: '#173222', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  error: { color: '#9e2929', lineHeight: 20 },
  centered: { alignItems: 'center', padding: 20, gap: 10 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: '#e8f3ec' },
  statusText: { color: '#087f5b', fontSize: 13, fontWeight: '700' },
});
