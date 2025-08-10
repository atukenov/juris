import React, { useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  maxLength?: number;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  placeholder = "Type a message...",
  maxLength = 500
}) => {
  const sendButtonScale = useRef(new Animated.Value(0.8)).current;
  const hasText = value.trim().length > 0;

  useEffect(() => {
    Animated.spring(sendButtonScale, {
      toValue: hasText ? 1 : 0.8,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [hasText]);

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textLight}
          multiline
          maxLength={maxLength}
          textAlignVertical="top"
        />
      </View>
      <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            { opacity: hasText ? 1 : 0.5 }
          ]}
          onPress={onSend}
          disabled={!hasText}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={20} color={theme.colors.white} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  inputWrapper: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.white,
    maxHeight: 100,
    fontSize: theme.typography.body.fontSize,
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
});
