import { useEffect, useState, useCallback, useMemo } from 'react';
import { ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import { User } from '../api/types/user';
import { getMyUser } from '../api/queries/getMyUser';
import { logoutUser } from '../api/queries/logout';
import {
  requestAccessTokenRefresh,
  setTokenRefreshCallback,
  setAccessToken as setApiAccessToken,
} from '../api/apiRequest';

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [userData, setUserData] = useState<User | null>(null);
  const [userDataInitialized, setUserDataInitialized] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState<boolean>(false);
  const [isRefreshingUserData, setIsRefreshingUserData] = useState<boolean>(false);

  const refreshUserData = useCallback(async () => {
    if (accessToken && !isRefreshingUserData) {
      setIsRefreshingUserData(true);
      try {
        const user = await getMyUser();
        setUserData(user);
      } finally {
        setIsRefreshingUserData(false);
      }
    }
  }, [accessToken, isRefreshingUserData]);

  const clearUserData = useCallback(async () => {
    await logoutUser();

    setUserData(null);
    setAccessToken(null);
    setIsRefreshingUserData(false);
  }, []);

  // Silent refresh - refresh token every 10 minutes to prevent expiration
  useEffect(() => {
    let refreshInterval: ReturnType<typeof setInterval> | null = null;

    if (accessToken) {
      refreshInterval = setInterval(
        async () => {
          try {
            const tokenResponse = await requestAccessTokenRefresh();
            setAccessToken(tokenResponse.accessToken);
          } catch {
            // If silent refresh fails, clear the auth state to force re-login
            setAccessToken(null);
            setUserData(null);
            setUserDataInitialized(true);
            setIsRefreshingUserData(false);
          }
        },
        10 * 60 * 1000,
      );
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [accessToken]);

  // Set the token refresh callback once on mount
  useEffect(() => {
    setTokenRefreshCallback((newToken: string) => {
      setAccessToken(newToken);
    });
  }, []);

  // Update the access token in apiRequest module whenever the token changes
  useEffect(() => {
    setApiAccessToken(accessToken);
  }, [accessToken]);

  // Try to refresh token on app initialization - only once
  useEffect(() => {
    const initializeAuth = async () => {
      if (!hasAttemptedRefresh && !accessToken) {
        setHasAttemptedRefresh(true);
        try {
          const tokenResponse = await requestAccessTokenRefresh();
          setAccessToken(tokenResponse.accessToken);
          // userDataInitialized will be set after fetching user data in the next effect
        } catch {
          // No valid refresh token - user needs to login
          setUserDataInitialized(true);
        }
      }
    };

    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      if (!userData && accessToken) {
        try {
          const user = await getMyUser();

          if (isMounted) {
            setUserData(user);
            setUserDataInitialized(true);
          }
        } catch {
          // Failed to fetch user data - token might be invalid
          if (isMounted) {
            setUserData(null);
            setUserDataInitialized(true);
          }
        }
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [userData, accessToken]);

  const contextValue = useMemo(
    () => ({
      userData,
      userDataInitialized,
      clearUserData,
      refreshUserData,
      accessToken,
    }),
    [userData, userDataInitialized, clearUserData, refreshUserData, accessToken],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
