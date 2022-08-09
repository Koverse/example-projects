import React, { useContext} from 'react';
import { OauthSender } from 'react-oauth-flow';
import AuthContext from "../Auth/AuthContext";
import { useNavigate } from "react-router-dom";

const Login = () => {

   const {loggedIn} = useContext(AuthContext);
   const navigate = useNavigate();

   if (loggedIn === true){
    navigate("/auth/success");
    window.location.reload();
   }

    return (
        <>
        <p>Login Through KDP4 </p> 
        {/* TRAINING: KDP4 Authentication */}
        <OauthSender
            // TRAINING TODO: Replace 'authorizeUrl' with url of the KDP4 workspaces you or app user will be referencing datasets from
            authorizeUrl='https://api.staging.koverse.com/oauth2/auth'
            // TRAINING TODO: Replace 'clientId' value with the client ID you received from setting up an Application on KDP4
            clientId='66e63d65b6d0e150e6d02776e734188b0767fec5591005332b9e4a920b8371b7'
            // TRAINING TODO: Replace 'redirectUri' value with the url you declared when setting up a KDP4 Application
            redirectUri='http://localhost:3000/auth/koverse'
            state={{ to: '/auth/success' }}
            render={({ url }) => <a href={url}>Connect to KDP4</a>}
          />
        </>   
    );
  
}
export default Login;