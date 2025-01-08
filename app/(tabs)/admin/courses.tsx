import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Sample courses data for different years and semesters
const coursesData = {
  "1-1": ["Introduction to Engineering", "Mathematics I"],
  "1-2": ["CB2201 Mechanical Operations", "CB2202 Mass Transfer-I", "CB2203 Fundamentals of Biochemical Engineering", "CB2204 Process Dynamics and Control", "CB2205 Chemical Reaction Engineering-I", "CB22PQ IDE-I"],
  "2-3": ["CB2101 - Introduction to Chemical Engineering", "CB2102 - Fluid Mechanics", "CB2103 - Heat Transfer", "CB2104 - Chemical Process Calculations", "CB2015 - Chemical Engineering Thermodynamics", "HSS Elective"],
  "2-4": ["CB2201 Mechanical Operations", "CB2202 Mass Transfer-I", "CB2203 Fundamentals of Biochemical Engineering", "CB2204 Process Dynamics and Control", "CB2205 Chemical Reaction Engineering-I", "CB22PQ IDE-I"],
  "3-5": ["CB3101 Mass Transfer-II", "CB3102 Chemical Process Technology", "CB3103 Process Equipment Design", "CB3104 Chemical Reaction Engineering-II", "CB3105 Chemical Process Modeling and Simulation", "CB31PQ IDE-II"],
  "3-6": ["CB3201 Process Plant Design and Economics", "CB3202 Transport Phenomena", "CB3203 Numerical Methods in Chemical Engineering", "CB3204 AI/ML for Chemical Engineers", "CB3205 Chemical Plant Safety and Hazards", "CB32PQ DE-I"],
  "4-7": ["CB41PQ DE-II", "CB41PQ DE-III", "XX41PQ IDE-III", "HS31PQ HSS Elective-II", "CB4198 Summer Internship*", "CB4199 Project - I"],
  "4-8": ["CB42PQ DE-IV", "CB42PQ DE-V", "CB4298 DE-VI", "CB4299 Project - II"],
};

const CourseScreen: React.FC = () => {
  const { year, semester } = useLocalSearchParams();
  const [courses, setCourses] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const key = `${year}-${semester}`;
    if (key in coursesData) {
      setCourses(coursesData[key as keyof typeof coursesData]);
    } else {
      setCourses([]);
    }
  }, [year, semester]);

  const handleCoursePress = (courseName: string) => {
    router.push({
      pathname: '/admin/settime',
      params: { course: courseName },
    });
    
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Courses for {year} Year - {semester} Semester
      </Text>
      <FlatList
        data={courses}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.course} onPress={() => handleCoursePress(item)}>
            <Text style={styles.courseText}>{item}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No courses available.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  course: {
    padding: 15,
    marginVertical: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
  },
  courseText: {
    fontSize: 18,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#888',
  },
});

export default CourseScreen;
