import React, { useEffect, useState, useContext, useRef, useCallback} from "react";
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import Page from "../PageTemplate/index";
import { InteractiveMap, Marker } from "react-map-gl";
import DeckGL from "@deck.gl/react";
import Geocoder from "react-map-gl-geocoder";
import "react-map-gl-geocoder/dist/mapbox-gl-geocoder.css";
import {TextLayer, ScatterplotLayer, GeoJsonLayer} from "@deck.gl/layers"
// Alert system
import { io } from "socket.io-client";

import circle from "@turf/circle";
import Box from "@material-ui/core/Box";
import chroma from "chroma-js";

import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";


const Homepage = () => {
    const navigate = useNavigate();
    // stores user information eg email, name, etc
    const [userData, setUserData] = useState({});

    const REFRESH_TIME = 10000;
    
    // Bus/RTD data
    const [busData, setBusData] = useState([]);
    const [busTimer, setbusTimer] = useState({});
    const [activeBus, setActiveBus] = useState({});

    // ADSB Data

    // Twitter Data

    // Port Data

    // alert system
    const [watchRadiusData, setWatchRadiusData] = useState(null);
    const [geoJsonCircle, setGeoJsonCircle] = useState(null);

    // array of objects that have triggered alert
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [alertData, setAlertData] = useState([
      {
        socketID: "Inactive Alert",
        alertRoomName: "Alert Room None",
        // should this be a string or int?
        lat: 0,
        lon: 0,
        radius: 0,
        // alertCenter: [0,0],
        // alertRadius: 0,
      },
    ]);
    // websocket updates
    const [socket, setSocket] = useState(null);
    const [selectedAlert, setSelectedAlert] = useState("none");
    const [alertCount, setAlertCount] = useState(0);

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

    // create websocket connection
    useEffect(() => {
      // const newSocket = io("wss://copdemo.koverse.com");
      const newSocket = io("ws://localhost:3002");
      setSocket(newSocket);
      console.log(socket);
      // each socket automatically joins room identified by its own id
      newSocket.on("connect", () => {
        console.log("Client connected!");
      });
      newSocket.on("error", (error) => {
        console.log(error);
      });
      newSocket.on("alert_triggered", (data) => {
        console.log("Alert Triggered: " + data.sender);
        // if alert's senderID != user's newSocket id, show panel
        if (data.sender != newSocket.id) {
          console.log("data.sender != newSocket.id");
          showPanel(data.alertMessage, "");
        }
        // receiver is the same as sender no need to alert the receiver as the sender client already has function
        // in place that will showPanel()
      });

      newSocket.on("hide_alert", (data) => {
        console.log(
          "Hide alert Panel for all subscribed to Alert: " + data.sender
        );
        // if alert's senderID != user's newSocket id, hide panel
        if (data.sender != newSocket.id) {
          console.log("data.sender != newSocket.id");
          // hide current panel showing in user page
          var infoPanelDiv = document.getElementById("infoPanel");
          infoPanelDiv.style.visibility = "collapse";
        }
        // receiver is the same as sender aka no need to hide alert as the sender client already has function
        // in place that will hideAlert()
      });

      newSocket.on("newAlertCreated", (data) => {
        console.log("New Alert Created: " + data);
        // update alertData
        setAlertData((oldAlertData) => [
          ...oldAlertData,
          {
            socketID: data.socketID,
            alertRoomName: data.alertRoomName,
            lat: data.lat,
            lon: data.lon,
            radius: data.radius
          },
        ]);
      });

      return () => {
        // Cleanup code, which runs when the component gets unmounted
      };
    }, []);

    // subscribe to the id of the selected AlertMenuItem
    const subscribeToAlert = (event) => {
      setSelectedAlert(event.target.value);
      var alertDataIndex = alertData.findIndex(
        (alertObject) => alertObject.socketID === event.target.value
      );
      console.log(alertData[alertDataIndex]);

      console.log("Subscribing to Alert #: " + event.target.value);
      console.log(
        "Latitude recognized for SelectedAlert: " + alertData[alertDataIndex].lat
      );
      console.log(
        "Longitude recognized for SelectedAlert?: " +
          alertData[alertDataIndex].lon
      );
      console.log(
        "Radius recognized for SelectedAlert?: " +
          alertData[alertDataIndex].radius
      );

      // need to add lat, long and radius key-value pairs
      socket.emit("subscribe_to_alert", {
        socketID: event.target.value,
        alertRoomName: "Alert Room " + event.target.value,
      });

      if (event.target.value != socket.id) {
        console.log(
          `User ${socket.id} Generating GeoJsonCircle for ${alertData[alertDataIndex].socketID}`
        );
        var center = [
          alertData[alertDataIndex].lat,
          alertData[alertDataIndex].lon,
        ];
        var radius = alertData[alertDataIndex].radius;
        var options = {
          steps: 20,
          units: "kilometers",
          properties: { foo: "bar" },
        };
        var watchRadius = circle(center, radius, options);

        // Visually creates alert radius
        setGeoJsonCircle(watchRadius);
      }
    };

    // update alert dropdown bar with newly created alert
    const _renderAlertItem = () => {
      // trigger subscribe_to_alert event
      return alertData.map((dt, i) => {
        return (
          <MenuItem
            label="Subscribe to Alert"
            value={dt.socketID}
            key={i}
            name={dt.socketID}
          >
            {dt.socketID === "Inactive Alert"
              ? dt.socketID
              : "Alert " + dt.socketID}
          </MenuItem>
        );
      });
    };

    // tell subscribers of alertRoomName channel that socket.id alert has been triggered
    const sendAlertTrigger = () => {
      socket.emit("send_alert_trigger", {
        sender: socket.id,
        to: "Alert Room " + socket.id, // get alertRoomName of selectedAlert
        content: "Proximity Alert Triggered for Alert: " + socket.id,
      });
    };

    // create Proximity alert
    function createRadius(lat, lon) {
      var infoPanelDiv = document.getElementById("infoPanel");
      infoPanelDiv.style.visibility = "collapse";

      var radiusSize = prompt("Please enter radius size in kilometers", "5");
      console.log("created Radius!");

      var center = [lon, lat];
      var radius = Number(radiusSize);
      var options = {
        steps: 20,
        units: "kilometers",
        properties: { foo: "bar" },
      };
      var watchRadius = circle(center, radius, options);

      // Visually creates alert radius
      setGeoJsonCircle(watchRadius);
      // sets radius of proximity alert and is the current active alert
      setWatchRadiusData({ radius, lat, lon });
      // websocket updates
      console.log(`Subscribe to: ${socket.id}`);
      // add newly created alert to alertData array of objects
      if (alertCount == 0) {
        setAlertCount(alertCount + 1);
        console.log("AlertCount should equal 1 but it equals: " + alertCount);
        // trigger new alert created event
        socket.emit("new_alert_create", {
          socketID: socket.id,
          alertRoomName: "Alert Room " + socket.id,
          lat: lat,
          lon: lon,
          radius: radius,
        });
        //console.log(`Updated lat: ${lat} and lon: ${lon}`);
        setAlertData((oldAlertData) => [
          ...oldAlertData,
          {
            socketID: socket.id,
            alertRoomName: "Alert Room " + socket.id,
            lat: lat,
            lon: lon,
            radius: radius,
          },
        ]);
      } else if (alertCount > 0 && selectedAlert === socket.id) {
        console.log(`Alert lat  and lon for ${socket.id} has been updated`);

        var alertDataIndex = alertData.findIndex(
          (alertObject) => alertObject.socketID === socket.id
        );

        // update corresponding alertData object
        alertData[alertDataIndex].lat = lat;
        alertData[alertDataIndex].lon = lon;

        console.log("Updated lat: " + alertData[alertDataIndex].lat);
        console.log("Updated lon: " + alertData[alertDataIndex].lon);
        console.log("Updated radius: " + alertData[alertDataIndex].radius);
      }
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

    function hidePanel() {
      var infoPanelDiv = document.getElementById("infoPanel");
      infoPanelDiv.style.visibility = "collapse";
      // call event that hides panel for all subscribers of this user client socket
      // TODO
      socket.emit("send_hide_alert", {
        sender: socket.id,
        to: "Alert Room " + socket.id,
      });
    }

    function showPanel(headline, content) {
      var infoPanelDiv = document.getElementById("infoPanel");
      var headlineH1 = document.getElementById("infoHeadline");
      var infoPanelText = document.getElementById("infoPanelText");
  
      infoPanelDiv.style.visibility = "visible";
      headlineH1.text = headline;
      infoPanelText.innerHtml = "<h3>" + content + "</h3>";
    }

    function proximityAlert(entity) {
      console.log("PROXIMITY ALERT");
      console.log(entity);
      // TODO: make this into a React control
      showPanel("a", "B");
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

  const circleLayer =
  geoJsonCircle &&
  new GeoJsonLayer({
    id: "geojson-layer",
    data: geoJsonCircle,
    pickable: true,
    stroked: false,
    filled: true,
    extruded: true,
    pointType: "circle",
    lineWidthScale: 20,
    lineWidthMinPixels: 2,
    getFillColor: [160, 160, 180, 200],
    getLineColor: (d) => chroma("green").alpha(0.5).rgb(),
    getPointRadius: 100,
    getLineWidth: 1,
    getElevation: 30,
  });

    return (
        <div>
            {userData && 
                <>
                    <Page user={userData}>
                    <div
                      id="infoPanel"
                      style={{
                        position: "absolute",
                        top: 175,
                        left: 10,
                        zIndex: 999,
                        backgroundColor: "salmon",
                        paddingTop: "15px",
                        paddingBottom: "15px",
                        paddingRight: "10px",
                        paddingLeft: "10px",
                        borderRadius: "5px",
                        visibility: "collapse",
                      }}
                    >
                      <h1 id="infoHeadline">Proximity Alert</h1>
                      <div id="infoPanelText" />
                    </div>
                    <div
                      ref={geocoderContainerRef}
                      style={{ position: "absolute", top: 15, left: 275, zIndex: 9999 }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        padding: "10px",
                        zIndex: 999,
                      }}
                    >
                      <Box
                        sx={{
                          width: 200,
                          height: 70,
                          padding: "10px",
                          marginTop: "10px",
                          backgroundColor: "#FFFFFF",
                          "&:hover": {
                            opacity: [0.9, 0.8, 0.7],
                          },
                        }}
                      >
                        <FormControl fullWidth>
                          <InputLabel id="demo-simple-select-label">Alerts</InputLabel>
                          <Select
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            value={selectedAlert}
                            label="Alert"
                            onChange={subscribeToAlert}
                          >
                            {_renderAlertItem()}
                          </Select>
                        </FormControl>
                      </Box>
                    </div>
                    <DeckGL
                        initialViewState={viewport}
                        onClick={(info, event) => {
                          // event bubble cancelation doesn't work between react components and deck.gl
                          if (event.target !== document.getElementById("view-default-view"))
                            return;
              
                          let lon = info.lngLat[0];
                          let lat = info.lngLat[1];
              
                          createRadius(lat, lon);
              
                          // console.log(lat, lon);
                        }}
                        controller
                        layers={[
                            busLayer2, busTextlayer, circleLayer
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