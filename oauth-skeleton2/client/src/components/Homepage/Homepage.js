import React, { useEffect, useState, useContext} from "react";
import axios from 'axios';
import { Button} from '@material-ui/core';
import { useNavigate } from "react-router-dom";
import AuthContext from "../Auth/AuthContext";

const Homepage = () => {

    const [userDisplayName, setUserDisplayName] = useState('');
    const navigate = useNavigate();
    const {loggedIn} = useContext(AuthContext);
    //console.log("LoggedInState: ")
    //console.log(loggedIn)

    const logout = () => {
        console.log("Remove token and log out");
        localStorage.removeItem('token');
        //call logout endpoint
        const loggedInState = axios.get("http://localhost:5000/logout");
        console.log("loggedInState: " + loggedInState)

        navigate("/");
        window.location.reload();
    }

    useEffect(() => {
        // get user login credentials
        axios.post('https://api.dev.koverse.com/authentication', 
        {
                "strategy": "jwt",
                "accessToken": localStorage.getItem('token')
        })
        .then(response => {
            // store response token in local storage
            console.log(response);   
            setUserDisplayName(response.data.user.displayName);        
        })
        .catch(err => {
            console.log("Unable to get user credentials")
            logout();
            navigate("/");
            window.location.reload();
        })
    }, [])

    return (
        <div>
            {loggedIn && 
                <>
                    <p>Homepage</p>
                    <b>User Credentials: </b>
                    <p>{userDisplayName}</p>
                    <Button style={{color: 'white', background: 'gray'}}
                    onClick={()=> {logout()}}
                    >Log-out</Button>
                </> 
            }
        </div>
        
    );

};


  export default Homepage;