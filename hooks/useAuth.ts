// useAuth.ts
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, getAuth } from 'firebase/auth';
import { auth } from '@/utils/firebaseConfig'; // import your firebase config

interface AuthContextProps {
  user: User | null;
}

export const useAuth = (): AuthContextProps => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // updates user state on auth change
    });

    return () => unsubscribe(); // clean up listener on component unmount
  }, []);

  return { user }; // returns the current user (or null if not logged in)
};
