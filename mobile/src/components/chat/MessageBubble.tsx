import React from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { theme } from '../../theme/theme';
import { getUserColor, formatTime } from '../../utils/chatUtils';
import { ChatMessage } from '../../api/chatService';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  onLongPress: () => void;
  animatedValue?: Animated.Value;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  onLongPress,
  animatedValue
}) => {
  const userColor = getUserColor(message.username);
  
  const bubbleStyle = [
    styles.messageBubble,
    isOwnMessage 
      ? { backgroundColor: theme.colors.primary }
      : { backgroundColor: userColor }
  ];

  const AnimatedPressable = animatedValue ? Animated.createAnimatedComponent(Pressable) : Pressable;
  const animatedStyle = animatedValue ? {
    transform: [{ scale: animatedValue }]
  } : {};

  return (
    <AnimatedPressable
      onLongPress={onLongPress}
      style={[bubbleStyle, animatedStyle]}
    >
      <Text style={styles.username}>{message.username}</Text>
      <Text style={styles.messageText}>{message.message}</Text>
      <Text style={styles.timestamp}>
        {formatTime(message.created_at)}
      </Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  messageBubble: {
    maxWidth: '80%',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
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
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.white,
    opacity: 0.7,
    marginTop: theme.spacing.xs,
  },
});
