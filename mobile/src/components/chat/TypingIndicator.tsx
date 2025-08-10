import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../../theme/theme';

interface TypingIndicatorProps {
  typingUsers: string[];
  visible: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  visible
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && typingUsers.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const animateDots = () => {
        Animated.sequence([
          Animated.timing(dotAnim1, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dotAnim2, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dotAnim3, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dotAnim1, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(dotAnim2, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(dotAnim3, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => {
          if (visible && typingUsers.length > 0) {
            animateDots();
          }
        });
      };
      animateDots();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, typingUsers.length]);

  if (!visible || typingUsers.length === 0) return null;

  const typingText = `${typingUsers.join(', ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing`;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.typingText}>{typingText}</Text>
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, { opacity: dotAnim1 }]} />
        <Animated.View style={[styles.dot, { opacity: dotAnim2 }]} />
        <Animated.View style={[styles.dot, { opacity: dotAnim3 }]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  typingText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textLight,
    fontStyle: 'italic',
    marginRight: theme.spacing.sm,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textLight,
    marginHorizontal: 1,
  },
});
