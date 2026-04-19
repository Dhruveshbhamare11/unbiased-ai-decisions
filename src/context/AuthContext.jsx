import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebaseClient';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // For Demo Purposes before Firebase is actually connected:
  const [isDemoMode] = useState(true);

  const loginWithGoogle = async () => {
    if (isDemoMode) {
      setCurrentUser({
        displayName: "Google Judge",
        email: "judge@google.com",
        photoURL: ""
      });
      return;
    }
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const logout = async () => {
    if (isDemoMode) {
      setCurrentUser(null);
      return;
    }
    return signOut(auth);
  };

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, [isDemoMode]);

  const value = {
    currentUser,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
