import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';

const UserManagementScreen = () => {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('');

  // Edit user state
  const [editingUserId, setEditingUserId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCollection = collection(db,'users');
        const usersQuery = query(usersCollection, orderBy('createdAt', 'desc'));
        const usersSnapshot = await getDocs(usersQuery);
        const usersList = usersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.userDetails?.name || '',
            email: data.userDetails?.email || '',
            role: data.role || '',
            status: data.status || 'Active',
            createdAt: data.createdAt || '',
            userKey: data.userKey || '',
            userDetails: data.userDetails || {}
          };
        });
        setUsers(usersList);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const toggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Disabled' : 'Active';
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status: newStatus });
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, status: newStatus }
          : user
      ));
    } catch (error) {
      Alert.alert('Error', 'Failed to update user status: ' + error.message);
    }
  };

  const deleteUser = async (userId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteDoc(doc(db, 'users', userId));
            setUsers(users.filter(user => user.id !== userId));
            Alert.alert('Deleted', 'User deleted successfully');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete user: ' + error.message);
          }
        }}
      ]
    );
  };

  const filteredUsers = users.filter(user =>
    (user.name && typeof user.name === 'string' && user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.email && typeof user.email === 'string' && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddUser = async () => {
    if (!newName || !newEmail || !newRole) {
      Alert.alert('Error', 'Please fill all fields to add a new user.');
      return;
    }
    try {
      const usersCollection = collection(db, 'users');
      const createdAt = new Date().toISOString();
      const docRef = await addDoc(usersCollection, {
        name: newName,
        email: newEmail,
        role: newRole,
        status: 'Active',
        createdAt: createdAt
      });
      setUsers([...users, { id: docRef.id, name: newName, email: newEmail, role: newRole, status: 'Active', createdAt }]);
      setNewName('');
      setNewEmail('');
      setNewRole('');
      Alert.alert('Success', 'User added successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to add user: ' + error.message);
    }
  };

  const startEditingUser = (user) => {
    setEditingUserId(user.id);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditRole(user.role || '');
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditName('');
    setEditEmail('');
    setEditRole('');
  };

  const saveUserEdits = async () => {
    if (!editName || !editEmail || !editRole) {
      Alert.alert('Error', 'Please fill all fields to update the user.');
      return;
    }
    try {
      const userRef = doc(db, 'users', editingUserId);
      await updateDoc(userRef, {
        name: editName,
        email: editEmail,
        role: editRole
      });
      setUsers(users.map(user =>
        user.id === editingUserId
          ? { ...user, name: editName, email: editEmail, role: editRole }
          : user
      ));
      cancelEditing();
      Alert.alert('Success', 'User updated successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update user: ' + error.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  const renderStatusBadge = (status) => {
    const isActive = status === 'Active';
    return (
      <View style={[styles.statusBadge, isActive ? styles.activeStatus : styles.disabledStatus]}>
        <Text style={styles.statusBadgeText}>{status}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}>
        <Text style={styles.header}>User Management</Text>
        
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
          accessibilityLabel="Search users"
        />

        <FlatList
          data={filteredUsers}
          renderItem={({item}) => (
            <TouchableOpacity style={styles.userCard} onPress={() => navigation.navigate('UserDetailScreen', { userId: item.id })} accessibilityLabel={`View details for ${item.name}`}>
              {editingUserId === item.id ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Name</Text>
                    <TextInput
                      style={styles.input}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Name"
                      placeholderTextColor="#999"
                      accessibilityLabel="Edit name"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={editEmail}
                      onChangeText={setEditEmail}
                      placeholder="Email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#999"
                      accessibilityLabel="Edit email"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Role</Text>
                    <TextInput
                      style={styles.input}
                      value={editRole}
                      onChangeText={setEditRole}
                      placeholder="Role (Admin, Staff, Client)"
                      placeholderTextColor="#999"
                      accessibilityLabel="Edit role"
                    />
                  </View>
                  <View style={styles.buttonsRow}>
                    <TouchableOpacity
                      style={[styles.saveButton, { width: 100 }]}
                      onPress={saveUserEdits}
                      accessibilityLabel="Save user edits"
                    >
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cancelButton, { width: 100 }]}
                      onPress={cancelEditing}
                      accessibilityLabel="Cancel editing"
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.userInfoRow}>
                    <Text style={styles.userName}>{item.name}</Text>
                    {renderStatusBadge(item.status || 'Active')}
                  </View>
                  <Text style={styles.userEmail}>{item.email}</Text>
                  <View style={styles.userInfoRow}>
                    <Text style={styles.userRole}>Role: {item.role}</Text>
                    <Text style={styles.userCreatedAt}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}</Text>
                  </View>
                  <View style={styles.buttonsRow}>
                    <TouchableOpacity
                      style={[styles.iconButton, (item.status || 'Active') === 'Active' ? styles.disableButton : styles.enableButton]}
                      onPress={() => toggleUserStatus(item.id, item.status || 'Active')}
                      accessibilityLabel={(item.status || 'Active') === 'Active' ? 'Disable user' : 'Enable user'}
                    >
                      <MaterialIcons name={(item.status || 'Active') === 'Active' ? 'block' : 'check-circle'} size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => deleteUser(item.id)}
                      accessibilityLabel="Delete user"
                    >
                      <MaterialIcons name="delete" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconButton, { marginLeft: 10 }]}
                      onPress={() => startEditingUser(item)}
                      accessibilityLabel="Edit user"
                    >
                      <MaterialIcons name="edit" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 30 }}
        />

        <View style={styles.addUserContainer}>
          <Text style={styles.addUserHeader}>Add New User</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={newName}
              onChangeText={setNewName}
              placeholderTextColor="#999"
              accessibilityLabel="New user name"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
              accessibilityLabel="New user email"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Role</Text>
            <TextInput
              style={styles.input}
              placeholder="Role (Admin, Staff, Client)"
              value={newRole}
              onChangeText={setNewRole}
              placeholderTextColor="#999"
              accessibilityLabel="New user role"
            />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddUser} accessibilityLabel="Add new user">
            <Text style={styles.addButtonText}>Add User</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    marginVertical: 20,
    textAlign: 'center',
    color: '#333',
    marginTop: -10,
  },
  searchInput: {
    height: 45,
    borderColor: '#bbb',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fafafa',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  userEmail: {
    fontSize: 15,
    color: '#666',
    marginVertical: 6,
  },
  userRole: {
    fontSize: 14,
    color: '#444',
  },
  userCreatedAt: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  activeStatus: {
    backgroundColor: '#5cb85c',
  },
  disabledStatus: {
    backgroundColor: '#d9534f',
  },
  statusBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  iconButton: {
    backgroundColor: '#4285F4',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disableButton: {
    backgroundColor: '#d9534f',
  },
  enableButton: {
    backgroundColor: '#5cb85c',
  },
  addButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 15,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderColor: '#bbb',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#222',
    backgroundColor: '#fafafa',
  },
  addUserContainer: {
    marginTop: 30,
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  addUserHeader: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 15,
    color: '#333',
  },
});

export default UserManagementScreen;
