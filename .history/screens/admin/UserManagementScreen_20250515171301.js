import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';


const UserManagementScreen = () => {
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
          console.log('Fetched user doc:', doc.id, doc.data());
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
        console.log('Total users fetched:', usersList.length);
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <Text style={styles.header}>User Management</Text>
        
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <FlatList
          data={filteredUsers}
          renderItem={({item}) => (
            <View style={styles.userCard}>
              {editingUserId === item.id ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Name"
                    placeholderTextColor="#666"
                  />
                  <TextInput
                    style={styles.input}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#666"
                  />
                  <TextInput
                    style={styles.input}
                    value={editRole}
                    onChangeText={setEditRole}
                    placeholder="Role (Admin, Staff, Client)"
                    placeholderTextColor="#666"
                  />
                  <View style={styles.buttonsRow}>
                    <TouchableOpacity
                      style={[styles.addButton, { width: 100 }]}
                      onPress={saveUserEdits}
                    >
                      <Text style={styles.addButtonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cancelButton, { width: 100 }]}
                      onPress={cancelEditing}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                  <Text style={styles.userRole}>Role: {item.role}</Text>
                  <Text style={styles.userStatus}>Status: {item.status || 'Active'}</Text>
                  <Text style={styles.userCreatedAt}>Created At: {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}</Text>
                  <View style={styles.buttonsRow}>
                    <TouchableOpacity
                      style={[
                        styles.statusButton,
                        (item.status || 'Active') === 'Active' ? styles.disableButton : styles.enableButton
                      ]}
                      onPress={() => toggleUserStatus(item.id, item.status || 'Active')}
                    >
                      <Text style={styles.buttonText}>
                        {(item.status || 'Active') === 'Active' ? 'Disable' : 'Enable'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteUser(item.id)}
                    >
                      <Text style={styles.buttonText}>Delete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.addButton, { width: 100, marginLeft: 10 }]}
                      onPress={() => startEditingUser(item)}
                    >
                      <Text style={styles.addButtonText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 30 }}
        />

        <View style={styles.addUserContainer}>
          <Text style={styles.addUserHeader}>Add New User</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={newName}
            onChangeText={setNewName}
            placeholderTextColor="#666"
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#666"
          />
          <TextInput
            style={styles.input}
            placeholder="Role (Admin, Staff, Client)"
            value={newRole}
            onChangeText={setNewRole}
            placeholderTextColor="#666"
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddUser}>
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
    fontSize: 24,
    fontWeight: 'bold',
    margin: 16,
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  userCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    color: '#000',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  addButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#aaa',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 10,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  userRole: {
    fontSize: 14,
    marginTop: 4,
  },
  userStatus: {
    fontSize: 14,
    marginTop: 4,
  },
  userCreatedAt: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  disableButton: {
    backgroundColor: '#d9534f',
  },
  enableButton: {
    backgroundColor: '#5cb85c',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  addUserContainer: {
    marginTop: 20,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
  },
  addUserHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
});

export default UserManagementScreen;
