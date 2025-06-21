import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
} from 'firebase/firestore';
import Icon from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyATZSCZdADIJGYJcnd58Cwg9S9bV2yFYnE",
  authDomain: "attendance-app-7a21e.firebaseapp.com",
  projectId: "attendance-app-7a21e",
  storageBucket: "attendance-app-7a21e.firebasestorage.app",
  messagingSenderId: "47121417247",
  appId: "1:47121417247:web:1e086ee27fe10c20e9412a",
  measurementId: "G-SMF4LTTV59",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Screen dimensions and scaling
const { width, height } = Dimensions.get('window');
const scaleFont = (size: number) => Math.round((width / 375) * size);
const scalePadding = (size: number) => Math.round((width / 375) * size);
const isDesktop = width >= 768;

const App: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [newRow, setNewRow] = useState({ name: '', email: '', role: '', uid: '' });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCollection = collection(firestore, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(firestore, 'users', id));
              setUsers(users.filter((user) => user.id !== id));
              Alert.alert('Success', 'User deleted successfully.');
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete the user.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleEdit = async (id: string, updatedData: any) => {
    try {
      await updateDoc(doc(firestore, 'users', id), updatedData);
      setUsers(users.map((user) => (user.id === id ? { ...user, ...updatedData } : user)));
      setEditingRow(null);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleAdd = async () => {
    if (!newRow.name || !newRow.email || !newRow.role) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    try {
      const newDoc = await addDoc(collection(firestore, 'users'), newRow);
      setUsers([...users, { id: newDoc.id, ...newRow }]);
      setNewRow({ name: '', email: '', role: '', uid: '' });
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUserCard = ({ item }: { item: any }) => {
    const isEditing = editingRow === item.id;

    return (
      <View style={styles.userCard}>
        {isEditing ? (
          <View style={styles.editingContainer}>
            <TextInput
              style={styles.editInput}
              value={item.name}
              onChangeText={(text) =>
                setUsers(users.map((user) =>
                  user.id === item.id ? { ...user, name: text } : user
                ))
              }
              placeholder="Name"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.editInput}
              value={item.email}
              onChangeText={(text) =>
                setUsers(users.map((user) =>
                  user.id === item.id ? { ...user, email: text } : user
                ))
              }
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.editInput}
              value={item.role}
              onChangeText={(text) =>
                setUsers(users.map((user) =>
                  user.id === item.id ? { ...user, role: text } : user
                ))
              }
              placeholder="Role"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.editActions}>
              <TouchableOpacity
                onPress={() => handleEdit(item.id, item)}
                style={styles.saveButton}
              >
                <Icon name="save" size={20} color="#fff" />
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditingRow(null)}
                style={styles.cancelButton}
              >
                <Icon name="close" size={20} color="#fff" />
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <View style={styles.roleContainer}>
                  <Text style={styles.roleText}>{item.role}</Text>
                </View>
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => setEditingRow(item.id)}
                style={styles.editButton}
              >
                <Icon name="edit" size={18} color="#6366F1" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                style={styles.deleteButton}
              >
                <Icon name="delete" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      
      {/* Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Attendance Manager</Text>
        <Text style={styles.headerSubtitle}>Manage your team efficiently</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Add User Form */}
        <View style={styles.addUserSection}>
          <Text style={styles.sectionTitle}>Add New User</Text>
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Icon name="person" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.modernInput}
                placeholder="Full Name"
                value={newRow.name}
                onChangeText={(text) => setNewRow({ ...newRow, name: text })}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Icon name="email" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.modernInput}
                placeholder="Email Address"
                value={newRow.email}
                onChangeText={(text) => setNewRow({ ...newRow, email: text })}
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Icon name="work" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.modernInput}
                placeholder="Role/Position"
                value={newRow.role}
                onChangeText={(text) => setNewRow({ ...newRow, role: text })}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.addButtonGradient}
              >
                <Icon name="add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add User</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Team Members ({filteredUsers.length})</Text>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Users List */}
        <View style={styles.usersSection}>
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderUserCard}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Icon name="people" size={64} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>No users found</Text>
                <Text style={styles.emptyStateSubtext}>
                  {searchQuery ? 'Try adjusting your search' : 'Add your first team member above'}
                </Text>
              </View>
            )}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: scalePadding(20),
    paddingBottom: scalePadding(30),
    paddingHorizontal: scalePadding(20),
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: scaleFont(28),
    fontWeight: '700',
    color: '#fff',
    marginBottom: scalePadding(4),
  },
  headerSubtitle: {
    fontSize: scaleFont(16),
    color: '#E0E7FF',
    fontWeight: '400',
  },
  content: {
    flex: 1,
    paddingHorizontal: scalePadding(20),
  },
  addUserSection: {
    marginTop: scalePadding(24),
  },
  sectionTitle: {
    fontSize: scaleFont(20),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: scalePadding(16),
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: scalePadding(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: scalePadding(16),
    paddingHorizontal: scalePadding(16),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    marginRight: scalePadding(12),
  },
  modernInput: {
    flex: 1,
    height: 50,
    fontSize: scaleFont(16),
    color: '#1F2937',
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: scalePadding(8),
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scalePadding(16),
    paddingHorizontal: scalePadding(24),
  },
  addButtonText: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontWeight: '600',
    marginLeft: scalePadding(8),
  },
  searchSection: {
    marginTop: scalePadding(32),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: scalePadding(16),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: scalePadding(12),
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: scaleFont(16),
    color: '#1F2937',
  },
  usersSection: {
    marginTop: scalePadding(20),
    marginBottom: scalePadding(32),
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: scalePadding(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scalePadding(16),
  },
  avatarText: {
    color: '#fff',
    fontSize: scaleFont(18),
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: scalePadding(4),
  },
  userEmail: {
    fontSize: scaleFont(14),
    color: '#6B7280',
    marginBottom: scalePadding(8),
  },
  roleContainer: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: scalePadding(12),
    paddingVertical: scalePadding(4),
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: scaleFont(12),
    color: '#6366F1',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: scalePadding(16),
  },
  editButton: {
    padding: scalePadding(8),
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    marginRight: scalePadding(8),
  },
  deleteButton: {
    padding: scalePadding(8),
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  cardSeparator: {
    height: scalePadding(12),
  },
  editingContainer: {
    gap: scalePadding(12),
  },
  editInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: scalePadding(12),
    paddingVertical: scalePadding(12),
    fontSize: scaleFont(16),
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editActions: {
    flexDirection: 'row',
    gap: scalePadding(12),
    marginTop: scalePadding(8),
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: scalePadding(12),
    borderRadius: 8,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B7280',
    paddingVertical: scalePadding(12),
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: scaleFont(14),
    fontWeight: '500',
    marginLeft: scalePadding(4),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: scalePadding(48),
  },
  emptyStateText: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#6B7280',
    marginTop: scalePadding(16),
    marginBottom: scalePadding(8),
  },
  emptyStateSubtext: {
    fontSize: scaleFont(14),
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default App;