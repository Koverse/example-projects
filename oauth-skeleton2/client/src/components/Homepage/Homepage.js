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

const Homepage = () => {
  /*********************************************************
   *                   VARIABLES                            *
   *********************************************************/
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
    const koverseURL = `https://api.dev.koverse.com`;

    const [lastFetchTime, setLastFetchTime] = useState(
        moment().subtract("5", "minutes").format("YYYY-MM-DD HH:mm:ss")
      );
    
    const {loggedIn} = useContext(AuthContext);
    
    if (loggedIn){
        console.log("Logged in");
        console.log(JSON.parse(localStorage.getItem("user")).accessToken);
    }

    const [busTimer, setBusTimer] = useState({});
    
    const [busData, setBusData] = useState(null);

    const REFRESH_TIME = 25000;

  /*********************************************************
   *                 FUNCTIONS                              *
   *********************************************************/
    function showBusData(info, event) {
        // showPanel("Bus Details", "Screenname = " + info.object.screenName);
        // console.log("buuuuuuuuuuuuuuuuus");
        // console.log(info);
      }

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
              Bearing: {object.bearing} <br />
              Speed: {object.speed}
            </div>
          )
        );
      };
    
  /*********************************************************
   *                   DATA LOADING                         *
   *********************************************************/

      
      useEffect(() => {    
        const query = {
            datasetId: "a53235f3-90d2-4dbd-8889-61d4d8fc9e4b",
            expression: "SELECT * FROM \"a53235f3-90d2-4dbd-8889-61d4d8fc9e4b\"",
            limit: 0,
            offset: 0
        };
        

        const dataLoadingUserState = () => (loggedIn) ? JSON.parse(localStorage.getItem("user")).accessToken : "";


        postData(koverseURL + "/query", query, dataLoadingUserState)
          //postData(koverseURL, query)
          .then((data) => {
            console.log("Bus Data" + data);
            if (data.length > 0 && busTimer.id !== null) {
              console.log("Bus data > 0");
              let busData = data[0].records.map((record, index) => {
                //console.log(busData);
                return {
                  coordinates: [
                    Number(record.value.longitude),
                    Number(record.value.latitude),
                  ],
                  route: record.value.route_id,
                  bearing: record.value.bearing,
                  type: "Bus",
                  details: record.value.route_id,
                  routeOrder: record.value.route_order,
                  timeStamp: record.value.timestamp,
                  isHostile: false,
                };
              });
    
              const dataAsObj = {};
              let sortedData = busData;
              sortedData.forEach((entry) => (dataAsObj[entry["timeStamp"]] = entry));
    
              sortedData = busData.map(
                (entry) => dataAsObj[entry["timeStamp"]] || entry
              );
    
              sortedData = sortedData.filter(
                (v, i, a) =>
                  a.findIndex((t) => JSON.stringify(t) === JSON.stringify(v)) === i
              );
    
              setBusData(sortedData);
              setLastFetchTime(moment().format("YYYY-MM-DD HH:mm:ss"));
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
     radiusScale: 8,
     radiusMinPixels: 1,
     radiusMaxPixels: 100,
     lineWidthMinPixels: 1,
     getPosition: (d) => d.coordinates,
     getRadius: (d) => 55,
     getFillColor: (d) => (d.route % 2 ? [255, 0, 0, 144] : [0, 0, 255, 144]), // true - red (odd) : false = default
     // getFillColor: (d) =>
     //   d.isHostile ? [0, 255, 0, 144] : [255, 255, 212, 144],
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

    const getData = () => {
        console.log("calling /query endpoint");
        const accessToken = JSON.parse(localStorage.getItem("user")).accessToken

        console.log(accessToken)
        axios.post('https://api.dev.koverse.com/query',
        {
                "datasetId": "e7be3620-9d16-4e42-91a9-50de15b3d692",
                "expression": "SELECT * FROM \"e7be3620-9d16-4e42-91a9-50de15b3d692\"",
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
            console.log("Data received");
            console.log(response);
        })
        .catch(err => {
            console.log("DATA NOT RECEIVED")
        })

    }

    const getIndices = () => {
        console.log("calling /indexes endpoint");
        const accessToken = JSON.parse(localStorage.getItem("user")).accessToken

        console.log(accessToken)
        axios.get('https://api.dev.koverse.com/indexes',
        {
                "datasetId": "e7be3620-9d16-4e42-91a9-50de15b3d692",
                // "fields": true,
                // "limit": 0,
        }, 
        {
            headers: {
              "Authorization": "Bearer " + accessToken
            }
        }
        )
        .then(response => {
            // store response token in local storage
            console.log("Data received");
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

                    <Button style={{color: 'white', background: 'gray'}}
                    onClick={()=> {getIndices()}}
                    >Get indices</Button>
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