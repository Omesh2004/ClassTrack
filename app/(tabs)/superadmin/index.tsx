import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions, Animated } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const SuperAdminHome = () => {
  const router = useRouter();
  const cardScale = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(cardScale, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(cardScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#f8fafc', '#e2e8f0']}
        style={styles.background}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Portal</Text>
          <Text style={styles.subtitle}>Manage your institution</Text>
        </View>

        <View style={styles.grid}>
          <Animated.View style={{ transform: [{ scale: cardScale }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={() => router.push('/superadmin/year')}
            >
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                style={[styles.card, styles.academicsCard]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardIcon}>
                  <MaterialIcons name="school" size={32} color="white" />
                </View>
                <Text style={styles.cardTitle}>Academics</Text>
                <Text style={styles.cardDescription}>
                  Manage years, semesters, and courses
                </Text>
                <View style={styles.cardArrow}>
                  <MaterialIcons name="arrow-forward" size={24} color="white" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: cardScale }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={() => router.push('/superadmin/students')}
            >
              <LinearGradient
                colors={['#10b981', '#34d399']}
                style={[styles.card, styles.studentsCard]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardIcon}>
                  <MaterialIcons name="people" size={32} color="white" />
                </View>
                <Text style={styles.cardTitle}>Students</Text>
                <Text style={styles.cardDescription}>
                  View and manage student records
                </Text>
                <View style={styles.cardArrow}>
                  <MaterialIcons name="arrow-forward" size={24} color="white" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 48,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  grid: {
    gap: 20,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    minHeight: 180,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  academicsCard: {
    backgroundColor: '#6366f1',
  },
  studentsCard: {
    backgroundColor: '#10b981',
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
    marginBottom: 16,
  },
  cardArrow: {
    alignSelf: 'flex-end',
  },
});

export default SuperAdminHome;