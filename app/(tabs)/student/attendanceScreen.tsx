import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  Platform,
  Alert
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
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

const { width } = Dimensions.get('window');
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
  const [processing, setProcessing] = useState(false);
  const [buttonPressed, setButtonPressed] = useState<"Present" | "Absent" | null>(null);
  const { course, year, semester, sessionId } = useLocalSearchParams();
  const { user } = useAuth();
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

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
      const todayIST = () => {
        const now = new Date();
        const IST_OFFSET = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + IST_OFFSET);
        return istTime.toISOString().split('T')[0];
      };
      
      const today = todayIST()
      const sessionsQuery = query(
        collectionGroup(db, 'sessions'),
        where('date', '==', today),
        where('courseId', '==', course),
        orderBy('classTime', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(sessionsQuery);

      if (!querySnapshot.empty) {
        const sessionDoc = querySnapshot.docs[0];
        const sessionData = sessionDoc.data() as Session;
        setCurrentSession(sessionData);
      } else {
        Alert.alert("No Active Session", "No active session found for this course.");
      }
    } catch (error) {
      console.error("Error fetching current session:", error);
      Alert.alert("Error", "Failed to fetch current session.");
    }
  };

  const askForLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access was denied.");
        return null;
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
        return { lat: latitude, long: longitude, dist: distance };
      }
      return null;
    } catch (error) {
      console.error("Error getting location:", error);
      return null;
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await fetchCurrentSession();
        if (!user) {
          const currentUser = auth.currentUser;
          if (!currentUser) {
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
      setProcessing(true);
      setButtonPressed(status);
      
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

      Alert.alert(
        "Attendance Recorded",
        `You have been marked as ${status}${isWithinRadius ? "" : " (outside radius)"}`,
        [{ text: "OK", onPress: () => setButtonPressed(null) }]
      );
    } catch (error) {
      console.error("Error updating attendance:", error);
      Alert.alert(
        "Error",
        `Failed to mark attendance: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading Attendance...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Animated.View style={{ opacity: fadeAnim }}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSubtitle}>
            {course} • {currentSession?.classTime || "Current Session"}
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={32} color="#667eea" />
            </View>
            <Text style={styles.userName}>{userData?.name || "Student"}</Text>
            <Text style={styles.userEmail}>{user?.email || auth.currentUser?.email}</Text>
          </View>

          <View style={styles.sessionInfo}>
            <Text style={styles.infoTitle}>Session Details</Text>
            <View style={styles.infoRow}>
              <MaterialIcons name="schedule" size={20} color="#64748B" />
              <Text style={styles.infoText}>{currentSession?.classTime || "Not available"}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="calendar-today" size={20} color="#64748B" />
              <Text style={styles.infoText}>{currentSession?.date || "Not available"}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={20} color="#64748B" />
              <Text style={styles.infoText}>Within {RADIUS}m radius required</Text>
            </View>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[
                styles.attendanceButton,
                styles.presentButton,
                buttonPressed === "Present" && styles.buttonPressed
              ]}
              onPress={() => handleAttendance("Present")}
              disabled={processing}
            >
              {processing && buttonPressed === "Present" ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Present</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.attendanceButton,
                styles.absentButton,
                buttonPressed === "Absent" && styles.buttonPressed
              ]}
              onPress={() => handleAttendance("Absent")}
              disabled={processing}
            >
              {processing && buttonPressed === "Absent" ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="cancel" size={24} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Absent</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    fontFamily: 'Inter_500Medium',
  },
  header: {
    paddingVertical: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  content: {
    padding: 24,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
  },
  sessionInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E293B',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#64748B',
    marginLeft: 12,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  attendanceButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  presentButton: {
    backgroundColor: '#4CAF50',
  },
  absentButton: {
    backgroundColor: '#F44336',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 8,
  },
});

export default AttendanceScreen;