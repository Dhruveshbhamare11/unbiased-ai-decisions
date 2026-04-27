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
  const [error, setError] = useState(null);

  const loginWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      setCurrentUser(result.user);
      return result.user;
    } catch (err) {
      // Demo Mode Fallback
      if (err.message === "auth/api-key-not-valid" || 
          (err.code && err.code.includes('api-key-not-valid')) || 
          (err.message && err.message.includes('api-key-not-valid'))) {
        console.warn("Firebase not configured. Logging in as Demo User.");
        const demoUser = {
          uid: 'demo-user-123',
          displayName: 'Demo User',
          email: 'demo@example.com',
          photoURL: 'https://ui-avatars.com/api/?name=Demo+User&background=0D8ABC&color=fff'
        };
        setCurrentUser(demoUser);
        setError(null); // Clear any error since we succeeded in demo mode
        return demoUser;
      }

      setError(err.message);
      console.error("Login error:", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setCurrentUser(null);
    } catch (err) {
      setError(err.message);
      console.error("Logout error:", err);
      throw err;
    }
  };

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (isMounted) {
        setCurrentUser(user);
        setLoading(false);
      }
    }, error => {
      if (isMounted) {
        console.error("Auth state error:", error);
        setLoading(false);
      }
    });

    // Safety timeout in case Firebase hangs with invalid config
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
      }
    }, 1500);

    return () => {
      isMounted = false;
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [loading]);

  const value = {
    currentUser,
    loginWithGoogle,
    logout,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
