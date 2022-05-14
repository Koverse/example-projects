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
    PolygonLayer
  } from "@deck.gl/layers";

import {AmbientLight, PointLight, LightingEffect} from '@deck.gl/core';

import {TripsLayer} from "@deck.gl/geo-layers";
// import { response } from "express";

// import buildingData from "../../export.geojson";

import buildingData from "../../geojson.js";

// import throttle from 'lodash.throttle';
// import GL from '@luma.gl/constants';

    /*********************************************************
   *        HELPER FUNCTIONS/METHODS                         *
   *********************************************************/

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

    const [tripsData, updateTrips] = useState([]);
    
    const ambientLight = new AmbientLight({
      color: [255, 255, 255],
      intensity: 1.0
    });
    
    const pointLight = new PointLight({
      color: [255, 255, 255],
      intensity: 2.0,
      position: [-74.05, 40.7, 8000]
    });
    
    const lightingEffect = new LightingEffect({ambientLight, pointLight});
    
    const material = {
      ambient: 0.1,
      diffuse: 0.6,
      shininess: 32,
      specularColor: [60, 64, 70]
    };
    
    const DEFAULT_THEME = {
      buildingColor: [74, 80, 87],
      trailColor0: [253, 128, 93],
      trailColor1: [23, 184, 190],
      material,
      effects: [lightingEffect]
    };

    const [time, setTime] = useState(0);
    const [animation] = useState({});
    
    const animationSpeed = 1;
    const loopLength = 2000; //TODO modulate
    const trailLength = 2000; //TODO modulate

    const animate = () => {
      setTime(t => (t + animationSpeed) % loopLength);
      animation.id = window.requestAnimationFrame(animate);
    };

    // const [latestBusPoints, updateLatestBusPoints] = useState({});

    // const [earliestTimeStamp, updateEarliestTimeStamp] = useState(Infinity);

    const [pointAnimationTimer, updatePointAnimationTimer] = useState({});

    const [latestPointAnimation, updateLatestPointAnimation] = useState(false);

    const pointAnimationDuration = 2000;

  /*********************************************************
   *                   TOOLTIP                              *
   *********************************************************/
    const _renderBusToolTip = () => {
        const { object, x, y } = activeBus || {};
        if (object){
        if (Object.keys(object).includes("coordinates")){
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
              <h1>{object.vehicle_id}</h1>
              Route: {object.route} <br />
              Time: {(new Date(object.timeStamp * 1000)).toUTCString() } <br />
              Latitude: {object.coordinates[0]} <br />
              Longitude: {object.coordinates[1]} <br />
              RouteOrder: {object.routeOrder} <br />
            </div>
          )
        );
        }

      else {
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
              <h1>{object.vehicle_id}</h1>
              Route: {object.route} <br />
              Time: {(new Date(object.timeStamp * 1000)).toUTCString() } <br />
              Latitude: {object.path[0]} <br />
              Longitude: {object.path[1]} <br />
              RouteOrder: {object.routeOrder} <br />
            </div>
          )
        );
        }
      }
    };
    
  /*********************************************************
   *                   DATA LOADING                         *
   *********************************************************/
   useEffect(() => {
    animation.id = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animation.id);
  }, [animation]);

      
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
          let busData = new Array();
          data.data.forEach(record =>{
            if ((Number(record.longitude) != 0) && (Number(record.latitude) != 0)){
               busData.push({
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
              });
            }
          });

          // let busData = data.data.map((record, index) => {
          //   return {
          //     coordinates: [
          //       Number(record.longitude),
          //       Number(record.latitude),
          //     ],
          //     route: record.route_id,
          //     // bearing: record.bearing,
          //     type: "Bus",
          //     routeOrder: record.route_order,
          //     timeStamp: record.timestamp,
          //     isHostile: false,
          //     vehicle_id: record.id
          //   };
          // });

          setBusData(busData);
          setLastFetchTime(moment().format("YYYY-MM-DD HH:mm:ss"));

          if (busData){
            console.log("busData Length: ", busData.length);
            let colorsToAdd = {};
            let trips = {};
          busData.forEach(record =>{
            if (!(record.vehicle_id in routeColors)){
              let newRouteColor = {r: Math.random() * 255, g: Math.random() * 255, b: Math.random() * 255};
              colorsToAdd[record.vehicle_id] = newRouteColor;
            }
            if (!(record.vehicle_id in trips)){
              trips[record.vehicle_id] = {"coordinates": [record["coordinates"]], "timeStamps": [record["timeStamp"]], "route": [record["route"]]}
            }
            else {
              trips[record.vehicle_id]["coordinates"].push(record["coordinates"])
              trips[record.vehicle_id]["timeStamps"].push(record["timeStamp"])
            }
          })
          updateRouteColors(previousRouteColors => ({...previousRouteColors, ...colorsToAdd}));
          
          if (trips){
            // console.log(trips);
          let formattedTrips = [];
          let latestPoints = [];

          Object.keys(trips).forEach(vehicle_id =>{
            let timeStampLen = trips[vehicle_id]["timeStamps"].length;
            let timeStampSortedOrder = new Array(timeStampLen);
            for (let idx = 0; idx < timeStampSortedOrder.length; idx++){
              timeStampSortedOrder[idx] = idx;
            }

            timeStampSortedOrder.sort(function (a, b) { return trips[vehicle_id]["timeStamps"][a] < trips[vehicle_id]["timeStamps"][b] ? -1 : trips[vehicle_id]["timeStamps"][a] > trips[vehicle_id]["timeStamps"][b] ? 1 : 0; });
            
            let sortedCoordinates = new Array(trips[vehicle_id]["coordinates"].length);

            trips[vehicle_id]["timeStamps"].sort((a, b) => a - b); //TODO redo method in memory-safe format
            
            // console.log(trips[vehicle_id]["coordinates"]);
            
            for (let idx = 0; idx < timeStampSortedOrder.length; idx ++){
              sortedCoordinates[idx] = trips[vehicle_id]["coordinates"][timeStampSortedOrder[idx]];
            }
            
            formattedTrips.push({"vehicle_id": vehicle_id, "path": sortedCoordinates, "timeStamps": trips[vehicle_id]["timeStamps"].map(_time => _time)});

            latestPoints.push({
              coordinates: sortedCoordinates[sortedCoordinates.length - 1],
              route: trips["route"],
              // bearing: record.bearing,
              type: "Bus",
              vehicle_id: vehicle_id
            });

          })

          // updateLatestBusPoints(latestPoints);
          updateTrips(formattedTrips);
          
        }}



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

  /*********************************************************
   *       Flipping Animation Variable                      *
   *********************************************************/

  useEffect(() => {
    // console.log("pointAnimationSwitch: ", latestPointAnimation);
    updateLatestPointAnimation(!(latestPointAnimation));

    if (pointAnimationTimer.id !== null){
      pointAnimationTimer.nextTimeoutId = setTimeout(
        () => updatePointAnimationTimer({ id: pointAnimationTimer.nextTimeoutId }),
        pointAnimationDuration
      );
    }
    return () => {
      clearTimeout(pointAnimationTimer.nextTimeoutId);
      pointAnimationTimer.id = null;
    };
  }, [pointAnimationTimer]);


  /*********************************************************
   *                   Console Logging                      *
   *********************************************************/

     useEffect(() => {
    console.log("tripsData: ", tripsData);
    // console.log("pointAnimationSwitch: ", latestPointAnimation);

    if (logTimer.id !== null){
      logTimer.nextTimeoutId = setTimeout(
        () => setLogTimer({ id: logTimer.nextTimeoutId }),
        REFRESH_TIME
      );
    }
    return () => {
      clearTimeout(logTimer.nextTimeoutId);
      logTimer.id = null;
    };
  }, [logTimer]);
  
  /*********************************************************
   *                   LAYERS                               *
   *********************************************************/

   const tripRenderLayer = 
   tripsData && routeColors &&
   new TripsLayer({
    id: 'trips',
    data: tripsData,
    getPath: (d) => d.path,
    getTimestamps: (d) => d.timeStamps,
    getColor: (d) => [routeColors[d.vehicle_id]["r"], routeColors[d.vehicle_id]["g"], routeColors[d.vehicle_id]["b"]],
    opacity: 0.3,
    widthMinPixels: 2,
    rounded: true,
    trailLength,
    currentTime: time,
    shadowEnabled: false
  });


  // const buildingRenderLayer = 
  // new PolygonLayer({
  //   id: 'buildings',
  //   data: buildingData.features,
  //   extruded: true,
  //   wireframe: false,
  //   opacity: 0.5,
  //   getPolygon: (f) => f.geometry.coordinates,
  //   getElevation: (f) => 15,
  //   getFillColor: DEFAULT_THEME.buildingColor,
  //   material: DEFAULT_THEME.material
  // });

  const buildingGeojsonRenderLayer = 
  new GeoJsonLayer({
    id: 'geojsonBuildings',
    data: buildingData,
    stroked: true,
    filled: true,
    extruded: true,
    pointType: 'circle',
    lineWidthScale: 20,
    lineWidthMinPixels: 2,
    getFillColor: [160, 160, 180, 200],
    getLineColor: d => [210, 100, 100],
    getPointRadius: 100,
    getLineWidth: 1,
    getElevation: 50
  });


   const busLayer2 =
   busData && tripsData &&
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
     getFillColor: (d) => {if (d.vehicle_id in routeColors){return [routeColors[d.vehicle_id]["r"], routeColors[d.vehicle_id]["g"], routeColors[d.vehicle_id]["b"], 255 - ((((DATE.getTime()/1000) - d.timeStamp)/((DATE.getTime()/1000) - tripsData.find(o => o.vehicle_id === d.vehicle_id)["timeStamps"][0])) * 255)];} return [0,0,0,100];},
     onClick: (info, event) => showBusData(info, event),
     getLineColor: (d) => [255, 255, 0],
     onHover: ({ object, x, y }) => {
       setActiveBus({ object, x, y });
     }
   });

   const latestBusPointsRenderLayer = 
   busData && tripsData && 
    new ScatterplotLayer({
      id: "scatterplot-latest-bus",
      data: tripsData,
      pickable: true,
     opacity: 1,
     stroked: false,
     filled: true,
     radiusScale: 2,
     radiusMinPixels: 1,
     radiusMaxPixels: 8,
     lineWidthMinPixels: 1,
     getPosition: (d) => d["path"][d["path"].length - 1],
     getRadius: (d) => 30,
     getFillColor: (d) => {if (latestPointAnimation){ if (d.vehicle_id in routeColors){
      return [routeColors[d.vehicle_id]["r"], routeColors[d.vehicle_id]["g"], routeColors[d.vehicle_id]["b"], 50];} 
      return [0,0,0,100];
       }
     { if (d.vehicle_id in routeColors){
       return [Math.min(255, routeColors[d.vehicle_id]["r"] + 50), Math.min(255, routeColors[d.vehicle_id]["g"] + 50), Math.min(255, routeColors[d.vehicle_id]["b"] + 50), 255];} 
       return [0,0,0,100];
       }
     },
     transitions: {
      getFillColor: {
        duration: pointAnimationDuration,
      }
    },
    updateTriggers: {
      getFillColor: [
        latestPointAnimation
      ]
    },
    //  onClick: (info, event) => showBusData(info, event),
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
              busLayer2,
              buildingGeojsonRenderLayer,
              tripRenderLayer,
              latestBusPointsRenderLayer
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
              effects={DEFAULT_THEME.effects}
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


// {
//   "id/vehicle_id": 0,
//   "coordinates": [
//     [-74.20986, 40.81773],
//     [-74.20987, 40.81765],
//     [-74.20998, 40.81746],
//     [-74.21062, 40.81682],
//     [-74.21002, 40.81644],
//     [-74.21084, 40.81536],
//     [-74.21142, 40.8146],
//     [-74.20965, 40.81354],
//     [-74.21166, 40.81158],
//     [-74.21247, 40.81073],
//     [-74.21294, 40.81019],
//     [-74.21302, 40.81009],
//     [-74.21055, 40.80768],
//     [-74.20995, 40.80714],
//     [-74.20674, 40.80398],
//     [-74.20659, 40.80382],
//     [-74.20634, 40.80352],
//     [-74.20466, 40.80157]],
//   "timeStamp": [ 1191, 1193.803, 1205.321, 1249.883, 1277.923, 1333.85, 1373.257, 1451.769, 1527.939, 1560.114, 1579.966, 1583.555, 1660.904, 1678.797, 1779.882, 1784.858, 1793.853, 1868.948]
// }
// sort each object's coordinates by timeStamp

  export default Homepage;