import React, { useContext} from 'react';
import { OauthSender } from 'react-oauth-flow';
import AuthContext from "../Auth/AuthContext";
import { useNavigate } from "react-router-dom";

const Login = () => {

   const {loggedIn} = useContext(AuthContext);
   console.log("LoggedInState: ")
   console.log(loggedIn)
   const navigate = useNavigate();

   if (loggedIn === true){
    navigate("/auth/success");
    window.location.reload();
   }

    return (
        
        <>
        <p>Login Through KDP </p> 
          <OauthSender
            authorizeUrl='https://api.app.koverse.com/oauth2/auth'
            clientId='2269be05b435ced00fa363556c6868a77f4c98f9235a811694c670dc92b18f75'
            //clientId='444a0f8a0c2dabfdb37c3f54afda14390eb7f1eef09aa78e0fd5f6c7576c324f'
            redirectUri='http://localhost:3000/auth/koverse'
            //redirectUri='http://localhost:5000/callback'
            state={{ to: '/auth/success' }}
            render={({ url }) => <a href={url}>Connect to KDP4</a>}
          />
        </>   
    );
  
}
export default Login;