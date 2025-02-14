// app/layout.tsx
import { Stack, useRouter } from 'expo-router';
import { ThemeProvider } from '@react-navigation/native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
 // Optional: A loading screen while checking auth state

// Firebase configuration (replace with your Firebase project config)
const firebaseConfig = {
  apiKey: "AIzaSyATZSCZdADIJGYJcnd58Cwg9S9bV2yFYnE",
  authDomain: "attendance-app-7a21e.firebaseapp.com",
  projectId: "attendance-app-7a21e",
  storageBucket: "attendance-app-7a21e.appspot.com",
  messagingSenderId: "47121417247",
  appId: "1:47121417247:web:1e086ee27fe10c20e9412a",
  measurementId: "G-SMF4LTTV59"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe; // Unsubscribe on unmount
  }, []);

  // Redirect based on authentication state
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login'); // Redirect to login if not authenticated
      } 
    }
  }, [loading, user]);

  // Show a loading screen while checking auth state
  

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}