import React, { useEffect, useState } from "react";
import axios from 'axios';
import { Button} from '@material-ui/core';
import { useNavigate } from "react-router-dom";

const Homepage = () => {

    const [userDisplayName, setUserDisplayName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [data, setData] = useState([]);
    const navigate = useNavigate();

    const logout = () => {
        console.log("Remove token and log out");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        //call logout endpoint
        const loggedInState = axios.get("/logout");
        navigate("/");
        window.location.reload();
    }

    const getData = () => {
        console.log("calling /query endpoint");
        axios.get('/getData')
        .then(response => {
            // store response token in local storage
            console.log(response.data);
            setData(response.data.records)
        })
        .catch(err => {
            console.log(err)
            console.log("DATA NOT RECEIVED")
        })
        
    }
    useEffect(() => {
        // gets jwt and credentials
        axios.get("/getCredentials") 
        .then(response => {
            console.log("received credentials: ");
            // store response token in local storage
            console.log(response);
            localStorage.setItem("user", JSON.stringify(response.data))
            setUserDisplayName(response.data.displayName);        
            setUserEmail(response.data.email); 
        })
        .catch(err => {
            console.log("Unable to get user credentials")
            console.log(err)
            logout();
            navigate("/");
            window.location.reload();
        })
    }, [])

    return (
        <div>
      
                <>
                    <p>Homepage</p>
                    <b>User Credentials: </b>
                    <p>{userDisplayName}</p>
                    <p>{userEmail}</p>
                    <Button style={{color: 'white', background: 'gray'}}
                    onClick={()=> {logout()}}
                    >Log-out</Button>
                    <Button style={{color: 'white', background: 'gray'}}
                    onClick={()=> {getData()}}
                    >Get Data</Button>
                    {data.length !== 0 && 
                        <div>{JSON.stringify(data)}</div>
                    }
                </> 
            
        </div>
        
    );

};


  export default Homepage;