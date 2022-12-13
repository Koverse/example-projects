import React, { useContext} from 'react';
import { OauthSender } from 'react-oauth-flow';
import AuthContext from "../Auth/AuthContext";
import { useNavigate } from "react-router-dom";
import Button from "@material-ui/core/Button";


// Redirects user to KDP4 workspaces login page using Oauth flow 'react-oauth-flow' library
const Login = () => {

   const {loggedIn} = useContext(AuthContext);
   const navigate = useNavigate();

   // instead of checking this, check if login credentials can be received from backend api
   if (loggedIn === true){
    navigate("/auth/success");
    window.location.reload();
   }

    return (
        
        <div>
        <p style={{marginLeft:'15px'}}>Login Through KDP </p> 
          <OauthSender
            authorizeUrl='https://api.staging.koverse.com/oauth2/auth'
            clientId='66e63d65b6d0e150e6d02776e734188b0767fec5591005332b9e4a920b8371b7'
            redirectUri='http://localhost:3000/auth/koverse'
            state={{ to: '/auth/success' }}
            render={({ url }) => <Button style={{marginLeft:'10px'}} variant="outlined" href={url}>Connect to KDP4</Button>}
          />
        </div>   
    );
  
}
export default Login;