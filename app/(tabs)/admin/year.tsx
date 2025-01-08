import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const YearScreen: React.FC = () => {
  const router = useRouter();

  const handleYearSelect = (year: number) => {
    router.push(`/admin/semester?year=${year}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Year</Text>
      {[1, 2, 3, 4].map((year) => (
        <TouchableOpacity
          key={year}
          style={styles.button}
          onPress={() => handleYearSelect(year)}
        >
          <Text style={styles.buttonText}>{year} Year</Text>
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

export default YearScreen;
