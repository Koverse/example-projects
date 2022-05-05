import React, { useEffect, useState, useContext, useRef, useCallback} from "react";
import axios from 'axios';
import { Button} from '@material-ui/core';
import { useNavigate } from "react-router-dom";
import AuthContext from "../Auth/AuthContext";

import moment from "moment";

import { StaticMap, InteractiveMap } from "react-map-gl";
import { FlyToInterpolator } from "deck.gl";
import DeckGL from "@deck.gl/react";
import Geocoder from "react-map-gl-geocoder";
import { postData } from "../../helpers/rest";

import {
    IconLayer,
    TextLayer,
    GeoJsonLayer,
    ScatterplotLayer,
  } from "@deck.gl/layers";

    /*********************************************************
   *        HELPER FUNCTIONS/METHODS                         *
   *********************************************************/

//     function range(size, startAt = 0) {
//     return [...Array(size).keys()].map(i => i + startAt);
// }
    
//     function alphabetMap(startChar, endChar) {
//       var alphabetMap = Object.fromEntries((String.fromCharCode(...range((endChar.charCodeAt(0) + 1) -
//       startChar.charCodeAt(0), startChar.charCodeAt(0)))).split("").map((k, i) => [k, String(i)]));

//       return alphabetMap;
//     }

//     String.prototype.mapReplace = function(map) {
//       var regex = [];
//       for(var key in map)
//           regex.push(key.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"));
//       return this.replace(new RegExp(regex.join('|'),"g"),function(word){
//           return map[word];
//       });
//   };


  function showBusData(info, event) {
    // showPanel("Bus Details", "Screenname = " + info.object.screenName);
    // console.log("buuuuuuuuuuuuuuuuus");
    // console.log(info);
  }

/*********************************************************
 *                   VARIABLES                            *
 *********************************************************/
