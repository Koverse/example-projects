import React, { useEffect, useState, useContext, useRef, useMemo} from "react";
import axios from 'axios';
import { Button} from '@material-ui/core';
import { useNavigate } from "react-router-dom";
import AuthContext from "../Auth/AuthContext";
import moment from "moment";
import ReactMapGL, {Marker, NavigationControl, FullscreenControl} from 'react-map-gl'

const fullscreenControlStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  padding: "10px"
};

const navStyle = {
  position: "absolute",
  top: 36,
  left: 0,
  padding: "10px"
};

const Homepage = () => {

    const [userDisplayName, setUserDisplayName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [recordOne, setRecordOne] = useState('');

    const navigate = useNavigate();
    const {loggedIn} = useContext(AuthContext);

    const [adsbData, setAdsbData] = useState([]);
    const [dataTimer, setDataTimer] = useState({});
    const [lastFetchTime, setLastFetchTime] = useState(
        moment().subtract("5", "minutes").format("YYYY-MM-DD HH:mm:ss")
      );
    const REFRESH_TIME = 25000;
    //const REFRESH_TIME = 10000;

    const MAPBOX_TOKEN = 'pk.eyJ1IjoiaW5kaXJhamhlbm55IiwiYSI6ImNsMmc1NGtlYzAwbDczamx3OXpnZ3NrNzMifQ.ei_QTtV_inPDuU_SKQ1BBA';

    const [viewport, setViewport] = useState({
      longitude: -104.991531,
      latitude: 39.742043,
      width: "100%",
      height: "100%",
      zoom: 6,
      bearing: 0,
      pitch: 0
  })
    const mapRef = useRef();

    const blueMarker = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";

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
          // instead of setting like this, map the objects within array of objects to new
          // array with an object you designed on your own, it will help when making layers
          console.log(res.data.records)
          let preFlightData = res.data.records.map((record) => {

              return {
                coordinates: [
                  Number(record.lon),
                  Number(record.lat),
                  Number(record.alt_baro),
                ],
                callsign: record.flight,
                track: record.track,
                hex: record.hex,
                type: "Plane",
                details: record.flight,
                category: record.category,
                nav_heading: record.nav_heading,
                squawk: record.squawk,
                IngestTime: record.flight_aware_ts,
              };
          });

          preFlightData = preFlightData.filter(function (element) {
            return element !== undefined;
          });

          const dataAsObj = {};
            let sortedData = preFlightData;
            sortedData.forEach((entry) => (dataAsObj[entry["hex"]] = entry));
            sortedData = preFlightData.map(
              (entry) => dataAsObj[entry["hex"]] || entry
            );
  
            // console.log(sortedData)
            setAdsbData(sortedData);
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

  // const adsbLayer =
  // adsbData &&
  // new ScenegraphLayer({
  //   loadOptions: GLBLoader,
  //   id: "plane-layer",
  //   data: adsbData,
  //   pickable: true,
  //   sizeScale: 30,
  //   scenegraph: MODEL_URL,
  //   _animations: ANIMATIONS,
  //   sizeMinPixels: 0.1,
  //   sizeMaxPixels: 10,
  //   // need to add these coordinates in
  //   getPosition: (d) => d.coordinates,
  //   getOrientation: (d) => [0, -d.track || 0, 90],
  //   onClick: (info, event) => showPlaneData(info, event),
  //   onHover: ({ object, x, y }) => {
  //     setActivePlane({ object, x, y });
  //   },

  //   getColor: (d) => (d.category == "A1" ? "red" : "white"),
  //   updateTriggers: {
  //     getFillColor: ["red", "white"],
  //   },
  // });

    return (
        <div>
            {loggedIn && 
                <>
                    <b>User Credentials: </b>
                    <p>{userDisplayName}</p>
                    <p>{userEmail}</p>
                    <Button style={{color: 'white', background: 'gray'}}
                    onClick={()=> {logout()}}
                    >Log-out</Button>
                    <Button style={{color: 'white', background: 'gray'}}
                    onClick={()=> {getData3()}}
                    >Get Data</Button>
                    <div style={{ height: "100vh" }}>
                    <ReactMapGL
                      {...viewport}
                      width="100vw"
                      height="100vh"
                      ref={mapRef}
                      mapStyle="mapbox://styles/mapbox/dark-v9"
                      mapboxAccessToken={MAPBOX_TOKEN}
                      onViewportChange={(viewport) => setViewport(viewport)}
                      >
                    {console.log(adsbData)}
                    {adsbData != null && adsbData.map((data, i) => (
                      <Marker  key={`marker-${i}`} longitude={data.coordinates[0]} latitude={data.coordinates[1]} anchor="bottom" >
                        {console.log("adsbData length: " + adsbData.length)}
                        <img src="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" />
                      </Marker>
                      
                    ))}
                    <div className="fullscreen" style={fullscreenControlStyle}>
                      <FullscreenControl />
                    </div>
                    <div className="nav" style={navStyle}>
                      <NavigationControl />
                    </div>
                    </ReactMapGL>        
                    </div>
                </> 
            }
        </div>
    );
};


  export default Homepage;