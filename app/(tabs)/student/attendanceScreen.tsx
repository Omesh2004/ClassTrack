import React, { useState, useEffect } from "react";
import { View, Text, Button, Alert, StyleSheet,Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  updateDoc,
  doc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import * as Location from "expo-location";
import { useAuth } from '@/hooks/useAuth';



import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';


const RADIUS = 80;

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

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const AttendanceScreen: React.FC = () => {
  const [deviceId, setDeviceId] = useState<string | null>(null);
      
        useEffect(() => {
          const fetchDeviceId = async () => {
            const id = await getUniqueId();
            setDeviceId(id);
          };
          fetchDeviceId();
        }, []);
  const [dist, setDist] = useState(0);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { course, year, semester } = useLocalSearchParams();
  const [fixedLocation, setFixedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const { user } = useAuth();

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const R = 6371e3;
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchFixedLocation = async () => {
    try {
      console.log("Fetching fixed location for course:", course);
      // Correct document path using year and semester from params
      const courseDocRef = doc(
        db, 
        `years/${year}/semesters/${semester}/courses`, 
        course as string
      );
      
      const courseDoc = await getDoc(courseDocRef);
  
      if (courseDoc.exists()) {
        const data = courseDoc.data();
        console.log("Course document found:", data);
        const latitude = data.FIXED_LATITUDE;
        const longitude = data.FIXED_LONGITUDE;
  
        if (latitude !== undefined && longitude !== undefined) {
          setFixedLocation({ latitude, longitude });
          console.log("Fixed Coordinates Updated:", { latitude, longitude });
        } else {
          console.error("FIXED_LATITUDE and/or FIXED_LONGITUDE not found.");
        }
      } else {
        console.log("Course document not found at path:", courseDocRef.path);
        Alert.alert("Error", "Course document does not exist.");
      }
    } catch (error) {
      console.error("Error fetching fixed location:", error);
    }
  };
  
  const askForLocationPermission = async (): Promise<any> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access was denied.");
        return -1;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      if (fixedLocation) {
        const distance = calculateDistance(
          latitude,
          longitude,
          fixedLocation.latitude,
          fixedLocation.longitude
        );

        console.log("Fetched Location:", { latitude, longitude, distance });
        return { lat: latitude, long: longitude, dist: distance };
      } else {
        console.error("Fixed location is not available.");
        return -1;
      }
    } catch (error) {
      console.error("Error getting location:", error);
      return -1;
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!user) {
          // Fallback to direct auth check
          const currentUser = auth.currentUser;
          if (!currentUser) {
            console.log("No user found in either hook or direct auth");
            Alert.alert("Error", "No user is currently logged in.");
            return;
          }
          
          // Use the direct auth user
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", currentUser.email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            console.log("User data found:", userData);
            setUserData(userData);
          } else {
            console.log("No user document found for email:", currentUser.email);
            Alert.alert("Error", "User data not found in Firestore.");
          }
        } else {
          // Use the hook's user
          console.log("Using hook user:", user.uid);
          const userRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("User data found:", userData);
            setUserData(userData);
          } else {
            console.log("No user document found for uid:", user.uid);
            Alert.alert("Error", "User data not found in Firestore.");
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        Alert.alert("Error", "Failed to fetch user data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
    fetchFixedLocation();
  }, [user]);
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
      const docRef = doc(db, 'devices', deviceId); // Store ID as document name
  
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
  
const handleAttendance = async (status: "Present" | "Absent") => {
    try {
        // More robust null checks
        if (!userData?.name || !user?.uid || !fixedLocation) {
            Alert.alert("Error", "User data or location is incomplete.");
            return;
        }

        // More explicit location permission handling
        const locationData = await askForLocationPermission();
        if (!locationData) {
            Alert.alert("Error", "Location permission denied.");
            return;
        }

        const { lat, long, dist } = locationData;
        
        // Ensure RADIUS is defined and validated
        if (typeof RADIUS !== 'number') {
            throw new Error("RADIUS is not properly defined");
        }

        const isWithinRadius = dist < RADIUS;
        console.log("Attendance status:", { 
            status, 
            distance: dist, 
            withinRadius: isWithinRadius 
        });

        // Generate today's date INSIDE the function to ensure it's current
        const today = (() => {
          const local = new Date();
          return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
        })();
        console.log("Today's date:", today);

        // More robust path construction
        const attendanceDocRef = doc(
            db,
            `years/${year}/semesters/${semester}/courses/${course}/attendance/${today}`
        );

        // Type-safe student record
        const studentRecord = {
            studentName: userData.name,
            studentId: user.uid || auth.currentUser?.uid,
            latitude: lat,
            longitude: long,
            distance: dist,
            status,
            in: isWithinRadius ? 1 : 0,
            timestamp: new Date().toISOString(), // This ensures a fresh timestamp
        };

        // Ensure all required fields are present
        if (!studentRecord.studentId) {
            throw new Error("Unable to determine student ID");
        }

        // Update attendance document
        await setDoc(attendanceDocRef, {
            date: today, // This will be the current date when the function is called
            students: arrayUnion(studentRecord)
        }, { merge: true });

        Alert.alert("Success", `You have been marked as ${status}.`);

    } catch (error) {
        console.error("Error updating attendance:", error);
        
        // More informative error message
        const errorMessage = error instanceof Error 
            ? error.message 
            : "An unknown error occurred";
        
        Alert.alert("Error", `Failed to mark attendance: ${errorMessage}`);
    }
};
  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading user data...</Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Course: {course}</Text>
      <Text style={styles.subtitle}>
        Welcome, {userData?.name || "Student"} Mark your Attendance
      </Text>
      <View style={styles.buttons}>
        <Button title="Present" onPress={() => handleAttendance("Present")} />
        <Button title="Absent" onPress={() => handleAttendance("Absent") }  />   
        <Button title="Generate UID" onPress={async () => {
          if (deviceId) {
            await storeDeviceIdInFirestore(deviceId);
          }
        }} />       
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
  },idText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 32,
  },
  buttons: {
    flexDirection: "row",
    gap: 16,
  },
});

export default AttendanceScreen;