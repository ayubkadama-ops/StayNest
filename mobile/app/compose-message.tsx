import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/AuthProvider';
import { Text, View } from '@/components/Themed';
import { sendMessage } from '@/constants/marketplaceApi';

export default function ComposeMessageScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; name?: string | string[] }>();
  const idValue = Array.isArray(params.id) ? params.id[0] : params.id;
  const nameValue = Array.isArray(params.name) ? params.name[0] : params.name;
  const recipientId = idValue && /^[1-9]\d*$/.test(idValue) ? Number(idValue) : null;
  const recipientName = nameValue?.trim() || 'Makazi Go member';
  const { user, loading } = useAuth();
  const router = useRouter();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!recipientId || !user?.id || sending) return;
    setSending(true);
    setError(null);
    try {
      const receipt = await sendMessage(recipientId, body);
      router.replace({
        pathname: '/conversation',
        params: {
          id: String(receipt.conversationId),
          recipientId: String(recipientId),
          displayName: recipientName,
        },
      });
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
      <Stack.Screen options={{ title: 'New message', headerShown: true }} />
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>Private message</Text>
        <Text style={styles.intro}>Start a secure conversation with {recipientName}.</Text>
        {loading ? (
          <Text style={styles.intro}>Checking your account…</Text>
        ) : !user ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in to send a message</Text>
            <Text style={styles.intro}>Your message recipient and draft stay on this screen while you sign in.</Text>
            <Link href="/(tabs)/account" asChild>
              <Pressable accessibilityRole="button" style={styles.primaryButton}>
                <Text style={styles.primaryText}>Open account</Text>
              </Pressable>
            </Link>
          </View>
        ) : recipientId === null ? (
          <View style={styles.card}>
            <Text accessibilityRole="alert" style={styles.error}>Choose a valid message recipient from a profile.</Text>
          </View>
        ) : user.id === recipientId ? (
          <View style={styles.card}>
            <Text style={styles.intro}>You cannot start a conversation with your own account.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <TextInput
              accessibilityLabel={`Message for ${recipientName}`}
              maxLength={2000}
              multiline
              onChangeText={setBody}
              placeholder="Write a respectful message"
              placeholderTextColor="#68796f"
              style={styles.input}
              textAlignVertical="top"
              value={body}
            />
            <View style={styles.formFooter}>
              <Text style={styles.counter}>{body.length}/2,000</Text>
              <Pressable
                accessibilityRole="button"
                disabled={!body.trim() || sending}
                onPress={() => void submit()}
                style={[styles.primaryButton, (!body.trim() || sending) && styles.disabled]}>
                <Text style={styles.primaryText}>{sending ? 'Sending…' : 'Send message'}</Text>
              </Pressable>
            </View>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f5' },
  content: { flexGrow: 1, padding: 18, paddingBottom: 36, gap: 14 },
  title: { color: '#173222', fontSize: 26, lineHeight: 32, fontWeight: '800' },
  intro: { color: '#53665b', fontSize: 14, lineHeight: 21 },
  card: { padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#dce8df', backgroundColor: '#fff', gap: 10 },
  cardTitle: { color: '#173222', fontSize: 18, fontWeight: '800' },
  input: { minHeight: 160, padding: 13, borderWidth: 1, borderColor: '#dce8df', borderRadius: 12, color: '#173222', fontSize: 15 },
  formFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  counter: { color: '#68796f', fontSize: 12 },
  primaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 11, backgroundColor: '#087f5b' },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  error: { color: '#9e2929', fontSize: 13, lineHeight: 19 },
});
