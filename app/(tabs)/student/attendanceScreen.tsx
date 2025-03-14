import React, { useState, useEffect } from "react";
import { View, Text, Button, Alert, StyleSheet, Platform } from "react-native";
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
  collectionGroup,
  orderBy,
  limit,
  Timestamp,
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
  storageBucket: "attendance-app-7a21e.firebasestorage.app",
  messagingSenderId: "47121417247",
  appId: "1:47121417247:web:1e086ee27fe10c20e9412a",
  measurementId: "G-SMF4LTTV59",
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

interface Session {
  FIXED_LATITUDE: number;
  FIXED_LONGITUDE: number;
  courseId: string;
  classTime: string;
  date: string;
  sessionId: string;
  timestamp: Timestamp;
}

const AttendanceScreen: React.FC = () => {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [dist, setDist] = useState(0);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const { course, year, semester, sessionId } = useLocalSearchParams();
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

  const fetchCurrentSession = async () => {
    try {
      console.log("Fetching current session for course:", course);
      const todayIST = () => {
        const now = new Date();
        // Convert to milliseconds and adjust for IST (+5:30)
        const IST_OFFSET = 5.5 * 60 * 60 * 1000; // IST is UTC +5:30
        const istTime = new Date(now.getTime() + IST_OFFSET);
        
        // Format the date in YYYY-MM-DD format
        return istTime.toISOString().split('T')[0];
      };
      
      const today = todayIST()
      // Query for the latest session with matching courseId
      const sessionsQuery = query(
        collectionGroup(db, 'sessions'),
        where('date', '==', today), // Filter by today's date
        where('courseId', '==', course), // Ensure session matches courseId
        orderBy('classTime', 'desc'), // Order by classTime in descending order
        limit(1) // Limit to the latest session
      );

      const querySnapshot = await getDocs(sessionsQuery);

      if (!querySnapshot.empty) {
        const sessionDoc = querySnapshot.docs[0];
        const sessionData = sessionDoc.data() as Session;
        
        console.log("Found session:", sessionData);
        setCurrentSession(sessionData);
      } else {
        console.log("No active session found for course:", course);
        Alert.alert("Error", "No active session found for this course.");
      }
    } catch (error) {
      console.error("Error fetching current session:", error);
      Alert.alert("Error", "Failed to fetch current session.");
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

      if (currentSession) {
        const distance = calculateDistance(
          latitude,
          longitude,
          currentSession.FIXED_LATITUDE,
          currentSession.FIXED_LONGITUDE
        );

        console.log("Fetched Location:", { latitude, longitude, distance });
        return { lat: latitude, long: longitude, dist: distance };
      } else {
        console.error("No active session available.");
        return -1;
      }
    } catch (error) {
      console.error("Error getting location:", error);
      return -1;
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await fetchCurrentSession();
        if (!user) {
          const currentUser = auth.currentUser;
          if (!currentUser) {
            console.log("No user found");
            Alert.alert("Error", "No user is currently logged in.");
            return;
          }

          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", currentUser.email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            setUserData(querySnapshot.docs[0].data());
          } else {
            Alert.alert("Error", "User data not found.");
          }
        } else {
          const userRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            Alert.alert("Error", "User data not found.");
          }
        }
      } catch (error) {
        console.error("Error during initialization:", error);
        Alert.alert("Error", "Failed to initialize attendance screen.");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [user]);

  const handleAttendance = async (status: "Present" | "Absent") => {
    try {
      if (!userData?.name || !user?.uid || !currentSession) {
        Alert.alert("Error", "Required data is missing.");
        return;
      }

      const locationData = await askForLocationPermission();
      if (!locationData) {
        Alert.alert("Error", "Location permission denied.");
        return;
      }

      const { lat, long, dist } = locationData;
      const isWithinRadius = dist < RADIUS;

      console.log("Attendance status:", {
        status,
        distance: dist,
        withinRadius: isWithinRadius,
      });

      // Get the attendance document reference using the session path
      const attendanceRef = doc(
        db,
        `years/${year}/semesters/${semester}/courses/${course}/attendance/${currentSession.date}/sessions/${currentSession.sessionId}`
      );

      const studentRecord = {
        studentName: userData.name,
        studentId: user.uid || auth.currentUser?.uid,
        latitude: lat,
        longitude: long,
        distance: dist,
        status,
        in: isWithinRadius ? 1 : 0,
        timestamp: new Date().toISOString(),
      };

      if (!studentRecord.studentId) {
        throw new Error("Unable to determine student ID");
      }

      await updateDoc(attendanceRef, {
        students: arrayUnion(studentRecord),
      });

      Alert.alert("Success", `You have been marked as ${status}.`);
    } catch (error) {
      console.error("Error updating attendance:", error);
      Alert.alert(
        "Error",
        `Failed to mark attendance: ${error instanceof Error ? error.message : "Unknown error"}`
      );
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
      {currentSession && (
        <Text style={styles.sessionInfo}>
          Class Time: {currentSession.classTime}
        </Text>
      )}
      <View style={styles.buttons}>
        <Button title="Present" onPress={() => handleAttendance("Present")} />
        <Button title="Absent" onPress={() => handleAttendance("Absent")} />
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
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  sessionInfo: {
    fontSize: 16,
    marginBottom: 32,
    color: "#666",
  },
  buttons: {
    flexDirection: "row",
    gap: 16,
  },
});

export default AttendanceScreen;