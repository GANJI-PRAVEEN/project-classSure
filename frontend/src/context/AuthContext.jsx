import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";


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
        localStorage.setItem("role", role);
        setToken(newToken);
    }


    useEffect(() => {
        if (!token) return;

        let timeoutId;
        try {
            // 1. Read the expiration from the JWT
            const decodedToken = jwtDecode(token);

            // 2. Convert exp from seconds to milliseconds
            const expirationTime = decodedToken.exp * 1000;

            // 3. Calculate remaining time
            const remainingTime = expirationTime - Date.now();
            // 4. If expired, log out immediately
            if (
                !decodedToken.exp ||
                !Number.isFinite(expirationTime) ||
                remainingTime <= 0
            ) {
                logout();
                return;
            }
            // 5. Automatically log out when it expires
            timeoutId = setTimeout(() => {
                logout();
            }, remainingTime);


        } catch (error) {
            console.error("JWT decode error", error)
            logout()
        }
        return () => clearTimeout(timeoutId);
    }, [token]);
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
