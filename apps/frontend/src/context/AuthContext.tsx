import { createContext } from 'react';
import { User } from '../api/types/user';

export type AuthContextType = {
  userData: User | null;
  userDataInitialized: boolean;
  clearUserData: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  accessToken: string | null;
};

export const AuthContext = createContext<AuthContextType>({
  userData: null,
  userDataInitialized: false,
  clearUserData: async () => {},
  refreshUserData: async () => {},
  accessToken: null,
});
