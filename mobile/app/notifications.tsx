import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Link, Stack, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/AuthProvider';
import { Text, View } from '@/components/Themed';
import {
  getSystemNotifications,
  markSystemNotificationsRead,
  type SystemNotification,
} from '@/constants/marketplaceApi';

function notificationData(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function safeId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatNotificationDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

function categoryFor(type: string): string {
  if (type.startsWith('booking_') || type === 'booking_request') return 'Booking update';
  if (type === 'listing_review_received') return 'Review update';
  if (type.startsWith('verification_') || type.startsWith('agent_')) return 'Account update';
  return 'Important update';
}

export default function NotificationsScreen() {
  const { user, loading: sessionLoading } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReadError(null);
    try {
      const result = await getSystemNotifications();
      setNotifications(result.notifications);
      setUnread(result.unread);
      if (result.unread > 0) {
        try {
          await markSystemNotificationsRead();
          const readAt = new Date().toISOString();
          setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
          setUnread(0);
        } catch (requestError: unknown) {
          setReadError(
            requestError instanceof Error
              ? requestError.message
              : 'Notifications loaded but could not be marked as read.',
          );
        }
      }
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Notifications could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (sessionLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void loadNotifications();
  }, [loadNotifications, retryKey, sessionLoading, user?.id]));

  const refreshNotifications = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const retryMarkRead = async () => {
    setReadError(null);
    try {
      await markSystemNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
      setUnread(0);
    } catch (requestError: unknown) {
      setReadError(
        requestError instanceof Error
          ? requestError.message
          : 'Notifications could not be marked as read.',
      );
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Notifications', headerShown: true }} />
      <StatusBar style="dark" />
      {sessionLoading || loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#087f5b" size="large" />
          <Text style={styles.bodyText}>Loading notifications…</Text>
        </View>
      ) : !user ? (
        <View style={styles.centered}>
          <Text accessibilityRole="header" style={styles.title}>Notifications</Text>
          <Text style={styles.bodyText}>Sign in to view account and marketplace updates.</Text>
          <Link href="/(tabs)/account" asChild>
            <Pressable accessibilityRole="button" style={styles.primaryButton}>
              <Text style={styles.primaryText}>Open account</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl onRefresh={() => void refreshNotifications()} refreshing={refreshing} tintColor="#087f5b" />}>
          <View style={styles.heading}>
            <View style={styles.headingCopy}>
              <Text accessibilityRole="header" style={styles.title}>Makazi Go updates</Text>
              <Text style={styles.bodyText}>Account, booking, and marketplace activity appears here. Messages stay in your separate inbox.</Text>
            </View>
            {unread > 0 ? (
              <View accessibilityLabel={`${unread} unread notifications`} style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            ) : null}
          </View>
          <Link href="/messages" asChild>
            <Pressable accessibilityRole="button" style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Open secure inbox</Text>
            </Pressable>
          </Link>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {error && !notifications.length ? (
            <Pressable accessibilityRole="button" onPress={() => setRetryKey((key) => key + 1)} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Retry</Text>
            </Pressable>
          ) : null}
          {readError ? (
            <View style={styles.readError}>
              <Text accessibilityRole="alert" style={styles.error}>{readError}</Text>
              <Pressable accessibilityRole="button" onPress={() => void retryMarkRead()} style={styles.retryReadButton}>
                <Text style={styles.retryReadText}>Retry marking read</Text>
              </Pressable>
            </View>
          ) : null}
          {notifications.length ? notifications.map((notification) => {
            const data = notificationData(notification.data);
            const bookingId = safeId(data?.bookingId);
            const listingId = safeId(data?.listingId);
            return (
              <View key={notification.id} style={[styles.card, !notification.readAt && styles.unreadCard]}>
                <Text style={styles.category}>{categoryFor(notification.type)}</Text>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                {notification.body ? <Text style={styles.bodyText}>{notification.body}</Text> : null}
                <Text style={styles.date}>{formatNotificationDate(notification.createdAt)}</Text>
                {bookingId && (notification.type.startsWith('booking_') || notification.type === 'booking_request') ? (
                  <Link href={{ pathname: '/bookings', params: { bookingId: String(bookingId) } }} asChild>
                    <Pressable accessibilityRole="button" style={styles.actionButton}>
                      <Text style={styles.actionText}>View booking</Text>
                    </Pressable>
                  </Link>
                ) : null}
                {listingId && notification.type === 'listing_review_received' ? (
                  <Link href={{ pathname: '/listing', params: { id: String(listingId) } }} asChild>
                    <Pressable accessibilityRole="button" style={styles.actionButton}>
                      <Text style={styles.actionText}>View property</Text>
                    </Pressable>
                  </Link>
                ) : null}
              </View>
            );
          }) : !error ? (
            <View style={styles.emptyCard}>
              <Text style={styles.notificationTitle}>You are all caught up</Text>
              <Text style={styles.bodyText}>New account, booking, and marketplace updates will appear here.</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f5' },
  content: { padding: 18, paddingBottom: 36, gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headingCopy: { flex: 1, gap: 5 },
  title: { color: '#173222', fontSize: 24, lineHeight: 31, fontWeight: '800' },
  bodyText: { color: '#53665b', fontSize: 14, lineHeight: 21 },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#dce8df', backgroundColor: '#fff', gap: 7 },
  unreadCard: { borderColor: '#93c8a7', backgroundColor: '#fbfefb' },
  category: { color: '#087f5b', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  notificationTitle: { color: '#173222', fontSize: 16, fontWeight: '800' },
  date: { color: '#68796f', fontSize: 12 },
  unreadBadge: { minWidth: 34, height: 34, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 17, backgroundColor: '#087f5b' },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: '#dce8df', backgroundColor: '#fff' },
  secondaryText: { color: '#173222', fontSize: 14, fontWeight: '700' },
  actionButton: { alignSelf: 'flex-start', minHeight: 38, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 9, backgroundColor: '#eef5ef' },
  actionText: { color: '#086747', fontSize: 13, fontWeight: '700' },
  primaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 11, backgroundColor: '#087f5b' },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyCard: { alignItems: 'center', padding: 24, borderRadius: 14, borderWidth: 1, borderColor: '#dce8df', backgroundColor: '#fff', gap: 7 },
  error: { color: '#9e2929', fontSize: 13, lineHeight: 19 },
  readError: { padding: 12, borderRadius: 10, backgroundColor: '#fff8e8', gap: 8 },
  retryReadButton: { alignSelf: 'flex-start', paddingVertical: 5 },
  retryReadText: { color: '#705714', fontSize: 13, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
});
