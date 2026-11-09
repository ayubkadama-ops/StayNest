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
  getMessageConversations,
  getUnreadMessageCount,
  type MessageConversation,
} from '@/constants/marketplaceApi';

function formatMessageDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export default function MessagesScreen() {
  const { user, loading: sessionLoading } = useAuth();
  const [conversations, setConversations] = useState<MessageConversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadError, setUnreadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnreadError(null);
    try {
      const result = await getMessageConversations();
      setConversations(result.conversations);
      try {
        setUnreadCount(await getUnreadMessageCount());
      } catch (requestError: unknown) {
        setUnreadError(requestError instanceof Error ? requestError.message : 'Unread messages could not be counted.');
      }
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Your inbox could not be loaded.');
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
    void loadInbox();
  }, [loadInbox, retryKey, sessionLoading, user?.id]));

  const refreshInbox = async () => {
    setRefreshing(true);
    await loadInbox();
    setRefreshing(false);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Messages', headerShown: true }} />
      <StatusBar style="dark" />
      {sessionLoading || loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#087f5b" size="large" />
          <Text style={styles.bodyText}>Loading your inbox…</Text>
        </View>
      ) : !user ? (
        <View style={styles.centered}>
          <Text accessibilityRole="header" style={styles.title}>Your inbox</Text>
          <Text style={styles.bodyText}>Sign in to continue conversations with tenants and agents.</Text>
          <Link href="/(tabs)/account" asChild>
            <Pressable accessibilityRole="button" style={styles.primaryButton}>
              <Text style={styles.primaryText}>Open account</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl onRefresh={() => void refreshInbox()} refreshing={refreshing} tintColor="#087f5b" />}>
          <View style={styles.heading}>
            <View style={styles.headingCopy}>
              <Text accessibilityRole="header" style={styles.title}>Your messages</Text>
              <Text style={styles.bodyText}>
                Continue secure conversations with tenants and agents.
              </Text>
            </View>
            {unreadCount > 0 ? (
              <View accessibilityLabel={`${unreadCount} unread messages`} style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            ) : null}
          </View>
          <Link href="/notifications" asChild>
            <Pressable accessibilityRole="button" style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>View system notifications</Text>
            </Pressable>
          </Link>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {unreadError ? <Text accessibilityRole="alert" style={styles.error}>{unreadError}</Text> : null}
          {error && !conversations.length ? (
            <Pressable accessibilityRole="button" onPress={() => setRetryKey((key) => key + 1)} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Retry</Text>
            </Pressable>
          ) : conversations.length ? conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={{
                pathname: '/conversation',
                params: {
                  id: String(conversation.id),
                  recipientId: String(conversation.otherUserId),
                  displayName: conversation.otherDisplayName,
                },
              }}
              asChild>
              <Pressable accessibilityRole="link" style={styles.conversationCard}>
                <View style={styles.conversationTop}>
                  <Text style={styles.personName}>{conversation.otherDisplayName}</Text>
                  {conversation.unread > 0 ? (
                    <View style={styles.threadUnread}>
                      <Text style={styles.threadUnreadText}>{conversation.unread > 99 ? '99+' : conversation.unread}</Text>
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={2} style={styles.preview}>{conversation.lastMessage || 'No recent message'}</Text>
                <Text style={styles.date}>{formatMessageDate(conversation.lastMessageAt)}</Text>
              </Pressable>
            </Link>
          )) : (
            <View style={styles.emptyCard}>
              <Text style={styles.personName}>Your inbox is empty</Text>
              <Text style={styles.bodyText}>Open an agent profile to start a secure conversation.</Text>
            </View>
          )}
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
  title: { color: '#173222', fontSize: 26, lineHeight: 32, fontWeight: '800' },
  bodyText: { color: '#53665b', fontSize: 14, lineHeight: 21 },
  conversationCard: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#dce8df', backgroundColor: '#fff', gap: 7 },
  conversationTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  personName: { flex: 1, color: '#173222', fontSize: 16, fontWeight: '800' },
  preview: { color: '#53665b', fontSize: 14, lineHeight: 20 },
  date: { color: '#68796f', fontSize: 12 },
  unreadBadge: { minWidth: 34, height: 34, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 17, backgroundColor: '#087f5b' },
  unreadBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  threadUnread: { minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, borderRadius: 12, backgroundColor: '#e5f3e9' },
  threadUnreadText: { color: '#086747', fontSize: 11, fontWeight: '800' },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: '#dce8df', backgroundColor: '#fff' },
  secondaryText: { color: '#173222', fontSize: 14, fontWeight: '700' },
  primaryButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 11, backgroundColor: '#087f5b' },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyCard: { alignItems: 'center', padding: 24, borderRadius: 14, borderWidth: 1, borderColor: '#dce8df', backgroundColor: '#fff', gap: 7 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  error: { color: '#9e2929', fontSize: 13, lineHeight: 19 },
});
