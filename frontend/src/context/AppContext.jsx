import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUsers, createUser } from '../api/client';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [users, setUsers] = useState([]);
    const [activeUserId, setActiveUserId] = useState(null);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await getUsers();
            setUsers(res.data);
            // Only default to the first user if nothing is selected yet — use the
            // functional form so this always checks the *current* activeUserId
            // instead of the value captured when this callback was created.
            // Otherwise every refetch (e.g. after adding/editing a team member)
            // would silently reset an already-chosen "viewing as" user back to
            // the first one in the list.
            if (res.data.length > 0) {
                setActiveUserId(prev => prev || res.data[0]._id);
            }
        } catch (e) {
            console.error('Failed to fetch users', e);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const addUser = async (data) => {
        const res = await createUser(data);
        setUsers(prev => [res.data, ...prev]);
        return res.data;
    };

    return (
        <AppContext.Provider value={{ users, activeUserId, setActiveUserId, fetchUsers, addUser }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
