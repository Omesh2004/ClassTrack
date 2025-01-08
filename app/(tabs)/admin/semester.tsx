import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const SemesterScreen: React.FC = () => {
  const router = useRouter();
  const { year } = useLocalSearchParams();

  // Map the year to its respective semesters
  const semestersByYear: { [key: string]: number[] } = {
    "1": [1, 2],
    "2": [3, 4],
    "3": [5, 6],
    "4": [7, 8],
  };

  // Get semesters for the selected year
  const semesters = semestersByYear[year as string] || [];

  const handleSemesterSelect = (semester: number) => {
    router.push(`/admin/courses?year=${year}&semester=${semester}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Semester for {year} Year</Text>
      {semesters.map((semester) => (
        <TouchableOpacity
          key={semester}
          style={styles.button}
          onPress={() => handleSemesterSelect(semester)}
        >
          <Text style={styles.buttonText}>{semester} Semester</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
});

export default SemesterScreen;
