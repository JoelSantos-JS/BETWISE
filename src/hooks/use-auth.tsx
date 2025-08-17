// Placeholder for useAuth hook
import { useState, useEffect } from 'react';

// This is a mock user object. In a real app, this would come from your auth provider.
const mockUser = {
  uid: 'mock-user-123',
  name: 'Mock User',
  email: 'mock@example.com',
};

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching user data
    setTimeout(() => {
      setUser(mockUser);
      setLoading(false);
    }, 1000);
  }, []);

  return { user, loading };
}
