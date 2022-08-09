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
        // TRAINING: KDP4 Authentication 
        // Remove token and user from local storage so user is no longer recognized as logged in
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        //call logout endpoint to update backend login status
        const loggedInState = axios.get("http://localhost:5000/logout");
        console.log("loggedInState: " + loggedInState)

        navigate("/");
        window.location.reload();
    }

    useEffect(() => {
        // get user login credentials
        const accessToken = localStorage.getItem("token");
        console.log(accessToken);
        axios
        .get("http://localhost:5000/getCredentials", {
            params: { token: accessToken },
        })
        .then((response) => {
            // RECEIVED CREDENTIALS
            // save user in local storage in order to refer to access token
            localStorage.setItem("user", JSON.stringify(response.data))
            setUserDisplayName(response.data.user.displayName);        
            setUserEmail(response.data.user.email); 
        })
        .catch((err) => {
            // UNABLE TO GET USER CREDENTIALS
            logout();
            navigate("/");
            window.location.reload();

        });
    }, [])

    // TRAINING: KDP4 Read Records from Datasets
    const getData = () => {

        // Get JWT access token from local storage
        const accessToken = JSON.parse(localStorage.getItem("user")).accessToken

        // TRAINING TODO: Replace Base API URL with URL of KDP4 workspace you created
        //  https://${BASE_URL}/query
        axios.post('https://api.staging.koverse.com/query',
        {
            // TRAINING TODO: Replace 'datasetId' value with dataset ID of the dataset you want to reference and read data from
            "datasetId": "8a8901b3-2b08-45ae-94b7-dff1cbb8d0b4",
            // TRAINING TODO: For the 'expression' key-value pair, type a SQL statement that selects and returns data for a specific dataset, 
            // where one of the columns equals a specific value
            // Try different SQL statements to get familiar with how SQL is used to reference the data you need from KDP4 datasets
            "expression": "SELECT * FROM \"8a8901b3-2b08-45ae-94b7-dff1cbb8d0b4\"",
            "limit": 0,
            "offset": 0
        }, 
        {
            headers: {
              "Authorization": "Bearer " + accessToken
            }
        })
        .then(response => {
            // SUCCESSFULLY QUERIED AND RECEIVED DESIRED DATA
            console.log(response);
        })
        .catch(err => {
            // ERROR QUERYING/READING DATA
            console.log(err)
        })

    }

    // TRAINING: KDP4 Write Records to Datasets - Done through endpoint local server to avoid CORS issues
    const writeData = () => {
        // Get JWT access token from local storage
        const accessToken = JSON.parse(localStorage.getItem("user")).accessToken;

        // TRAINING TODO: Replace 'data_to_write' with data you want added to a KDP4 dataset, does not have to be a string
        const data_to_write = "new data";

        // call endpoint defined in local node server to write desired data to KDP4 dataset
        axios.post("http://localhost:5000/writeData", data_to_write,
        {params: { token: accessToken }})
        .then((response) => {
            // Successfully wrote text to kdp4
            console.log(response)
        })
        .catch((error) => {
            console.log(error)
        });
    }

    /*const writeData = () => {
        console.log("calling /query endpoint");
        const accessToken = JSON.parse(localStorage.getItem("user")).accessToken

        //"/pokemon?limit=1000"
        console.log(accessToken)
        //axios.get("http://localhost:5000/callback", {params: {code: code}})
        //axios.post('https://api.app.koverse.com/write?datasetId=8a8901b3-2b08-45ae-94b7-dff1cbb8d0b4', 
        axios.post('https://api.app.koverse.com/write?datasetId=', {params: {datasetId: "8a8901b3-2b08-45ae-94b7-dff1cbb8d0b4"}}, 
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