import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Text, View } from '@/components/Themed';
import { useAuth } from '@/components/AuthProvider';
import {
  getAdminPosts,
  moderatePost,
  type AdminPost,
  type AdminPostDecision,
  type AdminPostStatus,
} from '@/constants/marketplaceApi';

const postStatuses: { label: string; value: AdminPostStatus }[] = [
  { label: 'Review queue', value: 'pending_review' },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
];

export default function AdminPostsScreen() {
  const { user, loading: authLoading } = useAuth();
  const isAdministrator = Boolean(user?.roles.includes('administrator'));
  const [status, setStatus] = useState<AdminPostStatus>('pending_review');
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyPostId, setBusyPostId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (authLoading || !isAdministrator) {
      setLoading(authLoading);
      setPosts([]);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);
    void getAdminPosts(status)
      .then((result) => {
        if (active) setPosts(result);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setPosts([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Administrator posts could not be loaded.',
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authLoading, isAdministrator, refreshKey, status]);

  const refresh = () => {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
  };

  const requestDecision = (post: AdminPost, decision: AdminPostDecision) => {
    if (post.id === null) return;
    const action = decision === 'published' ? 'publish' : 'return to draft';
    Alert.alert(
      `${action[0].toUpperCase()}${action.slice(1)} post?`,
      `The post for “${post.title}” will be ${action} in the shared marketplace.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action[0].toUpperCase() + action.slice(1),
          style: decision === 'draft' ? 'destructive' : 'default',
          onPress: () => {
            void applyDecision(post, decision);
          },
        },
      ],
    );
  };

  const applyDecision = async (post: AdminPost, decision: AdminPostDecision) => {
    if (post.id === null) return;
    setBusyPostId(post.id);
    setError(null);
    try {
      await moderatePost(post.id, decision);
      setRefreshKey((key) => key + 1);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The post decision could not be saved.',
      );
    } finally {
      setBusyPostId(null);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#087f5b" size="large" />
          <Text style={styles.bodyText}>Checking administrator access…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdministrator) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <Text style={styles.title}>Administrator access required</Text>
          <Text style={styles.bodyText}>
            Sign in with an administrator account or console credentials to manage shared marketplace records.
          </Text>
          <Link href="/(tabs)/account" asChild>
            <Pressable accessibilityRole="button" style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Open account sign-in</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  const legacyListingFallback = posts.length > 0 && posts.every((post) => post.id === null);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <FlatList
        data={posts}
        keyExtractor={(post, index) => String(post.id ?? `listing-${post.listingId}-${index}`)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>ADMIN WORKSPACE</Text>
            <Text accessibilityRole="header" style={styles.title}>Post moderation</Text>
            <Text style={styles.bodyText}>
              Review post content and update its shared status. Decisions are recorded by the authorized API.
            </Text>
            <Link href="/(tabs)/admin" asChild>
              <Pressable accessibilityRole="button" style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Listing moderation</Text>
              </Pressable>
            </Link>
            <ScrollView
              horizontal
              contentContainerStyle={styles.statusRow}
              showsHorizontalScrollIndicator={false}>
              {postStatuses.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: status === item.value }}
                  key={item.value}
                  onPress={() => setStatus(item.value)}
                  style={[styles.statusChip, status === item.value && styles.statusChipSelected]}>
                  <Text style={[styles.statusChipText, status === item.value && styles.statusChipTextSelected]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {legacyListingFallback ? (
              <View accessibilityRole="alert" style={styles.notice}>
                <Text style={styles.noticeText}>
                  The API returned legacy listing records because its posts table is unavailable. These records cannot be moderated as posts.
                </Text>
              </View>
            ) : null}
            {error ? (
              <View accessibilityRole="alert" style={styles.errorCard}>
                <Text style={styles.errorTitle}>Could not complete the request</Text>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable accessibilityRole="button" onPress={refresh} style={styles.retryButton}>
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#087f5b" size="large" />
              <Text style={styles.bodyText}>Loading posts…</Text>
            </View>
          ) : !error ? (
            <View style={styles.empty}>
              <Text style={styles.cardTitle}>No posts in this section</Text>
              <Text style={styles.bodyText}>Choose another status or refresh the queue.</Text>
            </View>
          ) : undefined
        }
        refreshControl={
          <RefreshControl
            onRefresh={refresh}
            refreshing={refreshing}
            tintColor="#087f5b"
          />
        }
        renderItem={({ item }) => (
          <AdminPostCard
            post={item}
            busy={item.id !== null && busyPostId === item.id}
            onDecision={requestDecision}
          />
        )}
      />
    </SafeAreaView>
  );
}

function AdminPostCard({
  post,
  busy,
  onDecision,
}: {
  post: AdminPost;
  busy: boolean;
  onDecision: (post: AdminPost, decision: AdminPostDecision) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.statusLabel}>{post.status.replace('_', ' ')}</Text>
        <Text style={styles.recordId}>{post.id === null ? 'Legacy listing' : `Post #${post.id}`}</Text>
      </View>
      <Text style={styles.cardTitle}>{post.title}</Text>
      <Text style={styles.bodyText}>
        {post.postType ? post.postType.replaceAll('_', ' ') : 'Agent post'}
        {post.city ? ` · ${post.city}` : ''}
      </Text>
      <Text style={styles.caption}>{post.caption || 'No caption provided.'}</Text>
      {post.amenityTags.length > 0 ? (
        <Text style={styles.bodyText}>Amenities: {post.amenityTags.join(', ')}</Text>
      ) : null}
      {post.createdAt ? <Text style={styles.bodyText}>Created {post.createdAt}</Text> : null}
      <Text style={styles.bodyText}>By {post.agentName || 'Unknown agent'}</Text>
      <Text style={styles.bodyText}>
        Listing #{post.listingId} engagement: {post.likes} likes · {post.views} views
      </Text>
      {post.id === null ? (
        <Text style={styles.noticeText}>Post moderation is unavailable for this legacy record.</Text>
      ) : busy ? (
        <ActivityIndicator color="#087f5b" style={styles.cardLoader} />
      ) : (
        <View style={styles.actionRow}>
          {post.status !== 'published' ? (
            <DecisionButton label="Publish" onPress={() => onDecision(post, 'published')} />
          ) : null}
          {post.status !== 'draft' ? (
            <DecisionButton
              label="Return to draft"
              destructive
              onPress={() => onDecision(post, 'draft')}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

function DecisionButton({
  label,
  destructive = false,
  onPress,
}: {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.actionButton, destructive && styles.destructiveButton]}>
      <Text style={[styles.actionButtonText, destructive && styles.destructiveButtonText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7f5',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  eyebrow: {
    color: '#087f5b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  title: {
    marginTop: 8,
    color: '#173222',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  bodyText: {
    marginTop: 7,
    color: '#53665b',
    fontSize: 13,
    lineHeight: 19,
  },
  statusRow: {
    gap: 8,
    paddingVertical: 16,
  },
  statusChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dce8df',
    backgroundColor: '#ffffff',
  },
  statusChipSelected: {
    borderColor: '#087f5b',
    backgroundColor: '#e8f3ec',
  },
  statusChipText: {
    color: '#53665b',
    fontSize: 12,
    fontWeight: '600',
  },
  statusChipTextSelected: {
    color: '#087f5b',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  empty: {
    alignItems: 'center',
    padding: 26,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 13,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dce8df',
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusLabel: {
    color: '#087f5b',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  recordId: {
    color: '#52655a',
    fontSize: 12,
  },
  cardTitle: {
    marginTop: 8,
    color: '#173222',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  caption: {
    marginTop: 10,
    color: '#173222',
    fontSize: 14,
    lineHeight: 21,
  },
  cardLoader: {
    marginTop: 15,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  actionButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#087f5b',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  destructiveButton: {
    borderWidth: 1,
    borderColor: '#eed0cc',
    backgroundColor: '#ffffff',
  },
  destructiveButtonText: {
    color: '#943226',
  },
  primaryButton: {
    minHeight: 46,
    justifyContent: 'center',
    marginTop: 18,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#087f5b',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    marginTop: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dce8df',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#087f5b',
    fontSize: 13,
    fontWeight: '700',
  },
  notice: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff8e8',
  },
  noticeText: {
    marginTop: 8,
    color: '#705714',
    fontSize: 13,
    lineHeight: 19,
  },
  errorCard: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f2c7bf',
    backgroundColor: '#fff8f6',
  },
  errorTitle: {
    color: '#7b261c',
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    marginTop: 5,
    color: '#6f4a45',
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 5,
  },
  retryText: {
    color: '#087f5b',
    fontWeight: '700',
  },
});
