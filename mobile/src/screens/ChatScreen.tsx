import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import { theme } from '../theme/theme';
import { LoadingOverlay } from '../components/LoadingOverlay';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const getUserColor = (username: string) => {
  const colors = ['#FF6B35', '#4ECDC4', '#45B7D1', '#FFA726', '#66BB6A', '#EF5350', '#AB47BC', '#26A69A'];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const ChatScreen = () => {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const { user } = useAuthStore();
  const currentTeam = user?.currentTeam;
  const { 
    messages, 
    isLoading, 
    error, 
    typingUsers,
    fetchMessages, 
    sendMessage: sendMessageStore,
    addReaction: addReactionStore,
    markAsRead,
    fetchUnreadCount,
    clearError 
  } = useChatStore();
  
  const { sendMessage, setTyping, addReaction } = useSocket();

  useEffect(() => {
    if (currentTeam) {
      fetchMessages();
      fetchUnreadCount();
    }
  }, [currentTeam, fetchMessages, fetchUnreadCount]);

  useEffect(() => {
    if (messages.length > 0 && currentTeam) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.user_id !== user?.id) {
        markAsRead(latestMessage.id);
        fetchUnreadCount();
      }
    }
  }, [messages, currentTeam, user?.id, markAsRead, fetchUnreadCount]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      clearError();
    }
  }, [error, clearError]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    const message = messageText.trim();
    setMessageText('');
    setIsTyping(false);
    
    try {
      await sendMessageStore(message);
      sendMessage(message);
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleTextChange = (text: string) => {
    setMessageText(text);
    
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      setTyping(true);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTyping(false);
    }, 2000);
  };

  const handleReaction = async (messageId: number, emoji: string) => {
    try {
      await addReactionStore(messageId, emoji);
      addReaction(messageId, emoji);
      setShowEmojiPicker(null);
    } catch (error) {
      console.error('Reaction error:', error);
    }
  };

  const handleLongPress = (messageId: number) => {
    setShowEmojiPicker(showEmojiPicker === messageId ? null : messageId);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isOwnMessage = item.user_id === user?.id;
    const userColor = getUserColor(item.username);
    const showPicker = showEmojiPicker === item.id;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <Pressable
          onLongPress={() => handleLongPress(item.id)}
          style={[
            styles.messageBubble,
            isOwnMessage 
              ? { backgroundColor: theme.colors.primary }
              : { backgroundColor: userColor }
          ]}
        >
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.messageText}>{item.message}</Text>
          <Text style={styles.timestamp}>
            {new Date(item.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </Pressable>
        
        {item.reactions && item.reactions.length > 0 && (
          <View style={[
            styles.reactionsContainer,
            isOwnMessage ? styles.reactionsRight : styles.reactionsLeft
          ]}>
            {item.reactions.map((reaction: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={styles.reactionBubble}
                onPress={() => handleReaction(item.id, reaction.emoji)}
              >
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                <Text style={styles.reactionCount}>{reaction.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {showPicker && (
          <View style={[
            styles.emojiPicker,
            isOwnMessage ? styles.emojiPickerRight : styles.emojiPickerLeft
          ]}>
            {EMOJI_OPTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiButton}
                onPress={() => handleReaction(item.id, emoji)}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (!currentTeam) {
    return (
      <View style={styles.noTeamContainer}>
        <Ionicons name="people-outline" size={64} color={theme.colors.textLight} />
        <Text style={styles.noTeamText}>
          You must be in a team to access chat
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading && <LoadingOverlay visible={true} />}
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        style={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />
      
      {typingUsers.length > 0 && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </Text>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={messageText}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          placeholderTextColor={theme.colors.textLight}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { opacity: messageText.trim() ? 1 : 0.5 }
          ]}
          onPress={handleSendMessage}
          disabled={!messageText.trim()}
        >
          <Ionicons name="send" size={20} color={theme.colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  noTeamContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  noTeamText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  messagesList: {
    flex: 1,
    padding: theme.spacing.md,
  },
  messageContainer: {
    marginBottom: theme.spacing.lg,
    position: 'relative',
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  username: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.white,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  messageText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.white,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.white,
    opacity: 0.7,
    marginTop: theme.spacing.xs,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    position: 'absolute',
    bottom: -8,
    zIndex: 1,
  },
  reactionsLeft: {
    left: 0,
  },
  reactionsRight: {
    right: 0,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: 10,
    marginLeft: 2,
    color: theme.colors.text,
  },
  emojiPicker: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: -20,
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 2,
  },
  emojiPickerLeft: {
    left: 0,
  },
  emojiPickerRight: {
    right: 0,
  },
  emojiButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  emoji: {
    fontSize: 16,
  },
  typingContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  typingText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    maxHeight: 100,
    fontSize: theme.typography.body.fontSize,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginLeft: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
