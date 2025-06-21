import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Platform, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  SafeAreaView
} from 'react-native';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyATZSCZdADIJGYJcnd58Cwg9S9bV2yFYnE",
  authDomain: "attendance-app-7a21e.firebaseapp.com",
  projectId: "attendance-app-7a21e",
  storageBucket: "attendance-app-7a21e.firebasestorage.app",
  messagingSenderId: "47121417247",
  appId: "1:47121417247:web:1e086ee27fe10c20e9412a",
  measurementId: "G-SMF4LTTV59"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

const getUniqueId = async (): Promise<string> => {
  try {
    let storedId = await AsyncStorage.getItem('deviceUniqueId');

    if (!storedId) {
      if (Platform.OS === 'web') {
        storedId = localStorage.getItem('deviceUniqueId') || uuidv4();
        localStorage.setItem('deviceUniqueId', storedId);
      } else if (Platform.OS === 'android') {
        storedId = Application.getAndroidId() || uuidv4();
      } else if (Platform.OS === 'ios') {
        try {
          storedId = await SecureStore.getItemAsync('deviceUniqueId');
          if (!storedId) {
            storedId = uuidv4();
            await SecureStore.setItemAsync('deviceUniqueId', storedId);
          }
        } catch (error) {
          console.error('SecureStore error:', error);
          storedId = uuidv4();
        }
      } else {
        storedId = uuidv4();
      }

      await AsyncStorage.setItem('deviceUniqueId', storedId ?? uuidv4());
    }

    return storedId ?? '';
  } catch (error) {
    console.error('Error generating device ID:', error);
    return `error-id-${Date.now()}`;
  }
};

