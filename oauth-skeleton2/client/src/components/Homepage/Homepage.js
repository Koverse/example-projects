import React, { useEffect, useState, useContext, useRef, useCallback} from "react";
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import Page from "../PageTemplate/index";
import { InteractiveMap, Marker } from "react-map-gl";
import DeckGL from "@deck.gl/react";
import Geocoder from "react-map-gl-geocoder";
import "react-map-gl-geocoder/dist/mapbox-gl-geocoder.css";
import {TextLayer, ScatterplotLayer} from "@deck.gl/layers"

const Homepage = () => {
    const navigate = useNavigate();
    // stores user information eg email, name, etc
    const [userData, setUserData] = useState({});

    // Bus/RTD data
    const [busData, setBusData] = useState([]);
    const [busTimer, setbusTimer] = useState({});
    const [activeBus, setActiveBus] = useState({});

    // ADSB Data

    // Twitter Data

    // Port Data

    const REFRESH_TIME = 10000;

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
        // logout and return to login page
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
            // start timer
            busTimer.nextTimeoutId = setTimeout(
            () => setbusTimer({ id: busTimer.nextTimeoutId }),
            1000
            );
        }
        else if (localStorage.getItem("user") !== null)
        {
            axios.get('/v1/data/getData')
            .then(res => {
                console.log(res.data.records)
                // store returned RTD data in specific format
                let preBusData = res.data.records.map((record, index) => {
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
                sortedData = preBusData.map((entry) => dataAsObj[entry["index"]] || entry);
                setBusData(sortedData);
            })
            .finally(() => {
                busTimer.nextTimeoutId = setTimeout(
                () => setbusTimer({ id: busTimer.nextTimeoutId }),
                REFRESH_TIME
                );
            });
        }
        return () => {
            clearTimeout(busTimer.nextTimeoutId);
            busTimer.id = null;
        };
    }, [busTimer]);

    function showBusData(info, event) {
        //showPanel("Bus Details", "Screenname = " + info.object.screenName);
        console.log(info);
    }
    
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

      const busTextlayer = new TextLayer({
        id: "text-layer",
        data: busData,
        pickable: true,
        getPosition: (d) => d.coordinates,
        getText: (d) => d.route,
        getColor: (d) => [255, 255, 255, 255],
        getSize: 17,
        getAngle: 0,
        getTextAnchor: "middle",
        getAlignmentBaseline: "center",
        onHover: ({ object, x, y }) => {
          setActiveBus({ object, x, y });
        },
      });

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
    onClick: (info, event) => showBusData(info, event),
    getLineColor: (d) => [255, 255, 0],
    onHover: ({ object, x, y }) => {
      setActiveBus({ object, x, y });
    },
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
                            busLayer2, busTextlayer
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
                        {_renderBusToolTip()}
                    </DeckGL>
                    </Page>
                </> 
            }
        </div>
    );
};


  export default Homepage;