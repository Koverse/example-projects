import React, { useEffect, useState, createContext } from 'react'
import axios from 'axios';

const AuthContext = createContext();

function AuthContextProvider(props) {
    const [loggedIn, setLoggedIn] = useState(false);

    async function getLoggedIn() {
        // get users loggedIn state as a response from server
        if (localStorage.getItem("user") !== null)
        {
            console.log("user is logged in")
            setLoggedIn(true);
        }
        else if (localStorage.getItem("user") === null) {
            console.log("user is NOT logged in")
            setLoggedIn(false);
        }

        
    }

    useEffect(() => {
        // runs when component starts
        getLoggedIn();
    }, []);

    return (
        <AuthContext.Provider value ={{loggedIn, getLoggedIn}}>
            {props.children}
        </AuthContext.Provider>
    );
}

export default AuthContext; 
export {AuthContextProvider}