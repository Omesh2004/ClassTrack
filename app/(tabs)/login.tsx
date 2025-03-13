import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView,Platform} from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import * as Application from 'expo-application';
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyATZSCZdADIJGYJcnd58Cwg9S9bV2yFYnE",
  authDomain: "attendance-app-7a21e.firebaseapp.com",
  projectId: "attendance-app-7a21e",
  storageBucket: "attendance-app-7a21e.appspot.com",
  messagingSenderId: "47121417247",
  appId: "1:47121417247:web:1e086ee27fe10c20e9412a",
  measurementId: "G-SMF4LTTV59"
};
const getUniqueId = async () => {
  try {
    let storedId = await AsyncStorage.getItem('deviceUniqueId');

    if (!storedId) {
      if (Platform.OS === 'web') {
        storedId = localStorage.getItem('deviceUniqueId') || uuidv4();
        localStorage.setItem('deviceUniqueId', storedId);
      } else if (Platform.OS === 'android') {
        storedId = Application.androidId || uuidv4();
      } else if (Platform.OS === 'ios') {
        storedId = await SecureStore.getItemAsync('deviceUniqueId');
        if (!storedId) {
          storedId = uuidv4();
          await SecureStore.setItemAsync('deviceUniqueId', storedId);
        }
      }

      await AsyncStorage.setItem('deviceUniqueId', storedId);
    }

    return storedId;
  } catch (error) {
    console.error('Error generating device ID:', error);
    return 'error-id';
  }
};
const storeDeviceIdInFirestore = async (deviceId: string) => {
    try {
      const deviceType = Platform.OS; // ios, android, or web
      const docRef = doc(firestore, 'devices', deviceId); // Store ID as document name
  
      await setDoc(docRef, {
        deviceId,
        deviceType,
        timestamp: new Date().toISOString(),
      });
  
      console.log('Device ID stored in Firestore:', deviceId);
    } catch (error) {
      console.error('Error storing device ID:', error);
    }
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
interface AuthScreenProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  isLogin: boolean;
  setIsLogin: (isLogin: boolean) => void;
  handleAuthentication: () => void;
  authError: string;
  role: string;
  setRole: (role: string) => void;
  name: string;
  setName: (name: string) => void;
}
// Authentication Screen Component
const AuthScreen = ({ email, setEmail, password, setPassword, isLogin, setIsLogin, handleAuthentication, authError, role, setRole, name, setName }: AuthScreenProps) => {
  return (
    <View style={styles.authContainer}>
      <Text style={styles.title}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      {!isLogin && (
        <>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Full Name"
            autoCapitalize="words"
          />
           <Picker
            selectedValue={role}
            onValueChange={(value) => setRole(value)}
            style={styles.Picker}
          >
            <Picker.Item label="Select Role" value="" />
            <Picker.Item label="Student" value="Student" />
            <Picker.Item label="Admin" value="Admin" />
            <Picker.Item label="Super-Admin" value="Super-Admin" />
          </Picker>
        </>
      )}
      {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
      <View style={styles.buttonContainer}>
        <Button title={isLogin ? 'Sign In' : 'Sign Up'} onPress={handleAuthentication} color="#3498db" />
      </View>
      <View style={styles.bottomContainer}>
        <Text style={styles.toggleText} onPress={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
        </Text>
      </View>
    </View>
  );
};
interface AuthenticatedScreenProps {
  user: {
    name?: string;
    email: string|null;
    uid: string;
    // Add other user fields as needed
  };
  handleSignOut: () => void;
}
const AuthenticatedScreen : React.FC<AuthenticatedScreenProps> = ({ user, handleSignOut }) => {
  const router = useRouter();

  const onContinue = async () => {
    const userRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const userData = userDoc.data(); // Retrieve the data from the document
      const role = userData.role; // Access the role field

      console.log(`User role: ${role}`);
      if (role === 'Admin') {
        router.push('/admin/year'); // Redirect teachers
      } else if (role === 'Student') {
        router.push('/student'); // Redirect students
      }
      else if (role === 'Super-Admin') {
        console.log(role);
        router.push('/superadmin');
         // Redirect superadmin
      }
    }
    // Ensure this path is correct for navigation
  };

  return (
    <View style={styles.authContainer}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.emailText}>{user.email}</Text>
      <Button title="Continue" onPress={onContinue} />
      <Button title="Sign Out" onPress={handleSignOut} color="red" />
    </View>
  );
};

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [user, setUser] = useState<User | null>(null)
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleAuthentication = async () => {
    setAuthError('');
    try {
      if (user) {
        // Sign out
        await signOut(auth);
        console.log('User signed out successfully');
      } else {
        if (isLogin) {
          // Sign in flow: Verify the device ID only if the user is a Student
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const loggedInUser = userCredential.user;
  
          // Retrieve user data
          const userRef = doc(firestore, 'users', loggedInUser.uid);
          const userDoc = await getDoc(userRef);
  
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = userData.role; // Get user role
            const storedDeviceId = userData.deviceId; // Stored Device ID
            const currentDeviceId = await getUniqueId(); // Current Device ID
  
            console.log(`User Role: ${role}`);
            console.log(`Stored Device ID: ${storedDeviceId}`);
            console.log(`Current Device ID: ${currentDeviceId}`);
  
            if (role === 'Student' && storedDeviceId !== currentDeviceId) {
              // Prevent login if the user is a student and device ID does not match
              await signOut(auth);
              setAuthError('Login failed: Unauthorized device.');
              return;
            }
  
            console.log('User signed in successfully');
          } else {
            setAuthError('User data not found.');
          }
        } else {
          // Sign up flow: Generate and store a unique device ID
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const newUser = userCredential.user;
  
          const deviceId = await getUniqueId(); // Generate Device ID
          console.log('Generated Device ID:', deviceId);
  
          // Store user data along with device ID in Firestore
          const userRef = doc(firestore, 'users', newUser.uid);
          await setDoc(userRef, {
            uid: newUser.uid,
            name,
            role,
            email,
            deviceId, // Store the device ID
          });
  
          console.log('User data stored in Firestore');
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setAuthError(error.message);
        console.error('Authentication error:', error.message);
      } else {
        console.error('An unknown error occurred:', error);
      }
    }
  };
  

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {user ? (
        <AuthenticatedScreen user={user} handleSignOut={handleAuthentication} />
      ) : (
        <AuthScreen
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          isLogin={isLogin}
          setIsLogin={setIsLogin}
          handleAuthentication={handleAuthentication}
          authError={authError}
          role={role}
          setRole={setRole}
          name={name}
          setName={setName}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f0f0',
  },
  authContainer: {
    width: '80%',
    maxWidth: 400,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 16,
    padding: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  toggleText: {
    color: '#3498db',
    textAlign: 'center',
    marginTop: 10,
  },
  bottomContainer: {
    marginTop: 20,
  },
  emailText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  Picker: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 18,
  }
});
