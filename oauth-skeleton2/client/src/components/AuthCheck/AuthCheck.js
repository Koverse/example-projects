import React, { useEffect, useContext } from "react";
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

        // get query params of /auth/koverse/?code and send it to callback query to get access token
        axios.get("/callback", {params: {code: code}})
        .then(res => 
        {
            // token successfully stored as cookie
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