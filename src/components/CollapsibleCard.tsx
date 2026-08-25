import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { colors, radii, spacing } from '@/theme';

type CollapsibleCardProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBackground: string;
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function CollapsibleCard({
  icon,
  iconColor,
  iconBackground,
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: CollapsibleCardProps) {
  const rotation = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotation, { toValue: expanded ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [expanded, rotation]);

  const chevronStyle = {
    transform: [
      {
        rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }),
      },
    ],
  };

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}, toque para ${expanded ? 'recolher' : 'expandir'}`}
      >
        <View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={20} color={colors.slate400} />
        </Animated.View>
      </TouchableOpacity>

      {expanded ? <View style={styles.body}>{children}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  body: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
