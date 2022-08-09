import React, { useEffect, useState, createContext } from 'react'

const AuthContext = createContext();

// Used to keep track of user's logged in state based on if token is located in local storage
function AuthContextProvider(props) {
    const [loggedIn, setLoggedIn] = useState(false);

    async function getLoggedIn() {
        // get loggedIn state as a response from server
        if (localStorage.getItem("token") !== null)
        {
            setLoggedIn(true);
        }
        else if (localStorage.getItem("token") === null) {
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