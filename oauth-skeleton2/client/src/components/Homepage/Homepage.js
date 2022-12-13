import React, { useEffect, useState, useContext, useRef, useCallback} from "react";
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import Page from "../PageTemplate/index";

import moment from "moment";
import { InteractiveMap, Marker } from "react-map-gl";
import DeckGL from "@deck.gl/react";

import Geocoder from "react-map-gl-geocoder";
import "react-map-gl-geocoder/dist/mapbox-gl-geocoder.css";

import {ScatterplotLayer} from "@deck.gl/layers"

const Homepage = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState({});

    const [busData, setBusData] = useState([]);
    const [dataTimer, setDataTimer] = useState({});
    const [lastFetchTime, setLastFetchTime] = useState(
        moment().subtract("5", "minutes").format("YYYY-MM-DD HH:mm:ss")
      );
    const REFRESH_TIME = 10000;
    const [activeBus, setActiveBus] = useState({});


    const [viewport, setViewport] = useState({
      longitude: -104.991531, 
      latitude: 39.742043, 
      width: "100%",
      height: "100%",
      zoom: 10,
      bearing: 0,
      pitch: 0
  })
    const mapRef = useRef();
    const geocoderContainerRef = useRef();

    const handleViewportChange = useCallback(
      (newViewport) => setViewport(newViewport),
      []
    );

    const logout = () => {
        localStorage.removeItem('user');
        const loggedInState = axios.get("/logout");
        console.log("loggedInState: " + loggedInState)
        navigate("/");
        window.location.reload();
      }

    useEffect(() => {
        // stores jwt and gets credentials
        axios.get("/getCredentials")
        .then((res) => {
            console.log("received credentials: ");
            localStorage.setItem("user", JSON.stringify(res.data));
            // store username and email in local storage 
            setUserData(res.data)
        })
        .catch((err) => {
            console.log(err);
            localStorage.removeItem("user");
            logout();
        });               
    }, [])

    useEffect(() => {
        setBusData([]);
        
        if (localStorage.getItem("user") === null)
        {
            // start timer and do not call postData
            dataTimer.nextTimeoutId = setTimeout(
            () => setDataTimer({ id: dataTimer.nextTimeoutId }),
            1000
            );
        }
        else if (localStorage.getItem("user") !== null)
        {
        axios.get('/v1/data/getData')
        .then(res => 
            {
            console.log(res.data.records)
            // store returned data in specific format
            let preBusData = res.data.records.map((record, index) => {

                /////////// FOR RTD/BUS DATA ///////////
                return {
                    coordinates: [
                    Number(record.longitude),
                    Number(record.latitude),
                    ],
                    route: record.id,
                    bearing: record.bearing,
                    type: "Bus",
                    isHostile: false,
                    index: index, 
                    timestamp: record.timestamp
                };
            });

            preBusData = preBusData.filter(function (element) {
                return element !== undefined;
            });

            const dataAsObj = {};
                let sortedData = preBusData;

                //////// FOR RTD DATA ////////////
                sortedData.forEach((entry) => (dataAsObj[entry["index"]] = entry));
                sortedData = preBusData.map(
                (entry) => dataAsObj[entry["index"]] || entry
                );
    
            setBusData(sortedData);

            setLastFetchTime(moment().format("YYYY-MM-DD HH:mm:ss"));

    
            })
        .finally(() => {
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

  function showBusData(info, event) {
    // showPanel("Bus Details", "Screenname = " + info.object.screenName);
    // console.log(info);
  }

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
    getFillColor: (d) => ([255,140,0])
    
    //getFillColor: (d) => (d.route % 2 ? [255, 0, 0, 144] : [0, 0, 255, 144]), // true - red (odd) : false = default
    
    // getFillColor: (d) =>
    //   d.isHostile ? [0, 255, 0, 144] : [255, 255, 212, 144],

    // onClick: (info, event) => showBusData(info, event),
    // getLineColor: (d) => [255, 255, 0],
    // onHover: ({ object, x, y }) => {
    //   setActiveBus({ object, x, y });
    // },

    // transitions: {
    //   getRadius: {
    //     type: "spring",
    //     stiffness: 0.01,
    //     damping: 0.15,
    //     enter: (value) => [0], // grow from size 0
    //   },
    // },
  });

    return (
        <div>
            {userData && 
                <>
                    <Page user={userData}>
                    <div
                    ref={geocoderContainerRef}
                    style={{ position: "absolute", top: 15, left: 275, zIndex: 9999 }}
                    />
                    <DeckGL
                        initialViewState={viewport}
                        controller
                        layers={[
                            busLayer2
                        ]}          
                    >
                        <InteractiveMap
                            {...viewport}
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
                    </DeckGL>
                    </Page>
                </> 
            }
        </div>
    );
};


  export default Homepage;