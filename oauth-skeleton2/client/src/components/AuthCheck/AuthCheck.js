import React, { useEffect, useState, useContext } from "react";
import axios from 'axios';
import {useLocation} from "react-router-dom";
import { useNavigate } from "react-router-dom";
import AuthContext from "../Auth/AuthContext";


const AuthCheck = () => {

    const search = useLocation().search;
    const code = new URLSearchParams(search).get('code');
    const navigate = useNavigate();

    const {loggedIn} = useContext(AuthContext);
    
      useEffect(() => {

        // can only be called once immediately from KDP redirect since that is the only way params can be passed
        axios.get("/callback", { params: { code: code } })
          .then((res) => {
            navigate("/auth/success");
            window.location.reload();
        })
        .catch(err => 
        {
          console.log(err)
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