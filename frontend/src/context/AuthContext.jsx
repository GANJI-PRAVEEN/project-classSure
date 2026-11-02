import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const navigate = useNavigate();
    const [token, setToken] = useState(() => localStorage.getItem("token"));

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        setToken(null);
        navigate("/login", { replace: true });
    }

    function login(newToken, user, role) {
        console.log("called login in authcontext");
        localStorage.setItem("token", newToken);
        localStorage.setItem("user", JSON.stringify(user));
        const cleanRole = String(role || "").toUpperCase().replace("ROLE_", "").trim();
        localStorage.setItem("role", cleanRole);
        setToken(newToken);
    }

    // Expiration auto-logout removed: users remain logged in until explicit logout
    return (
        <AuthContext.Provider value={{ token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

export default AuthContext;