const storeDeviceIdInFirestore = async (deviceId: string): Promise<void> => {
  try {
    const deviceType = Platform.OS;
    const docRef = doc(firestore, 'devices', deviceId);

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
  isLoading: boolean;
}

// Enhanced Authentication Screen Component
const AuthScreen: React.FC<AuthScreenProps> = ({ 
  email, 
  setEmail, 
  password, 
  setPassword, 
  isLogin, 
  setIsLogin, 
  handleAuthentication, 
  authError, 
  role, 
  setRole, 
  name, 
  setName,
  isLoading 
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const isFormValid = () => {
    if (!email || !password) return false;
    if (!isLogin && (!name || !role)) return false;
    return true;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.authContainer} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.headerContainer}>
        <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Sign in to your account' : 'Fill in your details to get started'}
        </Text>
      </View>

      <View style={styles.formContainer}>
        {!isLogin && (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={[styles.input, name ? styles.inputFilled : null]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              autoCapitalize="words"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={[styles.input, email ? styles.inputFilled : null]}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.passwordInput, password ? styles.inputFilled : null]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!isLogin && (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Role</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={role}
                onValueChange={(value) => setRole(value)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label="Select your role" value="" />
                <Picker.Item label="👨‍🎓 Student" value="Student" />
                <Picker.Item label="👨‍🏫 Admin" value="Admin" />
                <Picker.Item label="👑 Super Admin" value="Super-Admin" />
              </Picker>
            </View>
          </View>
        )}

        {authError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {authError}</Text>
          </View>
        ) : null}

        <TouchableOpacity 
          style={[
            styles.primaryButton, 
            !isFormValid() ? styles.buttonDisabled : null,
            isLoading ? styles.buttonLoading : null
          ]}
          onPress={handleAuthentication}
          disabled={!isFormValid() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => setIsLogin(!isLogin)}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Text style={styles.linkText}>
              {isLogin ? 'Sign Up' : 'Sign In'}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

interface AuthenticatedScreenProps {
  user: {
    name?: string;
    email: string | null;
    uid: string;
  };
  handleSignOut: () => void;
  isLoading: boolean;
}

const AuthenticatedScreen: React.FC<AuthenticatedScreenProps> = ({ 
  user, 
  handleSignOut, 
  isLoading 
}) => {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [signOutLoading, setSignOutLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role);
          setUserName(userData.name);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      } finally {
        setLoadingUserData(false);
      }
    };

    fetchUserData();
  }, [user.uid]);

  const onContinue = async () => {
    if (!userRole) {
      Alert.alert('Error', 'User role not found');
      return;
    }

    try {
      console.log(`User role: ${userRole}`);
      
      switch (userRole) {
        case 'Admin':
          router.push('/admin/year');
          break;
        case 'Student':
          router.push('/student');
          break;
        case 'Super-Admin':
          router.push('/superadmin');
          break;
        default:
          Alert.alert('Error', 'Invalid user role');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to navigate');
    }
  };

  const handleSignOutPress = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: async () => {
            setSignOutLoading(true);
            try {
              await handleSignOut();
            } catch (error) {
              console.error('Sign out error in component:', error);
            } finally {
              setSignOutLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loadingUserData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.welcomeContainer}>
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {userName ? userName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <Text style={styles.welcomeTitle}>Welcome back!</Text>
        <Text style={styles.userName}>{userName || 'User'}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={styles.roleContainer}>
          <Text style={styles.roleText}>{userRole}</Text>
        </View>
      </View>

      <View style={styles.actionSection}>
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={onContinue}
          disabled={isLoading || signOutLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.continueButtonText}>Continue to Dashboard</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.signOutButton,
            (isLoading || signOutLoading) ? styles.buttonDisabled : null
          ]}
          onPress={handleSignOutPress}
          disabled={isLoading || signOutLoading}
        >
          {signOutLoading ? (
            <ActivityIndicator color="#6B7280" size="small" />
          ) : (
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authStateLoading, setAuthStateLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthStateLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    setAuthError('');
    
    try {
      // Add timeout for sign out operation
      const signOutPromise = signOut(auth);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timeout')), 10000)
      );
      
      await Promise.race([signOutPromise, timeoutPromise]);
      
      console.log('User signed out successfully');
      
      // Clear form data and reset states
      setEmail('');
      setPassword('');
      setName('');
      setRole('');
      setIsLogin(true);
      setAuthError('');
      
    } catch (error: any) {
      console.error('Sign out error:', error);
      
      let errorMessage = 'Failed to sign out. Please try again.';
      
      if (error.message === 'Sign out timeout') {
        errorMessage = 'Sign out is taking too long. Please check your connection and try again.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setAuthError(errorMessage);
      Alert.alert('Sign Out Error', errorMessage);
      
      // Force sign out by clearing local state if Firebase sign out fails
      if (error.message === 'Sign out timeout') {
        setUser(null);
        setEmail('');
        setPassword('');
        setName('');
        setRole('');
        setIsLogin(true);
        setAuthError('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthentication = async () => {
    setAuthError('');
    setIsLoading(true);

    // Validation
    if (!validateEmail(email)) {
      setAuthError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      setAuthError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    if (!isLogin && !name.trim()) {
      setAuthError('Please enter your full name');
      setIsLoading(false);
      return;
    }

    if (!isLogin && !role) {
      setAuthError('Please select your role');
      setIsLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // Sign in flow
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const loggedInUser = userCredential.user;

        const userRef = doc(firestore, 'users', loggedInUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userRole = userData.role;
          const storedDeviceId = userData.deviceId;
          const currentDeviceId = await getUniqueId();

          console.log(`User Role: ${userRole}`);

          if (userRole === 'Student' && storedDeviceId !== currentDeviceId) {
            await signOut(auth);
            setAuthError('Login failed: This device is not authorized for your account');
            setIsLoading(false);
            return;
          }

          console.log('User signed in successfully');
        } else {
          setAuthError('User data not found');
          setIsLoading(false);
          return;
        }
      } else {
        // Sign up flow
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        const deviceId = await getUniqueId();
        console.log('Generated Device ID:', deviceId);

        const userRef = doc(firestore, 'users', newUser.uid);
        await setDoc(userRef, {
          uid: newUser.uid,
          name: name.trim(),
          role,
          email,
          deviceId,
          createdAt: new Date().toISOString(),
        });

        // Store device ID in devices collection
        await storeDeviceIdInFirestore(deviceId);

        console.log('User created and data stored successfully');
      }
    } catch (error: any) {
      let errorMessage = 'An error occurred. Please try again.';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email address';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password';
            break;
          case 'auth/email-already-in-use':
            errorMessage = 'An account with this email already exists';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      }
      
      setAuthError(errorMessage);
      console.error('Authentication error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen while checking auth state
  if (authStateLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {user ? (
          <AuthenticatedScreen 
            user={user} 
            handleSignOut={handleSignOut}
            isLoading={isLoading}
          />
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
            isLoading={isLoading}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  authContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderColor: '#E5E7EB',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#1F2937',
  },
  inputFilled: {
    borderColor: '#4F46E5',
    backgroundColor: '#FFFFFF',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    height: 48,
    borderColor: '#E5E7EB',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 50,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#1F2937',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeText: {
    fontSize: 18,
  },
  pickerContainer: {
    borderColor: '#E5E7EB',
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  picker: {
    height: 48,
    color: '#1F2937',
  },
  pickerItem: {
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonLoading: {
    backgroundColor: '#6366F1',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  linkText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  welcomeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  roleContainer: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
    textTransform: 'uppercase',
  },
  actionSection: {
    width: '100%',
  },
  continueButton: {
    backgroundColor: '#4F46E5',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#F3F4F6',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  signOutButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
});