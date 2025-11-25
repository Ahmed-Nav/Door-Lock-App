// components/AdminHomeScreen.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useAuth } from '../auth/AuthContext';

import DropDownPicker from 'react-native-dropdown-picker';
import { useState } from 'react';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AdminHomeScreen() {
  const nav = useNavigation<Nav>();
  const { user, signOut, activeWorkspace, switchWorkspace, isLoading } =
    useAuth();
    const [open, setOpen] = useState(false);

    const items =
      user?.workspaces.map(w => ({
        label: w.name || `Workspace ${w.workspace_id.slice(-4)}`, 
        value: w.workspace_id,
      })) || [];

    const confirmSignOut = () => {
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
            onPress: signOut,
            style: 'destructive',
          },
        ],
        { cancelable: false }
      );
    };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Admin Dashboard</Text>
        <Text style={s.subtitle}>{user?.email}</Text>
      </View>

      <View style={{ zIndex: 1000 }}>
        <Text style={s.label}>Active Workspace</Text>
        <DropDownPicker
          open={open}
          value={activeWorkspace?.workspace_id || null}
          items={items}
          setOpen={setOpen}
          setValue={callback => {
            const newId = callback();
            if (newId) {
              switchWorkspace(newId);
            }
          }}
          style={s.dropdown}
          textStyle={{ color: 'white' }}
          dropDownContainerStyle={s.dropdownContainer}
          placeholder="Select a workspace"
          loading={isLoading}
        />
      </View>

      <View style={s.grid}>
        <TouchableOpacity
          style={[s.card, { backgroundColor: '#7B1FA2' }]}
          onPress={() => nav.navigate('LocksHome')}
        >
          <Text style={s.cardTitle}>Manage Locks</Text>
          <Text style={s.desc}>View, rename, and manage lock access</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.card, { backgroundColor: '#7B1FA2' }]}
          onPress={() => nav.navigate('UserManagement')}
        >
          <Text style={s.cardTitle}>Manage Users</Text>
          <Text style={s.desc}>View users and assign admin roles</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.signOut} onPress={confirmSignOut}>
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 4,
  },
  grid: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 20,
  },
  card: {
    backgroundColor: '#7B1FA2',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  icon: {
    fontSize: 36,
    marginBottom: 10,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  desc: {
    color: '#e5e5e5',
    fontSize: 13,
    marginTop: 4,
  },
  signOut: {
    backgroundColor: '#1d1d25',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  signOutText: {
    color: '#ff5c5c',
    fontWeight: '600',
  },
  label: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  dropdown: {
    backgroundColor: '#1d1d25',
    borderColor: '#2a2a33',
    marginBottom: 20,
  },
  dropdownContainer: {
    backgroundColor: '#1d1d25',
    borderColor: '#2a2a33',
  },
});