const Homepage = () => {

    const [viewState, setViewState] = useState({
        longitude: -104.991531,
        latitude: 39.742043,
        zoom: 9,
        pitch: 0,
        bearing: 0,
      });
    
      const mapRef = useRef();
      const geocoderContainerRef = useRef();
    
      const handleViewportChange = useCallback(
        (newViewport) => setViewState(newViewport),
        []
      );

    const [activeBus, setActiveBus] = useState({});
    const koverseURL = `https://api.staging.koverse.com`;

    const [lastFetchTime, setLastFetchTime] = useState(
        moment().subtract("5", "minutes").format("YYYY-MM-DD HH:mm:ss")
      );
    
    const {loggedIn} = useContext(AuthContext);
    
    // if (loggedIn){
    //     console.log("Logged in");
    //     console.log(JSON.parse(localStorage.getItem("user")).accessToken);
    // }

    const [busTimer, setBusTimer] = useState({});

    const [logTimer, setLogTimer] = useState({});
    
    const [busData, setBusData] = useState(null);

    const REFRESH_TIME = 30000;

    const DATE = new Date();

    const [routeColors, updateRouteColors] = useState({});

    const [routeColorTimer, setColorTimer] = useState({});

    const [uniqueRoutes, updateUniqueRoutes] = useState(new Set());

    const addUniqueRoute =routeToAdd => {
      updateUniqueRoutes(previousRoute => new Set([...previousRoute, routeToAdd]));
    }
    // let uniqueRoutes = new Set();

  /*********************************************************
   *                   TOOLTIP                              *
   *********************************************************/
    const _renderBusToolTip = () => {
        const { object, x, y } = activeBus || {};
        return (
          object && (
            <div
              style={{
                pointerEvents: "none",
                position: "absolute",
                zIndex: 9999,
                fontSize: "12px",
                padding: "8px",
                background: "wheat",
                color: "#000",
                minWidth: "160px",
                maxHeight: "240px",
                overflowY: "hidden",
                left: x,
                top: y,
              }}
            >
              <h1>{object.route}</h1>
              {/* Time: {(new Date(object.timeStamp * 1000)).toUTCString() } <br /> */}
              Latitude: {object.coordinates[0]} <br />
              Longitude: {object.coordinates[1]} <br />
              RouteOrder: {object.routeOrder} <br />
            </div>
          )
        );
      };
    
  /*********************************************************
   *                   DATA LOADING                         *
   *********************************************************/

      
      useEffect(() => {    

      const _query =  `SELECT a.latitude, a.longitude, a.route_id, a.timestamp, a.id, a.route_order, a.update_count
        FROM rtdTransformed a
        INNER JOIN (
            SELECT id, MAX(update_count) update_count
            FROM rtdTransformed
            GROUP BY id
        ) b ON a.id = b.id AND a.update_count = b.update_count
        ORDER BY a.timestamp DESC`;
        // LIMIT 10000`
      
      // const _query = `SELECT a.latitude, a.longitude, a.route_id, a.timestamp, a.id, a.route_order, a.update_count
      //   FROM rtdTransformed WHERE update_count == 10`;

      axios.get("http://localhost:5000/get_all_SQLITE", {params: {query: _query}})
      .then((data) => {
        console.log("Bus Data" + data);
        console.log(data.data.length);
        // console.log(data.data);
        if (data.data.length > 0 && busTimer.id !== null) {
          console.log("Bus data > 0");
          let busData = data.data.map((record, index) => {
            // console.log(record);

            // if (!(record.route_id in routeColors)){
            //       let newRouteColor = {[record.route_id]: {r: Math.random() * 255, g: Math.random() * 255, b: Math.random() * 255}};
            //       let mergedRouteColors = {...routeColors, newRouteColor};
            //     updateRouteColors(mergedRouteColors);
            //     }

            // if  (!(uniqueRoutes.has(record.route_id))){
            //   addUniqueRoute(record.route_id);
            // }

            return {
              coordinates: [
                Number(record.longitude),
                Number(record.latitude),
              ],
              route: record.route_id,
              // bearing: record.bearing,
              type: "Bus",
              routeOrder: record.route_order,
              timeStamp: record.timestamp,
              isHostile: false,
              vehicle_id: record.id
            };
          });

          setBusData(busData);
          setLastFetchTime(moment().format("YYYY-MM-DD HH:mm:ss"));

          if (busData){
            console.log("busData Length: ", busData.length);
            let colorsToAdd = {};
          busData.forEach(record =>{
            // console.log(record);
            if (!(record.route in routeColors)){
              let newRouteColor = {r: Math.random() * 255, g: Math.random() * 255, b: Math.random() * 255};
              colorsToAdd[record.route] = newRouteColor;
            }
          })
          // console.log(colorsToAdd);
          updateRouteColors(previousRouteColors => ({...previousRouteColors, ...colorsToAdd}));
        }

        }
        // setLayers([generateArcData(journeyData), scatterLayer])
      })
      .finally(() => {
        busTimer.nextTimeoutId = setTimeout(
          () => setBusTimer({ id: busTimer.nextTimeoutId }),
          REFRESH_TIME
        );
      });

    return () => {
      clearTimeout(busTimer.nextTimeoutId);
      busTimer.id = null;
    };
  }, [busTimer]);

    //  useEffect(() => {
  //   console.log("routeColors: ", routeColors);

  //   if (logTimer.id !== null){
  //     logTimer.nextTimeoutId = setTimeout(
  //       () => setLogTimer({ id: logTimer.nextTimeoutId }),
  //       REFRESH_TIME
  //     );
  //   }
  //   return () => {
  //     clearTimeout(logTimer.nextTimeoutId);
  //     logTimer.id = null;
  //   };
  // }, [logTimer]);
  
  /*********************************************************
   *                   LAYERS                               *
   *********************************************************/


   const busLayer2 =
   busData &&
   new ScatterplotLayer({
     id: "scatterplot-layer-bus",
     data: busData,
     pickable: true,
     opacity: 1,
     stroked: false,
     filled: true,
     radiusScale: 2,
     radiusMinPixels: 1,
     radiusMaxPixels: 5,
     lineWidthMinPixels: 1,
     getPosition: (d) => d.coordinates,
     getRadius: (d) => 20,
     getFillColor: (d) => {if (d.route in routeColors){return [routeColors[d.route]["r"], routeColors[d.route]["g"], routeColors[d.route]["b"], 255 - ((((DATE.getTime()/1000) - d.timeStamp)/((DATE.getTime()/1000) - 1651009757)) * 255)];} return [0,0,0,100];},
     onClick: (info, event) => showBusData(info, event),
     getLineColor: (d) => [255, 255, 0],
     onHover: ({ object, x, y }) => {
       setActiveBus({ object, x, y });
     }
   });

  /*********************************************************
   *                 EXISTING                               *
   *********************************************************/

    const [userDisplayName, setUserDisplayName] = useState('');
    const [userEmail, setUserEmail] = useState('');

    const navigate = useNavigate();
    // const {loggedIn} = useContext(AuthContext);

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
                    {/* <Button style={{color: 'white', background: 'gray'}}
                    onClick={()=> {getData()}}
                    >Get Data</Button>

                    <Button style={{color: 'white', background: 'gray'}}
                    onClick={()=> {getIndices()}}
                    >Get indices</Button> */}
                    {/* <Button style={{color: 'white', background: 'gray'}}
                    onClick={()=> {writeData()}}
                    >Write Data</Button> */}


            <div>
            <DeckGL
          initialViewState={viewState}

          controller
          // onViewStateChange={_onViewStateChange}
          layers={[
              busLayer2
          ]}
        >
          <InteractiveMap
            {...viewState}
            //onViewportChange={handleViewportChange}
            ref={mapRef}
            reuseMaps
            mapStyle="mapbox://styles/mapbox/dark-v9"
            preventStyleDiffing
            mapboxApiAccessToken="pk.eyJ1IjoiZ2FycmV0dGNyaXNzIiwiYSI6ImNrYWltOWk5cTAyaXMydHMwdm5rMWd1bXQifQ.xY8kGI7PtunrCBszB_2nCw"
          >
            <Geocoder
              mapRef={mapRef}
              containerRef={geocoderContainerRef}
              onViewportChange={handleViewportChange}
              mapboxApiAccessToken={
                "pk.eyJ1IjoiZ2FycmV0dGNyaXNzIiwiYSI6ImNrYWltOWk5cTAyaXMydHMwdm5rMWd1bXQifQ.xY8kGI7PtunrCBszB_2nCw"
              }
              position="top-left"
            />
          </InteractiveMap>
          {_renderBusToolTip()}
        </DeckGL>
                    </div>
                </>
            }
        </div>
        
    );

};


  export default Homepage;