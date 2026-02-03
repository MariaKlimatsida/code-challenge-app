import { createContext, useEffect, useMemo, useState } from 'react';
import { clearSession, getSessionUser, login as apiLogin } from '../api/noviClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getSessionUser());
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Keep state in sync if something else updates localStorage
        setUser(getSessionUser());
    }, []);

    async function login(email, password) {
        setIsLoading(true);
        try {
            const data = await apiLogin(email, password);
            setUser(data.user || { email });
            return data;
        } finally {
            setIsLoading(false);
        }
    }

    function logout() {
        clearSession();
        setUser(null);
    }

    const value = useMemo(
        () => ({
            user,
            isAuthenticated: Boolean(user),
            isLoading,
            login,
            logout,
        }),
        [user, isLoading],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
