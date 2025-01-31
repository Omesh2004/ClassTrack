import React, { useState, useEffect } from "react";
import { View, Text, Button, Alert, StyleSheet } from "react-native";
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
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import * as Location from "expo-location";
import { useAuth } from '@/hooks/useAuth';

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
  const handleAttendance = async (status: "Present" | "Absent") => {
    try {
      if (!userData || !fixedLocation) {
        Alert.alert("Error", "Data is not available. Please try again later.");
        return;
      }
  
      const locationData = await askForLocationPermission();
      if (locationData === -1) return;
  
      const { lat, long, dist } = locationData;
      const p = dist < RADIUS ? 1 : 0;
      console.log("Attendance status:", { status, distance: dist, withinRadius: p });
  
      // Update the correct course document path
      const courseDocRef = doc(
        db,
        `years/${year}/semesters/${semester}/courses`,
        course as string
      );
      
      await updateDoc(courseDocRef, {
        attendance: arrayUnion({
          studentName: userData.name,
          studentId: user?.uid || auth.currentUser?.uid,
          latitude: lat,
          longitude: long,
          distance: dist,
          status,
          in: p,
          timestamp: new Date().toISOString(),
        }),
      });
  
      Alert.alert("Success", `You have been marked as ${status}.`);
    } catch (error) {
      console.error("Error updating attendance:", error);
      Alert.alert("Error", "Failed to mark attendance. Please try again.");
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
    marginBottom: 32,
  },
  buttons: {
    flexDirection: "row",
    gap: 16,
  },
});

export default AttendanceScreen;