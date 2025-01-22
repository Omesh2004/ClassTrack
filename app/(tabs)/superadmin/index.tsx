import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TextInput,
  Button,
  Alert,
  TouchableOpacity,
  SafeAreaView,
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

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyATZSCZdADIJGYJcnd58Cwg9S9bV2yFYnE",
  authDomain: "attendance-app-7a21e.firebaseapp.com",
  projectId: "attendance-app-7a21e",
  storageBucket: "attendance-app-7a21e.appspot.com",
  messagingSenderId: "47121417247",
  appId: "1:47121417247:web:1e086ee27fe10c20e9412a",
  measurementId: "G-SMF4LTTV59",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Screen dimensions and scaling
const { width } = Dimensions.get('window');
const scaleFont = (size: number) => Math.round((width / 375) * size);

const COLUMN_WIDTHS = {
  name: '25%',
  email: '35%',
  role: '20%',
  uid: '20%',
};

const App: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [newRow, setNewRow] = useState({ name: '', email: '', role: '' });

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
    try {
      const newDoc = await addDoc(collection(firestore, 'users'), newRow);
      setUsers([...users, { id: newDoc.id, ...newRow }]);
      setNewRow({ name: '', email: '', role: '', uid: '' });
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const TableCell = ({ children, width, isLastColumn = false }) => (
    <View
      style={[
        styles.cellContainer,
        { width },
        !isLastColumn && styles.cellBorder,
      ]}
    >
      <Text style={styles.cellText} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );

  const renderTableHeader = () => (
    <View style={styles.headerRow}>
      <TableCell width={COLUMN_WIDTHS.name}>Name</TableCell>
      <TableCell width={COLUMN_WIDTHS.email}>Email</TableCell>
      <TableCell width={COLUMN_WIDTHS.role}>Role</TableCell>
      
      <TableCell width={'15%'} isLastColumn>
        Actions
      </TableCell>
    </View>
  );

  const renderTableRow = ({ item }: { item: any }) => {
    const isEditing = editingRow === item.id;

    return (
      <View style={styles.row}>
        {isEditing ? (
          <>
            <TextInput
              style={[styles.input, { width: COLUMN_WIDTHS.name }]}
              value={item.name}
              onChangeText={(text) =>
                setUsers(users.map((user) =>
                  user.id === item.id ? { ...user, name: text } : user
                ))
              }
            />
            <TextInput
              style={[styles.input, { width: COLUMN_WIDTHS.email }]}
              value={item.email}
              onChangeText={(text) =>
                setUsers(users.map((user) =>
                  user.id === item.id ? { ...user, email: text } : user
                ))
              }
            />
            <TextInput
              style={[styles.input, { width: COLUMN_WIDTHS.role }]}
              value={item.role}
              onChangeText={(text) =>
                setUsers(users.map((user) =>
                  user.id === item.id ? { ...user, role: text } : user
                ))
              }
            />
           
            <TouchableOpacity
              onPress={() => handleEdit(item.id, item)}
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>Save</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TableCell width={COLUMN_WIDTHS.name}>{item.name}</TableCell>
            <TableCell width={COLUMN_WIDTHS.email}>{item.email}</TableCell>
            <TableCell width={COLUMN_WIDTHS.role}>{item.role}</TableCell>
            
            <TouchableOpacity
              onPress={() => setEditingRow(item.id)}
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderTableHeader}
        renderItem={renderTableRow}
        stickyHeaderIndices={[0]}
      />
      <View style={styles.addForm}>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={newRow.name}
          onChangeText={(text) => setNewRow({ ...newRow, name: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={newRow.email}
          onChangeText={(text) => setNewRow({ ...newRow, email: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Role"
          value={newRow.role}
          onChangeText={(text) => setNewRow({ ...newRow, role: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="UID"
          value={newRow.uid}
          onChangeText={(text) => setNewRow({ ...newRow, uid: text })}
        />
        <Button title="Add User" onPress={handleAdd} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  headerRow: { flexDirection: 'row', backgroundColor: '#007BFF', padding: 10 },
  row: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  cellContainer: { justifyContent: 'center', padding: 10 },
  cellBorder: { borderRightWidth: 1, borderRightColor: '#ddd' },
  cellText: { fontSize: scaleFont(14) },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 8, marginBottom: 10, borderRadius: 4 },
  actionButton: { backgroundColor: '#28a745', padding: 8, borderRadius: 4, marginHorizontal: 4 },
  deleteButton: { backgroundColor: '#dc3545', padding: 8, borderRadius: 4 },
  actionText: { color: '#fff' },
  deleteText: { color: '#fff' },
  addForm: { marginTop: 16 },
});

export default App;
