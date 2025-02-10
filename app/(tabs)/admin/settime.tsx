import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { db, setDoc, doc } from "@/utils/firebaseConfig";
import * as Location from "expo-location";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from "uuid"; // For generating unique IDs

const SetTimeScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const { course, courseId, courseCode, year, semester } = params || {};

  const [hour, setHour] = useState(""); // Hour input
  const [minute, setMinute] = useState(""); // Minute input
  const [amPm, setAmPm] = useState("AM"); // AM/PM selection
  const [location, setLocation] = useState<{ lat: number; long: number } | null>(
    null
  );

  useEffect(() => {
    if (!year || !semester) {
      Alert.alert("Error", "Missing year or semester. Please navigate correctly.");
      router.back();
    }
  }, [year, semester]);

  const askForLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location access was denied.");
        return null;
      }
      const location = await Location.getCurrentPositionAsync({});
      return { lat: location.coords.latitude, long: location.coords.longitude };
    } catch (error) {
      console.error("Error getting location:", error);
      return null;
    }
  };

  const getISTDate = () => {
    const now = new Date();
    const ISTOffset = 330; // IST is UTC+5:30 (5 hours and 30 minutes in minutes)
    const currentOffset = now.getTimezoneOffset(); // Get the current timezone offset in minutes
    const totalOffset = currentOffset + ISTOffset; // Calculate the total offset for IST
    const ISTDate = new Date(now.getTime() + totalOffset * 60 * 1000); // Adjust the date to IST

    // Format the IST date manually in YYYY-MM-DD format
    const year = ISTDate.getFullYear();
    const month = String(ISTDate.getMonth() + 1).padStart(2, "0");
    const day = String(ISTDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`; // Return date in YYYY-MM-DD format
  };

  const updateDatabaseWithTime = async (classTime: string) => {
    if (!year || !semester || !courseId) {
      Alert.alert("Error", "Missing required parameters. Please navigate correctly.");
      return;
    }

    const fetchedLocation = await askForLocationPermission();
    if (!fetchedLocation) {
      Alert.alert("Error", "Failed to fetch location. Please try again.");
      return;
    }

    try {
      // Get today's date in IST
      const today = getISTDate();

      // Generate a unique session ID
      const sessionId = uuidv4();

      // Reference to the session document
      const sessionDocRef = doc(
        db,
        "years",
        year as string,
        "semesters",
        semester as string,
        "courses",
        courseId as string,
        "attendance",
        today, // Date document (IST)
        "sessions", // Subcollection for sessions
        sessionId // Unique session ID
      );
      let   delT=classTime;
      // Add additional logging for debugging
      console.log("Updating session document with:", {
        sessionId,
        classTime,
        courseId,
        delT,
        latitude: fetchedLocation.lat,
        longitude: fetchedLocation.long,
        date: today,
      });

      // Update the session document with class time, courseId, and location
      await setDoc(sessionDocRef, {
        sessionId,
        classTime,
        delT,
        courseId,
        FIXED_LATITUDE: fetchedLocation.lat,
        FIXED_LONGITUDE: fetchedLocation.long,
        date: today,
      });

      // Schedule clearing of classTime after 30 minutes
      setTimeout(async () => {
        try {
          await setDoc(
            sessionDocRef,
            { classTime: "" },
            { merge: true }
          );
          console.log("ClassTime cleared after 30 minutes.");
        } catch (error) {
          console.error("Error clearing classTime:", error);
        }
      }, 30 * 60 * 1000); // 30 minutes

      Alert.alert(
        "Success",
        `Class time for ${courseCode} (${course}) has been updated to ${classTime}.`
      );
    } catch (error) {
      console.error("Error updating class time:", error);
      Alert.alert("Error", "Failed to update the time. Please try again later.");
    }
  };

  const scheduleTask = async () => {
    // Validate time input
    if (!hour || !minute || isNaN(Number(hour)) || isNaN(Number(minute))) {
      Alert.alert("Error", "Please enter a valid time.");
      return;
    }

    const selectedHour = parseInt(hour, 10);
    const selectedMinute = parseInt(minute, 10);

    if (selectedHour < 1 || selectedHour > 12 || selectedMinute < 0 || selectedMinute > 59) {
      Alert.alert("Error", "Please enter a valid hour (1-12) and minute (0-59).");
      return;
    }

    // Convert selected time to 12-hour format
    const classTime = `${selectedHour.toString().padStart(2, "0")}:${selectedMinute
      .toString()
      .padStart(2, "0")} ${amPm}`;

    updateDatabaseWithTime(classTime);
  };

  const setCurrentTime = async () => {
    const now = new Date();
    let currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isPM = currentHour >= 12;

    if (isPM) {
      currentHour = currentHour > 12 ? currentHour - 12 : currentHour;
    } else if (currentHour === 0) {
      currentHour = 12; // Midnight edge case
    }

    const formattedTime = `${currentHour.toString().padStart(2, "0")}:${currentMinute
      .toString()
      .padStart(2, "0")} ${isPM ? "PM" : "AM"}`;

    setHour(currentHour.toString());
    setMinute(currentMinute.toString().padStart(2, "0"));
    setAmPm(isPM ? "PM" : "AM");

    // Update the database with the current time
    await updateDatabaseWithTime(formattedTime);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Time for {course || "Unknown Course"}</Text>

      <View style={styles.timeInputContainer}>
        <TextInput
          style={styles.timeInput}
          placeholder="HH"
          keyboardType="numeric"
          maxLength={2}
          value={hour}
          onChangeText={setHour}
        />
        <Text style={styles.colon}>:</Text>
        <TextInput
          style={styles.timeInput}
          placeholder="MM"
          keyboardType="numeric"
          maxLength={2}
          value={minute}
          onChangeText={setMinute}
        />
        <TouchableOpacity
          style={styles.amPmButton}
          onPress={() => setAmPm(amPm === "AM" ? "PM" : "AM")}
        >
          <Text style={styles.amPmText}>{amPm}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.currentTimeButton} onPress={setCurrentTime}>
        <Text style={styles.currentTimeButtonText}>Set Current Time</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={scheduleTask}>
        <Text style={styles.buttonText}>Schedule Task</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  timeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  timeInput: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    textAlign: "center",
    marginHorizontal: 5,
    backgroundColor: "#fff",
    fontSize: 18,
    color: "#333",
  },
  colon: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  amPmButton: {
    width: 60,
    height: 50,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  amPmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  currentTimeButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#28a745",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  currentTimeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SetTimeScreen;
