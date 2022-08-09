import React, { useEffect, useContext } from "react";
import axios from 'axios';
import {useLocation} from "react-router-dom";
import { useNavigate } from "react-router-dom";

// "In-between" page that gets the first token back from KDP4 in order to fully authenticate the user and get other info from logged in user
// as well as get access to JWT token specific to logged in user that can also be used to make different API calls to users KDP4 workspace
const AuthCheck = () => {

    const navigate = useNavigate();

    // TRAINING: When user is redirected from KDP4 Oauth2 page, a code is returned as part of the redirect URL. 
    // We need to use this code to get token an additional token from KDP that will allows us to get user credentials
    const search = useLocation().search;
    const code = new URLSearchParams(search).get('code');
    
      useEffect(() => {

        // /callback should only be called once immediately after redirect back to web app from KDP4 since so params are successfully passed
        axios.get("http://localhost:5000/callback", {params: {code: code}})
        .then(res => 
        {
            // RECEIVED TOKEN SUCCESSFULLY - store token in local storage
            localStorage.setItem("token", res.data.access_token);
            navigate("/auth/success");
            window.location.reload();
        })
        .catch(err => 
        {
            console.log(err) //unable to successfully login
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