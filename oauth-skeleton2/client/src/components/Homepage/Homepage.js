import React, { useEffect, useState, useContext} from "react";
import axios from 'axios';
import { Button} from '@material-ui/core';
import { useNavigate } from "react-router-dom";
import AuthContext from "../Auth/AuthContext";
import moment from "moment";

const Homepage = () => {

    const [userDisplayName, setUserDisplayName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [recordOne, setRecordOne] = useState('');

    const navigate = useNavigate();
    const {loggedIn} = useContext(AuthContext);

    const [wolfData, setWolfData] = useState(null);
    const [dataTimer, setDataTimer] = useState({});
    const [lastFetchTime, setLastFetchTime] = useState(
        moment().subtract("5", "minutes").format("YYYY-MM-DD HH:mm:ss")
      );
    //const REFRESH_TIME = 25000;
    const REFRESH_TIME = 10000;
    const kdp4URL = `https://api.dev.koverse.com/query`;

    // press "Get data" button to render one of the 22 received data records on the page
    const getData2 = () => {
      const accessToken = JSON.parse(localStorage.getItem("user")).accessToken
      console.log(accessToken)
      axios.get('http://localhost:5000/getData', 
      {params: {token: accessToken}})
      .then(res => 

        {
          console.log("received wolf data: ")
          console.log(res)
          // generate a random number up to 22
          let rand = Math.random() * 22;
          rand = Math.floor(rand);
          setRecordOne(JSON.stringify(res.data.records[rand]))
        })
      .catch(err => {
          console.log("DID NOT receive wolf data: ")
          console.log(err)
      })
    }

  // GET newest wolf data in the last 5 minutes
  // set the who inside to be a conditional between if accessToken is null or NOT
  useEffect(() => {
    setWolfData([]);
    console.log(lastFetchTime);
    if (localStorage.getItem("user") === null)
    {
        console.log("do not call postData")
    }
    else if (localStorage.getItem("user") !== null)
    {
        console.log("Call postData")
        console.log(JSON.parse(localStorage.getItem("user")))
        const accessToken = JSON.parse(localStorage.getItem("user")).accessToken

        axios.get('http://localhost:5000/getData', 
        {params: {token: accessToken}})
        .then(data => 
        {
          console.log("received wolf data: ")
          console.log(data)
          
          console.log(dataTimer.id)
          if (data.length > 0 && dataTimer.id !== null) {
            console.log("dataTimer.id != null")
            const wolfData2 = data.records.map((record) => {
              return {
                  type: "WolfData2",
                  individual: record.Individual,
                  color: record.Colour,
                  population: record.Population,
                  cpgmg: record.Cpgmg,
                  tpgmg: record.Tpgmg,
                  ppgmg: record.Ppgmg,
                  sex: record.Sex,
              };
            });
  
            setWolfData(wolfData2);
            setLastFetchTime(moment().format("YYYY-MM-DD HH:mm:ss"));
          }
          
        })
        .catch(err => {
            console.log("DID NOT receive wolf data: ")
            console.log(err)
        })
        .finally(() => {
          console.log("set data timer")
          dataTimer.nextTimeoutId = setTimeout(
            () => setDataTimer({ id: dataTimer.nextTimeoutId }),
            REFRESH_TIME
          );
        });
    }
        
        return () => {
          clearTimeout(dataTimer.nextTimeoutId);
          dataTimer.id = null;
        };
  }, [dataTimer]);


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
            //navigate("/");
            //window.location.reload();
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
                    onClick={()=> {getData2()}}
                    >Get Data</Button>
                    {/* <Button style={{color: 'white', background: 'gray'}}
                    onClick={()=> {writeData()}}
                    >Write Data</Button> */}
                    <>{recordOne}</>
                </> 
            }
        </div>
    );
};


  export default Homepage;