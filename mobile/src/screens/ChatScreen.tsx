import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import { theme } from '../theme/theme';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { MessageItem } from '../components/chat/MessageItem';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { ChatInput } from '../components/chat/ChatInput';
import { TypingManager } from '../utils/typingManager';

export const ChatScreen = () => {
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingManagerRef = useRef<TypingManager | null>(null);

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
    typingManagerRef.current = new TypingManager(
      () => setTyping(true),
      () => setTyping(false)
    );
    
    return () => {
      typingManagerRef.current?.cleanup();
    };
  }, [setTyping]);

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
    typingManagerRef.current?.stop();
    
    try {
      await sendMessageStore(message);
      sendMessage(message);
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleTextChange = (text: string) => {
    setMessageText(text);
    typingManagerRef.current?.handleTextChange(text);
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

  const handleToggleEmojiPicker = (messageId: number) => {
    setShowEmojiPicker(showEmojiPicker === messageId ? null : messageId);
  };

  const renderMessage = ({ item }: { item: any }) => (
    <MessageItem
      message={item}
      currentUserId={user?.id}
      onReaction={handleReaction}
      showEmojiPicker={showEmojiPicker === item.id}
      onToggleEmojiPicker={() => handleToggleEmojiPicker(item.id)}
    />
  );

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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {isLoading && <LoadingOverlay visible={true} />}
      
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        style={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        showsVerticalScrollIndicator={false}
      />
      
      <TypingIndicator
        typingUsers={typingUsers}
        visible={typingUsers.length > 0}
      />
      
      <ChatInput
        value={messageText}
        onChangeText={handleTextChange}
        onSend={handleSendMessage}
      />
    </KeyboardAvoidingView>
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
});
