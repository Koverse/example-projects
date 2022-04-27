import React, { useEffect, useState, useContext, useRef} from "react";
import axios from 'axios';
import { Button} from '@material-ui/core';
import { useNavigate } from "react-router-dom";
import AuthContext from "../Auth/AuthContext";
import moment from "moment";
import ReactMapGL, {Marker} from 'react-map-gl'

const Homepage = () => {

    const [userDisplayName, setUserDisplayName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [recordOne, setRecordOne] = useState('');

    const navigate = useNavigate();
    const {loggedIn} = useContext(AuthContext);

    const [wolfData, setWolfData] = useState(null);
    const [adsbData, setAdsbData] = useState([]);
    const [dataTimer, setDataTimer] = useState({});
    const [lastFetchTime, setLastFetchTime] = useState(
        moment().subtract("5", "minutes").format("YYYY-MM-DD HH:mm:ss")
      );
    //const REFRESH_TIME = 25000;
    const REFRESH_TIME = 10000;

    const MAPBOX_TOKEN = 'pk.eyJ1IjoiaW5kaXJhamhlbm55IiwiYSI6ImNsMmc1NGtlYzAwbDczamx3OXpnZ3NrNzMifQ.ei_QTtV_inPDuU_SKQ1BBA';

    const [viewport, setViewport] = useState({
      longitude: -104.991531,
      latitude: 39.742043,
      width: "100%",
      height: "100%",
      zoom: 10,
  })
    const mapRef = useRef();

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

     // press "Get data" button to render one of the 22 received data records on the page
     const getData3 = () => {
       console.log("Data already in adsbData var")
       console.log(adsbData)
       const accessToken = JSON.parse(localStorage.getItem("user")).accessToken
       axios.get('http://localhost:5000/getData3', {params: {token: accessToken}})
      .then(res => 
        {
          console.log("received data: ")
          console.log(res)
          // generate a random number up to 22
          let rand = Math.random() * 22;
          rand = Math.floor(rand);
          setRecordOne(JSON.stringify(res.data.records[rand]))
        })
      .catch(err => {
          console.log("DID NOT receive data: ")
          console.log(err)
      })
    }

    useEffect(() => {
      // get user login credentials
      // send token as a parameter
      console.log("test")
      const accessToken = localStorage.getItem("token")
      axios.get('http://localhost:5000/getCred', 
      {params: {token: accessToken}})
      .then(res => 
        {
          console.log("received credentials: ")
          console.log(res)
          // save user in local storage in order to refer to access token
          localStorage.setItem("user", JSON.stringify(res.data))
          // store username and email
          setUserDisplayName(res.data.user.displayName);        
          setUserEmail(res.data.user.email); 

        })
      .catch(err => {
          console.log(err)
          console.log("Unable to get user credentials")
          logout(); // reactivate once authentication is working again
      })
    }, [])
  
  useEffect(() => {
    setAdsbData([]);
    console.log(lastFetchTime);
    console.log(moment().subtract("20", "minutes").utc().format("YYYY-MM-DDTHH:mm:ss[Z]"));
    if (localStorage.getItem("user") === null)
    {
        console.log("do not call postData")
    }
    else if (localStorage.getItem("user") !== null)
    {
      console.log("Call postData")
      const accessToken = JSON.parse(localStorage.getItem("user")).accessToken
  
      axios.get('http://localhost:5000/getData3', {params: {token: accessToken}})
      .then(res => 
        {
          console.log("received data: ")
          console.log(res)
          // generate a random number up to 15
          let rand = Math.random() * 15;
          rand = Math.floor(rand);
          setRecordOne(JSON.stringify(res.data.records[rand]))
          setAdsbData(res.data.records);
          setLastFetchTime(moment().format("YYYY-MM-DD HH:mm:ss"));
  
        })
      .catch(err => {
          console.log("DID NOT receive data: ")
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
                    onClick={()=> {getData3()}}
                    >Get Data</Button>
                    <>{recordOne}</>

                    <div style={{ height: "100vh" }}>
                    <ReactMapGL
                      {...viewport}
                      ref={mapRef}
                      mapStyle="mapbox://styles/mapbox/dark-v9"
                      mapboxAccessToken={MAPBOX_TOKEN}
                      onViewportChange={(nextViewport) => setViewport(nextViewport)}
                      >
                    markers here
                    <Marker longitude={-104.991531} latitude={39.742043} anchor="bottom" >
                      <img src="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" />
                    </Marker>
                    </ReactMapGL>        
                    </div>
                </> 
            }
        </div>
    );
};


  export default Homepage;