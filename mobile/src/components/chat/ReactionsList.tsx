import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';
import { ChatReaction } from '../../api/chatService';

interface ReactionsListProps {
  reactions: ChatReaction[];
  isOwnMessage: boolean;
  onReactionPress: (emoji: string) => void;
}

export const ReactionsList: React.FC<ReactionsListProps> = ({
  reactions,
  isOwnMessage,
  onReactionPress
}) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <View style={[
      styles.reactionsContainer,
      isOwnMessage ? styles.reactionsRight : styles.reactionsLeft
    ]}>
      {reactions.map((reaction, index) => (
        <TouchableOpacity
          key={index}
          style={styles.reactionBubble}
          onPress={() => onReactionPress(reaction.emoji)}
          activeOpacity={0.7}
        >
          <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
          <Text style={styles.reactionCount}>{reaction.count}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    position: 'absolute',
    bottom: -10,
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
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    marginLeft: 4,
    color: theme.colors.text,
    fontWeight: '600',
  },
});
