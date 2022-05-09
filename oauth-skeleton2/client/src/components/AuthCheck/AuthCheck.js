import React, { useEffect, useState, useContext } from "react";
import axios from 'axios';
import {useLocation} from "react-router-dom";
import { useNavigate } from "react-router-dom";
import AuthContext from "../Auth/AuthContext";


const AuthCheck = () => {

    const search = useLocation().search;
    const code = new URLSearchParams(search).get('code');
    console.log(code)
    const navigate = useNavigate();

    const {loggedIn} = useContext(AuthContext);
    console.log("LoggedInState: ")
    console.log(loggedIn)
    
      useEffect(() => {

        // can only be called once immediately from KDP redirect since that is the only way params can be passed
        axios.get("http://localhost:5000/callback", {params: {code: code}})
        .then(res => 
        {
            console.log("Calling callback function, token: ")
            // store token in local storage
            localStorage.setItem("token", res.data.access_token);
            navigate("/auth/success");
            window.location.reload();
        })
        .catch(err => 
        {
            console.log("Unable to call callback function") //unable to login
            console.log(loggedIn)
            navigate("/auth/success");
            window.location.reload();
        });
      }, []);
   


    return (
        <div>
            <p>Verifying...</p>
        </div>
        
    );

};

  export default AuthCheck;