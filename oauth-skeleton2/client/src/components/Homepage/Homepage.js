import React, { useEffect, useState, useContext} from "react";
import axios from 'axios';
import { Button} from '@material-ui/core';
import { useNavigate } from "react-router-dom";
import AuthContext from "../Auth/AuthContext";

const Homepage = () => {

    const [userDisplayName, setUserDisplayName] = useState('');
    const [userEmail, setUserEmail] = useState('');

    const navigate = useNavigate();
    const {loggedIn} = useContext(AuthContext);

    const logout = () => {
        console.log("Remove token and log out");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        //call logout endpoint
        const loggedInState = axios.get("http://localhost:5000/logout");
        console.log("loggedInState: " + loggedInState)

        navigate("/");
        window.location.reload();
    }

    const getData = () => {
        console.log("calling /query endpoint");
        const accessToken = JSON.parse(localStorage.getItem("user")).accessToken

        console.log(accessToken)
        axios.post('https://api.dev.koverse.com/query', 
        {
                "datasetId": "8a8901b3-2b08-45ae-94b7-dff1cbb8d0b4",
                "expression": "SELECT * FROM \"8a8901b3-2b08-45ae-94b7-dff1cbb8d0b4\"",
                "limit": 0,
                "offset": 0
        }, 
        {
            headers: {
              "Authorization": "Bearer " + accessToken
            }
        }
        )
        .then(response => {
            // store response token in local storage
            console.log("Wildlife data received");
            console.log(response);
        })
        .catch(err => {
            console.log("DATA NOT RECEIVED")
        })

    }

    /*const writeData = () => {
        console.log("calling /query endpoint");
        const accessToken = JSON.parse(localStorage.getItem("user")).accessToken

        //"/pokemon?limit=1000"
        console.log(accessToken)
        //axios.get("http://localhost:5000/callback", {params: {code: code}})
        //axios.post('https://api.dev.koverse.com/write?datasetId=8a8901b3-2b08-45ae-94b7-dff1cbb8d0b4', 
        axios.post('https://api.dev.koverse.com/write?datasetId=', {params: {datasetId: "8a8901b3-2b08-45ae-94b7-dff1cbb8d0b4"}}, 
        {
            "additionalProp1": {
                "Colour": "M",
                "Cpgmg": "20.01",
                "Individual": "201",
                "Population": "2",
                "Ppgmg": "NA",
                "Sex": "M",
                "Tpgmg": "5.35",
            },
            "additionalProp2": {
                "Colour": "D",
                "Cpgmg": "20.02",
                "Individual": "202",
                "Population": "2",
                "Ppgmg": "NA",
                "Sex": "M",
                "Tpgmg": "5.35",
            },
        }, 
        {
            headers: {
              "Authorization": "Bearer " + accessToken,
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,PATCH,OPTIONS",
              "Access-Control-Allow-Headers": "Origin, Content-Type, Accept, Authorization, X-Request-With"
            }
        }
        )
        .then(response => {
            // store response token in local storage
            console.log("Added records to wildlife data");
            console.log(response);
        })
        .catch(err => {
            console.log("DID NOT SUCCESSFULLY WRITE TO WILDLIFE DATASET")
        })
    }*/
  

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
            localStorage.setItem("user", JSON.stringify(response.data))
            setUserDisplayName(response.data.user.displayName);        
            setUserEmail(response.data.user.email); 
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
                    <p>{userEmail}</p>
                    <Button style={{color: 'white', background: 'gray'}}
                    onClick={()=> {logout()}}
                    >Log-out</Button>
                    <Button style={{color: 'white', background: 'gray'}}
                    onClick={()=> {getData()}}
                    >Get Data</Button>
                    {/* <Button style={{color: 'white', background: 'gray'}}
                    onClick={()=> {writeData()}}
                    >Write Data</Button> */}
                </> 
            }
        </div>
        
    );

};


  export default Homepage;