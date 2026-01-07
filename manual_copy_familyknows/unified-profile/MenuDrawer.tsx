// src/components/navigation/MenuDrawer.tsx
import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';

interface MenuDrawerProps {
  visible: boolean;
  onClose: () => void;
}

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export const MenuDrawer: React.FC<MenuDrawerProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();

  // Get user info from AuthContext
  const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User' : 'User';
  const userEmail = user?.email || 'user@example.com';

  // Simplified menu - Unified Profile consolidates multiple settings
  const menuItems = [
    {
      id: 'profile',
      title: 'My Profile',
      subtitle: 'Personal info, theme, language',
      icon: 'account-circle',
      screen: 'UnifiedProfile',
      params: {},
    },
    {
      id: 'family',
      title: 'Family Settings',
      subtitle: 'Members & invitations',
      icon: 'account-group',
      screen: 'SettingsFamily',
      params: { isFromSettings: true },
    },
    {
      id: 'pricing',
      title: 'Subscription',
      subtitle: 'Plans & billing',
      icon: 'crown',
      screen: 'SettingsPricing',
      params: {},
    },
    {
      id: 'divider',
      isDivider: true,
    },
    {
      id: 'help',
      title: 'Help & Support',
      icon: 'help-circle',
      action: 'help',
    },
    {
      id: 'about',
      title: 'About',
      icon: 'information',
      action: 'about',
    },
    {
      id: 'logout',
      title: 'Sign Out',
      icon: 'logout',
      action: 'logout',
    },
  ];

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            onClose();
            try {
              await logout();
              // Navigate to login after logout
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              // Still navigate to login even on error
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          },
        },
      ]
    );
  };

  const handleMenuItemPress = (item: any) => {
    if (item.screen) {
      onClose();
      navigation.navigate(item.screen as any, item.params);
    } else if (item.action) {
      switch (item.action) {
        case 'logout':
          handleLogout();
          break;
        case 'help':
          onClose();
          // Handle help - could navigate to a help screen or open URL
          break;
        case 'about':
          onClose();
          // Handle about - could navigate to an about screen
          break;
      }
    }
  };

  const renderMenuItem = (item: any) => {
    if (item.isDivider) {
      return (
        <View
          key={item.id}
          style={[styles.menuDivider, { backgroundColor: theme.colors.utility.secondaryText + '20' }]}
        />
      );
    }

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.menuItem}
        onPress={() => handleMenuItemPress(item)}
      >
        <View style={[
          styles.menuIconContainer,
          { backgroundColor: item.id === 'logout' ? theme.colors.semantic.error + '15' : theme.colors.brand.primary + '15' }
        ]}>
          <MaterialCommunityIcons
            name={item.icon}
            size={22}
            color={item.id === 'logout' ? theme.colors.semantic.error : theme.colors.brand.primary}
          />
        </View>
        <View style={styles.menuItemContent}>
          <Text style={[
            styles.menuItemText,
            { color: item.id === 'logout' ? theme.colors.semantic.error : theme.colors.utility.primaryText }
          ]}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text style={[styles.menuItemSubtitle, { color: theme.colors.utility.secondaryText }]}>
              {item.subtitle}
            </Text>
          )}
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={theme.colors.utility.secondaryText}
        />
      </TouchableOpacity>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[
              styles.menuContainer,
              { backgroundColor: theme.colors.utility.primaryBackground }
            ]}>
              {/* Menu Header */}
              <View style={styles.menuHeader}>
                <View style={styles.menuProfile}>
                  <View style={[styles.profileAvatar, { backgroundColor: theme.colors.brand.primary }]}>
                    <Text style={styles.profileInitials}>{getInitials(userName)}</Text>
                  </View>
                  <View>
                    <Text style={[styles.profileName, { color: theme.colors.utility.primaryText }]}>
                      {userName}
                    </Text>
                    <Text style={[styles.profileEmail, { color: theme.colors.utility.secondaryText }]}>
                      {userEmail}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose}>
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={theme.colors.utility.secondaryText}
                  />
                </TouchableOpacity>
              </View>

              {/* Menu Items */}
              <ScrollView style={styles.menuItems} showsVerticalScrollIndicator={false}>
                {menuItems.map(renderMenuItem)}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  menuProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  menuItems: {
    flex: 1,
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  menuIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuItemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    marginVertical: 16,
  },
});
