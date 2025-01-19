import React from "react";
import { View, Button, Alert, StyleSheet } from "react-native";
import * as Location from "expo-location";

// Fixed point (e.g., admin's location)
const FIXED_LATITUDE = 25.5412206; // Replace with your fixed latitude
const FIXED_LONGITUDE = 84.8528964; // Replace with your fixed longitude
const RADIUS = 80; // Radius in meters
const RequestLocation = () => {
  const askForLocationPermission = async () => {
    // Request permission for location access
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      console.log("Permission Granted", "You can now access location services.");
    // Fetch the current location coordinates
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude, accuracy } = location.coords;
      console.log("Coordinates:", { latitude, longitude, accuracy });
      // Check if the user is within the fixed radius
      const distance = calculateDistance(
        latitude,
        longitude,
        FIXED_LATITUDE,
        FIXED_LONGITUDE
      );
      
      console.log(distance)
      if (distance <= RADIUS) {
        console.log("Inside", `You are within ${RADIUS} meters of the fixed point.`);
        Alert.alert("Inside", `You are within ${RADIUS} meters of the fixed point.`);
      } else {
        console.log("Outside", `You are outside the ${RADIUS} meters radius.`);
        Alert.alert("Outside", `You are outside the ${RADIUS} meters radius.`);
      }
    } else {
      console.log("Permission Denied", "Location access was denied.");
      Alert.alert("Permission Denied", "Location access was denied.");
    }
  };
  // Function to calculate the distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const R = 6371e3; // Earth radius in meters
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };
  return (
    <View style={styles.container}>
      <Button title="Request GPS Permission" onPress={askForLocationPermission} />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default RequestLocation;
