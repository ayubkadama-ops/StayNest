import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/AuthProvider';
import { Text, View } from '@/components/Themed';
import {
  getConversationMessages,
  getUserBlockStatus,
  reportUser,
  sendMessage,
  setUserBlocked,
  type ConversationMessage,
} from '@/constants/marketplaceApi';

function formatMessageDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export default function ConversationScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    recipientId?: string | string[];
    displayName?: string | string[];
  }>();
  const conversationValue = Array.isArray(params.id) ? params.id[0] : params.id;
  const recipientValue = Array.isArray(params.recipientId) ? params.recipientId[0] : params.recipientId;
  const displayNameValue = Array.isArray(params.displayName) ? params.displayName[0] : params.displayName;
  const conversationId = conversationValue && /^[1-9]\d*$/.test(conversationValue) ? Number(conversationValue) : null;
  const recipientId = recipientValue && /^[1-9]\d*$/.test(recipientValue) ? Number(recipientValue) : null;
  const displayName = displayNameValue?.trim() || 'Makazi Go member';
  const { user, loading: sessionLoading } = useAuth();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [nextPage, setNextPage] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [moderationBusy, setModerationBusy] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

  const loadBlockStatus = useCallback(async () => {
    if (recipientId === null) return;
    setModerationError(null);
    try {
      setBlocked(await getUserBlockStatus(recipientId));
    } catch (requestError: unknown) {
      setModerationError(requestError instanceof Error ? requestError.message : 'Block status could not be loaded.');
    }
  }, [recipientId]);

  const loadHistory = useCallback(async () => {
    if (conversationId === null) {
      setError('Choose a valid conversation.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getConversationMessages(conversationId);
      setMessages(result.messages);
      setHasOlderMessages(result.messages.length === result.limit);
      setNextPage(2);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Conversation history could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void loadHistory();
    void loadBlockStatus();
  }, [loadBlockStatus, loadHistory, sessionLoading, user?.id]);

  const refreshHistory = async () => {
    setRefreshing(true);
    await Promise.all([loadHistory(), loadBlockStatus()]);
    setRefreshing(false);
  };

  const updateBlock = async (nextBlocked: boolean) => {
    if (recipientId === null || moderationBusy) return;
    setModerationBusy(true);
    setModerationError(null);
    try {
      await setUserBlocked(recipientId, nextBlocked);
      setBlocked(nextBlocked);
    } catch (requestError: unknown) {
      setModerationError(requestError instanceof Error ? requestError.message : 'The block setting could not be changed.');
    } finally {
      setModerationBusy(false);
    }
  };

  const confirmBlockChange = () => {
    const nextBlocked = !blocked;
    Alert.alert(
      nextBlocked ? `Block ${displayName}?` : `Unblock ${displayName}?`,
      nextBlocked
        ? 'They will not be able to message you, and you will not be able to send messages to them.'
        : 'You and this member will be able to message each other again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextBlocked ? 'Block member' : 'Unblock member',
          style: nextBlocked ? 'destructive' : 'default',
          onPress: () => void updateBlock(nextBlocked),
        },
      ],
    );
  };

  const confirmReport = () => {
    if (recipientId === null) return;
    Alert.alert(
      'Report this member?',
      'A report about inappropriate or abusive messaging will be sent to the Makazi Go safety team.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit report',
          style: 'destructive',
          onPress: () => {
            void reportUser(recipientId, 'Inappropriate or abusive messaging', 'Reported from a private conversation.')
              .then(() => Alert.alert('Report sent', 'The Makazi Go safety team will review your report.'))
              .catch((requestError: unknown) => Alert.alert(
                'Report not sent',
                requestError instanceof Error ? requestError.message : 'The report could not be submitted.',
              ));
          },
        },
      ],
    );
  };

  const loadOlderMessages = async () => {
    if (conversationId === null || !hasOlderMessages || loading) return;
    setHistoryError(null);
    try {
      const older = await getConversationMessages(conversationId, nextPage);
      setMessages((current) => [...older.messages, ...current]);
      setNextPage((page) => page + 1);
      setHasOlderMessages(older.messages.length === older.limit);
    } catch (requestError: unknown) {
      setHistoryError(requestError instanceof Error ? requestError.message : 'Older messages could not be loaded.');
    }
  };

  const submitMessage = async () => {
    const body = draft.trim();
    if (!body || sending || recipientId === null || !user?.id) return;
    setSending(true);
    setError(null);
    setHistoryError(null);
    try {
      const receipt = await sendMessage(recipientId, body);
      const optimisticMessage: ConversationMessage = {
        id: receipt.messageId,
        body,
        senderId: user.id,
        createdAt: new Date().toISOString(),
        firstName: user.firstName,
        lastName: user.lastName,
      };
      setMessages((current) => current.some((message) => message.id === receipt.messageId)
        ? current
        : [...current, optimisticMessage]);
      setDraft('');
      if (conversationId !== null) {
        try {
          const latest = await getConversationMessages(conversationId);
          setMessages(latest.messages);
          setHasOlderMessages(latest.messages.length === latest.limit);
          setNextPage(2);
        } catch (requestError: unknown) {
          setHistoryError(
            requestError instanceof Error
              ? `Message sent, but the latest conversation could not be refreshed: ${requestError.message}`
              : 'Message sent, but the latest conversation could not be refreshed.',
          );
        }
      }
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? `${requestError.message} Your draft is still here. If the connection dropped, check your inbox before retrying.`
          : 'The message could not be confirmed. Your draft is still here; check your inbox before retrying.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Stack.Screen options={{ title: displayName, headerShown: true }} />
      <StatusBar style="dark" />
      {sessionLoading || loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#087f5b" size="large" />
          <Text style={styles.bodyText}>Loading conversation…</Text>
        </View>
      ) : !user ? (
        <View style={styles.centered}>
          <Text style={styles.title}>Secure conversation</Text>
          <Text style={styles.bodyText}>Sign in to view and reply to messages.</Text>
          <Link href="/(tabs)/account" asChild>
            <Pressable accessibilityRole="button" style={styles.primaryButton}>
              <Text style={styles.primaryText}>Open account</Text>
            </Pressable>
          </Link>
        </View>
      ) : error && !messages.length ? (
        <View style={styles.centered}>
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void loadHistory()} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl onRefresh={() => void refreshHistory()} refreshing={refreshing} tintColor="#087f5b" />}>
            {hasOlderMessages ? (
              <Pressable accessibilityRole="button" disabled={loading} onPress={() => void loadOlderMessages()} style={styles.olderButton}>
                <Text style={styles.olderText}>Load older messages</Text>
              </Pressable>
            ) : null}
            {historyError ? <Text accessibilityRole="alert" style={styles.error}>{historyError}</Text> : null}
            {messages.length ? messages.map((message) => {
              const isMine = message.senderId === user.id;
              return (
                <View key={message.id} style={[styles.messageRow, isMine ? styles.mineRow : styles.theirsRow]}>
                  <View style={[styles.bubble, isMine ? styles.mineBubble : styles.theirBubble]}>
                    {!isMine ? (
                      <Text style={styles.sender}>
                        {[message.firstName, message.lastName].filter(Boolean).join(' ') || displayName}
                      </Text>
                    ) : null}
                    <Text style={[styles.messageBody, isMine && styles.mineText]}>{message.body}</Text>
                    <Text style={[styles.messageDate, isMine && styles.mineDate]}>{formatMessageDate(message.createdAt)}</Text>
                  </View>
                </View>
              );
            }) : (
              <View style={styles.emptyCard}>
                <Text style={styles.personName}>Start the conversation</Text>
                <Text style={styles.bodyText}>Your messages are visible only to conversation participants.</Text>
              </View>
            )}
          </ScrollView>
          <View style={styles.composer}>
            {recipientId !== null && recipientId !== user.id ? (
              <View style={styles.safetyActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={moderationBusy}
                  onPress={confirmBlockChange}
                  style={styles.safetyButton}>
                  <Text style={styles.safetyText}>{moderationBusy ? 'Updating…' : blocked ? 'Unblock member' : 'Block member'}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={moderationBusy}
                  onPress={confirmReport}
                  style={styles.safetyButton}>
                  <Text style={styles.reportText}>Report member</Text>
                </Pressable>
              </View>
            ) : null}
            {moderationError ? <Text accessibilityRole="alert" style={styles.error}>{moderationError}</Text> : null}
            {blocked ? <Text style={styles.blockNotice}>You blocked this member. Unblock them to send a message.</Text> : null}
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            {recipientId === null ? (
              <Text accessibilityRole="alert" style={styles.error}>The recipient could not be identified. Return to your inbox and reopen this conversation.</Text>
            ) : null}
            <TextInput
              accessibilityLabel="Write a message"
              editable={!blocked}
              maxLength={2000}
              multiline
              onChangeText={setDraft}
              placeholder={`Write a respectful message to ${displayName}`}
              placeholderTextColor="#68796f"
              style={styles.input}
              textAlignVertical="top"
              value={draft}
            />
            <View style={styles.composerFooter}>
              <Text style={styles.characterCount}>{draft.length}/2,000</Text>
              <Pressable
                accessibilityRole="button"
                disabled={!draft.trim() || sending || recipientId === null || blocked}
                onPress={() => void submitMessage()}
                style={[styles.primaryButton, (!draft.trim() || sending || recipientId === null || blocked) && styles.disabled]}>
                <Text style={styles.primaryText}>{sending ? 'Sending…' : 'Send message'}</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f5' },
  messageList: { flexGrow: 1, padding: 16, paddingBottom: 10, gap: 10 },
  messageRow: { width: '100%', flexDirection: 'row' },
  mineRow: { justifyContent: 'flex-end' },
  theirsRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '88%', padding: 12, borderRadius: 14, gap: 6 },
  mineBubble: { backgroundColor: '#087f5b', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce8df', borderBottomLeftRadius: 4 },
  sender: { color: '#086747', fontSize: 12, fontWeight: '800' },
  messageBody: { color: '#173222', fontSize: 15, lineHeight: 21 },
  mineText: { color: '#fff' },
  messageDate: { alignSelf: 'flex-end', color: '#68796f', fontSize: 10 },
  mineDate: { color: '#d7eee2' },
  olderButton: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  olderText: { color: '#086747', fontSize: 13, fontWeight: '700' },
  composer: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#dce8df', backgroundColor: '#fff' },
  safetyActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  safetyButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 8 },
  safetyText: { color: '#785050', fontSize: 13, fontWeight: '700' },
  reportText: { color: '#705714', fontSize: 13, fontWeight: '700' },
  blockNotice: { marginBottom: 6, color: '#785050', fontSize: 13, lineHeight: 19 },
  input: { minHeight: 72, maxHeight: 140, padding: 12, borderWidth: 1, borderColor: '#dce8df', borderRadius: 12, color: '#173222', fontSize: 15 },
  composerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  characterCount: { color: '#68796f', fontSize: 12 },
  primaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingHorizontal: 16, borderRadius: 11, backgroundColor: '#087f5b' },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { color: '#173222', fontSize: 22, fontWeight: '800' },
  bodyText: { color: '#53665b', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  personName: { color: '#173222', fontSize: 16, fontWeight: '800' },
  emptyCard: { alignItems: 'center', marginTop: 16, padding: 24, borderRadius: 14, backgroundColor: '#fff', gap: 7 },
  error: { marginVertical: 5, color: '#9e2929', fontSize: 13, lineHeight: 19 },
});
