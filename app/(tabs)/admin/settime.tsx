import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { db, setDoc, doc } from "@/utils/firebaseConfig";
import * as Location from "expo-location";
import { Ionicons } from '@expo/vector-icons';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from "uuid";

const { width } = Dimensions.get('window');

const SetTimeScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const { course, courseId, courseCode, year, semester } = params || {};

  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [amPm, setAmPm] = useState("AM");
  const [location, setLocation] = useState<{ lat: number; long: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (!year || !semester) {
      Alert.alert("Error", "Missing year or semester. Please navigate correctly.");
      router.back();
    }
    checkLocationPermission();
  }, [year, semester]);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch (error) {
      console.error("Error checking location permission:", error);
    }
  };

  const askForLocationPermission = async () => {
    try {
      setIsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required", 
          "Location access is required to set attendance location. Please enable it in settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Settings", onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        return null;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setLocationPermission(true);
      const coords = { lat: location.coords.latitude, long: location.coords.longitude };
      setLocation(coords);
      return coords;
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Location Error", "Failed to get current location. Please try again.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getISTDate = () => {
    const now = new Date();
    const ISTOffset = 330;
    const currentOffset = now.getTimezoneOffset();
    const totalOffset = currentOffset + ISTOffset;
    const ISTDate = new Date(now.getTime() + totalOffset * 60 * 1000);

    const year = ISTDate.getFullYear();
    const month = String(ISTDate.getMonth() + 1).padStart(2, "0");
    const day = String(ISTDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getCurrentISTTime = () => {
    const now = new Date();
    const ISTOffset = 330;
    const currentOffset = now.getTimezoneOffset();
    const totalOffset = currentOffset + ISTOffset;
    const ISTDate = new Date(now.getTime() + totalOffset * 60 * 1000);
    
    return ISTDate;
  };

  const updateDatabaseWithTime = async (classTime: string) => {
    if (!year || !semester || !courseId) {
      Alert.alert("Error", "Missing required parameters. Please navigate correctly.");
      return;
    }

    setIsLoading(true);
    
    let fetchedLocation = location;
    if (!fetchedLocation) {
      fetchedLocation = await askForLocationPermission();
      if (!fetchedLocation) {
        setIsLoading(false);
        return;
      }
    }

    try {
      const today = getISTDate();
      const sessionId = uuidv4();

      const sessionDocRef = doc(
        db,
        "years",
        year as string,
        "semesters",
        semester as string,
        "courses",
        courseId as string,
        "attendance",
        today,
        "sessions",
        sessionId
      );

      let delT = classTime;

      console.log("Updating session document with:", {
        sessionId,
        classTime,
        courseId,
        delT,
        latitude: fetchedLocation.lat,
        longitude: fetchedLocation.long,
        date: today,
      });

      await setDoc(sessionDocRef, {
        sessionId,
        classTime,
        delT,
        courseId,
        FIXED_LATITUDE: fetchedLocation.lat,
        FIXED_LONGITUDE: fetchedLocation.long,
        date: today,
        createdAt: new Date().toISOString(),
      });

      setTimeout(async () => {
        try {
          await setDoc(
            sessionDocRef,
            { classTime: "", status: "expired" },
            { merge: true }
          );
          console.log("ClassTime cleared after 30 minutes.");
        } catch (error) {
          console.error("Error clearing classTime:", error);
        }
      }, 30 * 60 * 1000);

      Alert.alert(
        "Attendance Session Created",
        `Attendance is now active for ${courseCode} - ${course} at ${classTime}.\n\nSession will expire in 30 minutes.`,
        [
          { text: "OK", onPress: () => router.back() }
        ]
      );
    } catch (error) {
      console.error("Error updating class time:", error);
      Alert.alert("Error", "Failed to create attendance session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleTask = async () => {
    if (!hour || !minute || isNaN(Number(hour)) || isNaN(Number(minute))) {
      Alert.alert("Invalid Time", "Please enter a valid time.");
      return;
    }

    const selectedHour = parseInt(hour, 10);
    const selectedMinute = parseInt(minute, 10);

    if (selectedHour < 1 || selectedHour > 12 || selectedMinute < 0 || selectedMinute > 59) {
      Alert.alert("Invalid Time", "Please enter a valid hour (1-12) and minute (0-59).");
      return;
    }

    const classTime = `${selectedHour.toString().padStart(2, "0")}:${selectedMinute
      .toString()
      .padStart(2, "0")} ${amPm}`;

    Alert.alert(
      "Confirm Attendance Session",
      `Create attendance session for ${courseCode} at ${classTime}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Create", onPress: () => updateDatabaseWithTime(classTime) }
      ]
    );
  };

  const setCurrentTime = async () => {
    const now = getCurrentISTTime();
    let currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isPM = currentHour >= 12;

    if (isPM) {
      currentHour = currentHour > 12 ? currentHour - 12 : currentHour;
    } else if (currentHour === 0) {
      currentHour = 12;
    }

    const formattedTime = `${currentHour.toString().padStart(2, "0")}:${currentMinute
      .toString()
      .padStart(2, "0")} ${isPM ? "PM" : "AM"}`;

    setHour(currentHour.toString());
    setMinute(currentMinute.toString().padStart(2, "0"));
    setAmPm(isPM ? "PM" : "AM");

    Alert.alert(
      "Start Attendance Now",
      `Create attendance session for ${courseCode} at current time (${formattedTime})?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Start Now", onPress: () => updateDatabaseWithTime(formattedTime) }
      ]
    );
  };

  const renderTimeInput = (value: string, onChangeText: (text: string) => void, placeholder: string, maxLength: number) => (
    <TextInput
      style={styles.timeInput}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType="numeric"
      maxLength={maxLength}
      value={value}
      onChangeText={onChangeText}
      selectionColor="#3B82F6"
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </Pressable>
        <Text style={styles.headerTitle}>Schedule Attendance</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Course Info Card */}
        <View style={styles.courseCard}>
          <View style={styles.courseHeader}>
            <Ionicons name="book-outline" size={24} color="#3B82F6" />
            <Text style={styles.courseTitle}>Course Details</Text>
          </View>
          <View style={styles.courseInfo}>
            <Text style={styles.courseCode}>{courseCode}</Text>
            <Text style={styles.courseName}>{course || "Unknown Course"}</Text>
          </View>
        </View>

        {/* Location Status */}
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Ionicons 
              name={locationPermission ? "location" : "location-outline"} 
              size={20} 
              color={locationPermission ? "#10B981" : "#F59E0B"} 
            />
            <Text style={styles.locationTitle}>Location Status</Text>
            {location && (
              <View style={styles.locationBadge}>
                <Text style={styles.locationBadgeText}>✓ Ready</Text>
              </View>
            )}
          </View>
          <Text style={styles.locationText}>
            {locationPermission 
              ? location 
                ? "Location captured and ready for attendance tracking."
                : "Location permission granted. Will capture when session starts."
              : "Location permission required for attendance verification."
            }
          </Text>
        </View>

        {/* Time Setting Card */}
        <View style={styles.timeCard}>
          <View style={styles.timeHeader}>
            <Ionicons name="time-outline" size={24} color="#3B82F6" />
            <Text style={styles.timeTitle}>Set Attendance Time</Text>
          </View>

          <View style={styles.timeInputContainer}>
            {renderTimeInput(hour, setHour, "HH", 2)}
            <Text style={styles.timeSeparator}>:</Text>
            {renderTimeInput(minute, setMinute, "MM", 2)}
            <Pressable
              style={[styles.amPmButton, amPm === "PM" && styles.amPmButtonActive]}
              onPress={() => setAmPm(amPm === "AM" ? "PM" : "AM")}
            >
              <Text style={[styles.amPmText, amPm === "PM" && styles.amPmTextActive]}>
                {amPm}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.timeNote}>
            Attendance session will be active for 30 minutes from the scheduled time.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.quickActionButton,
              pressed && styles.buttonPressed
            ]}
            onPress={setCurrentTime}
            disabled={isLoading}
          >
            <Ionicons name="play-circle" size={20} color="#FFFFFF" />
            <Text style={styles.quickActionText}>Start Now</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled
            ]}
            onPress={scheduleTask}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="calendar" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.primaryButtonText}>
              {isLoading ? "Creating Session..." : "Schedule Session"}
            </Text>
          </Pressable>
        </View>

        {/* Info Section */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
            <Text style={styles.infoTitle}>Session Information</Text>
          </View>
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>• Students can mark attendance 15 minutes before scheduled time</Text>
            <Text style={styles.infoItem}>• Session automatically expires after 30 minutes</Text>
            <Text style={styles.infoItem}>• Location verification ensures students are in classroom</Text>
            <Text style={styles.infoItem}>• Real-time attendance tracking and reports</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  courseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  courseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
  courseInfo: {
    paddingLeft: 32,
  },
  courseCode: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
    backgroundColor: "#EBF8FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  courseName: {
    fontSize: 18,
    fontWeight: "500",
    color: "#111827",
  },
  locationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
    flex: 1,
  },
  locationBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065F46",
  },
  locationText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    paddingLeft: 28,
  },
  timeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  timeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  timeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
  timeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  timeInput: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    textAlign: "center",
    marginHorizontal: 8,
    backgroundColor: "#FFFFFF",
    fontSize: 24,
    fontWeight: "600",
    color: "#111827",
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: "600",
    color: "#6B7280",
    marginHorizontal: 4,
  },
  amPmButton: {
    width: 60,
    height: 60,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  amPmButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  amPmText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  amPmTextActive: {
    color: "#FFFFFF",
  },
  timeNote: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    fontStyle: "italic",
  },
  actionContainer: {
    gap: 12,
    marginBottom: 24,
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  quickActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 6,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
});

export default SetTimeScreen;