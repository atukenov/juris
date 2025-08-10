import React, { useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { theme } from '../../theme/theme';
import { ChatMessage } from '../../api/chatService';
import { MessageBubble } from './MessageBubble';
import { EmojiPicker } from './EmojiPicker';
import { ReactionsList } from './ReactionsList';

interface MessageItemProps {
  message: ChatMessage;
  currentUserId?: string;
  onReaction: (messageId: number, emoji: string) => void;
  showEmojiPicker: boolean;
  onToggleEmojiPicker: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  onReaction,
  showEmojiPicker,
  onToggleEmojiPicker
}) => {
  const isOwnMessage = message.user_id === currentUserId;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleLongPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
    
    onToggleEmojiPicker();
  };

  const handleEmojiSelect = (emoji: string) => {
    onReaction(message.id, emoji);
  };

  const handleReactionPress = (emoji: string) => {
    onReaction(message.id, emoji);
  };

  return (
    <View style={[
      styles.messageContainer,
      isOwnMessage ? styles.ownMessage : styles.otherMessage
    ]}>
      <MessageBubble
        message={message}
        isOwnMessage={isOwnMessage}
        onLongPress={handleLongPress}
        animatedValue={scaleAnim}
      />
      
      <ReactionsList
        reactions={message.reactions}
        isOwnMessage={isOwnMessage}
        onReactionPress={handleReactionPress}
      />
      
      <EmojiPicker
        visible={showEmojiPicker}
        isOwnMessage={isOwnMessage}
        onEmojiSelect={handleEmojiSelect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: theme.spacing.xl,
    position: 'relative',
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
});
