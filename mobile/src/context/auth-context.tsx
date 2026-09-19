import React, { createContext, useContext, useState, useEffect } from "react";
import { api, DEFAULT_SERVER_URL } from "../api/client";
import { FolderType, Mailbox, User } from "../types";
import { clearAllCache } from "../lib/cache";

interface AuthContextType {
  user: User | null;
  token: string | null;
  serverUrl: string;
  isLoading: boolean;
  mailboxes: Mailbox[];
  selectedMailbox: Mailbox | null;
  selectedFolder: FolderType;
  login: (email: string, password: string, serverUrl?: string) => Promise<{ mfaRequired?: boolean; challengeToken?: string }>;
  verifyMfa: (challengeToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  setServerUrl: (url: string) => Promise<void>;
  setSelectedMailbox: (mailbox: Mailbox | null) => void;
  setSelectedFolder: (folder: FolderType) => void;
  refreshMailboxes: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrlState] = useState<string>(DEFAULT_SERVER_URL);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [selectedMailbox, setSelectedMailbox] = useState<Mailbox | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderType>("inbox");

  useEffect(() => {
    async function init() {
      try {
        const data = await api.init();
        setToken(data.token);
        setUser(data.user);
        setServerUrlState(data.serverUrl);

        if (data.token) {
          try {
            const fetchedMailboxes = await api.getMailboxes();
            setMailboxes(fetchedMailboxes);
            if (fetchedMailboxes.length > 0) {
              const primary = fetchedMailboxes.find((m) => m.isPrimary) || fetchedMailboxes[0];
              setSelectedMailbox(primary);
            }
          } catch {
            // non-fatal if offline
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const login = async (email: string, password: string, customServerUrl?: string) => {
    if (customServerUrl) {
      await api.setServerUrl(customServerUrl);
      setServerUrlState(customServerUrl);
    }
    const res = await api.login(email, password);
    if (res.mfaRequired && res.challengeToken) {
      return { mfaRequired: true, challengeToken: res.challengeToken };
    }

    setToken(res.token);
    setUser(res.user || null);

    try {
      const fetchedMailboxes = await api.getMailboxes();
      setMailboxes(fetchedMailboxes);
      if (fetchedMailboxes.length > 0) {
        const primary = fetchedMailboxes.find((m) => m.isPrimary) || fetchedMailboxes[0];
        setSelectedMailbox(primary);
      }
    } catch {
      // ignore
    }
    return {};
  };

  const verifyMfa = async (challengeToken: string, code: string) => {
    const res = await api.verifyMfa(challengeToken, code);
    setToken(res.token);
    setUser(res.user || null);

    try {
      const fetchedMailboxes = await api.getMailboxes();
      setMailboxes(fetchedMailboxes);
      if (fetchedMailboxes.length > 0) {
        const primary = fetchedMailboxes.find((m) => m.isPrimary) || fetchedMailboxes[0];
        setSelectedMailbox(primary);
      }
    } catch {
      // ignore
    }
  };

  const logout = async () => {
    try {
      await clearAllCache();
    } catch {}
    await api.logout();
    setToken(null);
    setUser(null);
    setMailboxes([]);
    setSelectedMailbox(null);
  };

  const setServerUrl = async (url: string) => {
    await api.setServerUrl(url);
    setServerUrlState(url);
  };

  const refreshMailboxes = async () => {
    try {
      const fetchedMailboxes = await api.getMailboxes();
      setMailboxes(fetchedMailboxes);
    } catch (err) {
      console.error("Refresh mailboxes failed:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        serverUrl,
        isLoading,
        mailboxes,
        selectedMailbox,
        selectedFolder,
        login,
        verifyMfa,
        logout,
        setServerUrl,
        setSelectedMailbox,
        setSelectedFolder,
        refreshMailboxes,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
