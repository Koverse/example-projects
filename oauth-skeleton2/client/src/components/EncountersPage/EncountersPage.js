import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
} from "react";
// import Page from "../PageTemplate";

import { StaticMap, InteractiveMap } from "react-map-gl";
import { FlyToInterpolator } from "deck.gl";
import DeckGL from "@deck.gl/react";

import { postData } from "../../helpers/rest";
import chroma from "chroma-js";
import { registerLoaders } from "@loaders.gl/core";
import { GLTFLoader, GLBLoader } from "@loaders.gl/gltf";
import moment from "moment";
import Geocoder from "react-map-gl-geocoder";
import circle from "@turf/circle";

import AuthContext from "../Auth/AuthContext";


import {
  IconLayer,
  TextLayer,
  GeoJsonLayer,
  ScatterplotLayer,
} from "@deck.gl/layers";
import { ScenegraphLayer } from "@deck.gl/mesh-layers";
import "react-map-gl-geocoder/dist/mapbox-gl-geocoder.css";
// websocket updates
import { io } from "socket.io-client";
// dropdown
//"@material-ui/core/Drawer"
import Box from "@material-ui/core/Box";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";

import { ConversationList } from "twilio/lib/rest/conversations/v1/conversation";

const accountSid = "ACf567a608696e81dc00c9d0916e879c98";
const authToken = "d9b33c5aec1afe92deab0df0aba21f7b";

const client = require("twilio")(accountSid, authToken);

/*********************************************************
 *                   VARIABLES                            *
 *********************************************************/

const EncountersPage = ({ user }) => {
  registerLoaders(GLTFLoader);

  const {loggedIn} = useContext(AuthContext);
  const accessToken = JSON.parse(localStorage.getItem("user")).accessToken

  const [flightData, setFlightData] = useState(null);
  const [busData, setBusData] = useState(null);
  const [portData, setPortData] = useState(null);
  const [tweetData, setTweetData] = useState(null);

  // alert system
  const [watchRadiusData, setWatchRadiusData] = useState(null);
  const [geoJsonCircle, setGeoJsonCircle] = useState(null);

  const [flightTimer, setFlightTimer] = useState({});
  const [busTimer, setBusTimer] = useState({});
  const [tweetTimer, setTweetTimer] = useState({});

  const [lastFetchTime, setLastFetchTime] = useState(
    moment().subtract("5", "minutes").format("YYYY-MM-DD HH:mm:ss")
  );

  const [activePlane, setActivePlane] = useState({});
  const [activeTweet, setActiveTweet] = useState({});
  const [activeBus, setActiveBus] = useState({});
  const [activePort, setActivePort] = useState({});

  // array of objects that have triggered alert
  const [activeAlerts, setActiveAlerts] = useState([]);

  // websocket updates
  const [socket, setSocket] = useState(null);
  // array of objects representing alertsMenuItems data
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
  const [selectedAlert, setSelectedAlert] = useState("none");
  const [alertCount, setAlertCount] = useState(0);

  // Available Models
  const PLANE_URL =
    "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/scenegraph-layer/airplane.glb";

  const PLANE_ICON = "https://i.imgur.com/yfAtFwv.png";

  // Selected Model for plane layer
  const MODEL_URL = PLANE_URL;

  const REFRESH_TIME = 25000;
  //const REFRESH_TIME = 10000;

  const ANIMATIONS = {
    "*": { speed: 1 },
  };

  const apiKeyMap = {
    admin: "401b9eb0-8562-41b6-bb2c-f9acb6bb7f78",
    centralcommand: "f67245c2-9f08-469b-a5df-628e888add07",
    groundcommand: "aaf30195-e6ac-476b-b8dd-508fa8a61463",
    infantrycommand: "2bd99d8f-6eb9-4924-b029-5eda0b247d86",
    usapilot: "ca5ecefa-f0b8-44f5-971c-0ab31f01ae51",
  };

  const koverseURL = `https://koverse.gov.saicds.com/api/v1/queries/object/names?recordStyle=2.2`;
  //const koverseURL = `http://egypt.koverse.com:7080/api/v1/queries/object/names?recordStyle=2.2&apiToken=${apiKeyMap.admin}`;
  //const koverseURL = `https://koverse.gov.saicds.com/api/v1/queries/object/names?recordStyle=2.2`;

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

  const DATA_INDEX = {
    UNIQUE_ID: 0,
    CALL_SIGN: 1,
    ORIGIN_COUNTRY: 2,
    LONGITUDE: 5,
    LATITUDE: 6,
    BARO_ALTITUDE: 7,
    VELOCITY: 9,
    TRUE_TRACK: 10,
    VERTICAL_RATE: 11,
    GEO_ALTITUDE: 13,
    POSITION_SOURCE: 16,
  };

  /*********************************************************
   *                   functions                            *
   *********************************************************/
  function randomIntFromInterval(min, max) {
    // min and max included
    return Math.random() * (max - min + 1) + min;
  }

  // websocket updates
  // create websocket connection
  useEffect(() => {
    const newSocket = io("wss://copdemo.koverse.com");
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
        // TODO: Call hidePanel() when alerts are no longer triggering proximity alert area
      }
      // else do NOT show alert because if the receiver is the same as sender there
      // is no need to alert the receiver as the sender client already has function
      // in place that will showPanel()
    });

    newSocket.on("hide_alert", (data) => {
      console.log(
        "Hide alert Panel for all subscribed to Alert: " + data.sender
      );
      // if alert's senderID != user's newSocket id, hide panel
      if (data.sender != newSocket.id) {
        console.log("data.sender != newSocket.id");
        //hidePanel();
        // hide current panel showing in user page
        var infoPanelDiv = document.getElementById("infoPanel");
        infoPanelDiv.style.visibility = "collapse";
        //showPanel(data.alertMessage, "");
        // TODO: Call hidePanel() when alerts are no longer triggering proximity alert area
      }
      // else do NOT hidePanel because if the receiver is the same as sender there
      // is no need to hide alert as the sender client already has function
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
          radius: data.radius,
          // include data to create GeoJsonCircle
          // alertCenter: data.alertCenter,
          // alertRadius: data.alertRadius,
        },
      ]);
    });

    return () => {
      // Cleanup code, which runs when the component gets unmounted
    };
  }, []);

  // TODO: Update and remove things here
  // subscribe to the id of the selected AlertMenuItem
  const subscribeToAlert = (event) => {
    setSelectedAlert(event.target.value);

    // TODO: CHANGE THIS TO FINDING THE INDEX INSTEAD OF THE OBJECT
    var alertDataIndex = alertData.findIndex(
      (alertObject) => alertObject.socketID === event.target.value
    );

    // find object in alertData array containing selectedAlert socketID key-value pair
    // let selectedAlertObject = alertData.filter(alertObj => {
    //   return alertObj.socketID === event.target.value
    // })
    //console.log(selectedAlertObject);
    console.log(alertData[alertDataIndex]);
    //const alertLat = myArray.find(x => x.id === '45').foo;

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
    // if event.target.value === 'Inactive Alert', then do NOT emit or subscribe to anything
    // instead, UNSUBSCRIBE from previous room

    // TODO: MOVE THIS TO SEPERATE RENDER() FUNCTION THAT YOU WILL CALL CONDITIONALLY
    // if event.target.value != socket.id // aka selectedAlert is not the users own alert that they generated
    // create geoJsonCircle

    // get div element by id
    //var geoJsonDiv = document.getElementById("geojson-layer");
    //infoPanelDiv.style.visibility = "collapse";

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
  // render circle for all subscribers
  // at this point, selectedAlert != socket.id **TODO: Think about inactive Alert state!
  const _renderGeoJsonCircle = () => {
    if (
      socket != null &&
      selectedAlert != "none" &&
      selectedAlert != socket.id
    ) {
      // render main subscribed alert geojsoncircle for all subscribers
      // get info of the alert we're subscribed to
      var alertDataIndex = alertData.findIndex(
        (alertObject) => alertObject.socketID === selectedAlert
      );

      if (selectedAlert != socket.id) {
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
    }
    // what if selectedAlert is the Inactive Alert?
    if (selectedAlert === "Inactive Alert") {
      // setGeoJsonCircle to Null
      setGeoJsonCircle(null);
    }
  };

  // update alert dropdown bar with newly created alert
  const _renderAlertItem = () => {
    //console.log("Alert added to dropdown");
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

  function markAsHostile(infoObject) {
    // TODO: mark selected item as hostile (change color, etc)
  }

  function showPlaneData(info, event) {
    var callsign = info.object.callsign;
    // showPanel("Plane Details", callsign);

    // console.log("event");
    // console.log(event);
    // console.log("info");
    // console.log(info);

    let object = info.object;
    let x = event.x;
    let y = event.y;
    // setActivePlane({ object, x, y })
    console.log(info);

    markAsHostile(info.object);
  }

  function showTweetData(info, event) {
    // console.log("tweeeeeet");
    // console.log(info);
    // showPanel("Tweet Details", "Screenname = " + info.object.screenName);
  }

  function showBusData(info, event) {
    // showPanel("Bus Details", "Screenname = " + info.object.screenName);
    // console.log("buuuuuuuuuuuuuuuuus");
    // console.log(info);
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

    // Conditional rendering
    //

    // alert(headline + "\n" + content);
  }

  /**
   * Calculates the haversine distance between point A, and B.
   * @param {number[]} latlngA [lat, lng] point A
   * @param {number[]} latlngB [lat, lng] point B
   * @param {boolean} isMiles If we are using miles, else km.
   */
  const haversineDistance = ([lat1, lon1], [lat2, lon2], isMiles = false) => {
    const toRadian = (angle) => (Math.PI / 180) * angle;
    const distance = (a, b) => (Math.PI / 180) * (a - b);
    const RADIUS_OF_EARTH_IN_KM = 6371;

    const dLat = distance(lat2, lat1);
    const dLon = distance(lon2, lon1);

    lat1 = toRadian(lat1);
    lat2 = toRadian(lat2);

    // Haversine Formula
    const a =
      Math.pow(Math.sin(dLat / 2), 2) +
      Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.asin(Math.sqrt(a));

    let finalDistance = RADIUS_OF_EARTH_IN_KM * c;

    if (isMiles) {
      finalDistance /= 1.60934;
    }

    return finalDistance;
  };

  /*********************************************************
   *                   TOOL TIP CONTROLS                    *
   *********************************************************/

  const _renderPlaneToolTip = () => {
    const { object, x, y } = activePlane || {};
    return (
      object && (
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            zIndex: 9999,
            fontSize: "12px",
            padding: "8px",
            background: "#c0c0c0",
            color: "#000",
            minWidth: "160px",
            maxHeight: "240px",
            overflowY: "hidden",
            left: x,
            top: y,
          }}
        >
          <h1>{object.callsign}</h1>
          Track: {object.track} <br />
          Hex: {object.hex} <br />
          Category: {object.category} <br />
          Heading: {object.nav_heading} <br />
          Squawk: {object.squawk} <br />
          Ingest Time: {object.IngestTime} <br />
        </div>
      )
    );
  };

  const _renderTwitterToolTip = () => {
    const { object, x, y } = activeTweet || {};
    return (
      object && (
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            zIndex: 9999,
            fontSize: "12px",
            padding: "8px",
            background: "lightblue",
            color: "#000",
            minWidth: "160px",
            maxHeight: "240px",
            overflowY: "hidden",
            left: x,
            top: y,
          }}
        >
          <h1>{object.screenName}</h1>

          <h4>{object.userDescription}</h4>
          <p>Followers: {object.friendsCount} </p>
        </div>
      )
    );
  };

  const _renderPortToolTip = () => {
    const { object, x, y } = activePort || {};
    return (
      object && (
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            zIndex: 9999,
            fontSize: "12px",
            padding: "8px",
            background: "lightblue",
            color: "#000",
            minWidth: "160px",
            maxHeight: "240px",
            overflowY: "hidden",
            left: x,
            top: y,
          }}
        >
          <h1>{object.portname}</h1>

          <h4>{object.code}</h4>
        </div>
      )
    );
  };

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

  //GET FLIGHT DATA
  useEffect(() => {
    console.log(lastFetchTime);
    const query = {
      collectionNames: ["ADSB"],
      query: {
        $and: [
          {
            IngestTime: {
              $gte: moment()
                .subtract("2", "minutes")
                .utc()
                .format("YYYY-MM-DDTHH:mm:ss[Z]"),
            },
          },
        ],
      },
      fieldsToReturn: [
        "lon",
        "lat",
        "alt_baro",
        "flight",
        "track",
        "hex",
        "category",
        "nav_heading",
        "squawk",
        "IngestTime",
      ],
      offset: 0,
      limit: 3000,
    };
    postData(koverseURL, query, accessToken)
      // fails to fetch from koverseURL
      //postData(koverseURL, query)
      .then((data) => {
        // UseState as a filter
        // Modify

        if (data.length > 0 && flightTimer.id !== null) {
          let preFlightData = data[0].records.map((record) => {
            // console.log(record);

            if ("lon" in record.value) {
              return {
                coordinates: [
                  Number(record.value.lon),
                  Number(record.value.lat),
                  Number(record.value.alt_baro),
                ],
                callsign: record.value.flight,
                track: record.value.track,
                hex: record.value.hex,
                type: "Plane",
                details: record.value.flight,
                category: record.value.category,
                nav_heading: record.value.nav_heading,
                squawk: record.value.squawk,
                IngestTime: record.value.IngestTime,
              };
            }
          });

          preFlightData = preFlightData.filter(function (element) {
            return element !== undefined;
          });

          // console.log(preFlightData)

          const dataAsObj = {};
          let sortedData = preFlightData;
          sortedData.forEach((entry) => (dataAsObj[entry["hex"]] = entry));
          sortedData = preFlightData.map(
            (entry) => dataAsObj[entry["hex"]] || entry
          );

          // console.log(sortedData)
          setFlightData(sortedData);
          setLastFetchTime(moment().format("YYYY-MM-DD HH:mm:ss"));
        }
      })
      .finally(() => {
        flightTimer.nextTimeoutId = setTimeout(
          () => setFlightTimer({ id: flightTimer.nextTimeoutId }),
          15000
        );
      });

    return () => {
      clearTimeout(flightTimer.nextTimeoutId);
      flightTimer.id = null;
    };
  }, [flightTimer]);

  // GET twitter data
  useEffect(() => {
    setTweetData([]);
    console.log(lastFetchTime);
    const query = {
      collectionNames: ["Denver Tweets"],
      query: {
        $and: [
          {
            created_at: {
              $gte: moment()
                .subtract("20", "minutes")
                .utc()
                .format("YYYY-MM-DDTHH:mm:ss[Z]"),
            },
          },
        ],
      },
      offset: 0,
      fieldsToReturn: ["user", "text", "place"],
      limit: 1000,
    };
    postData(koverseURL, query, accessToken)
      //postData(koverseURL, query)
      .then((data) => {
        console.log("Tweet data: " + data);
        if (data.length > 0 && tweetTimer.id !== null) {
          const tweetData = data[0].records.map((record) => {
            let firstCoord = record.value.place.bounding_box.coordinates[0][0];
            let secondCoord = record.value.place.bounding_box.coordinates[0][2];
            console.log(firstCoord);
            return {
              coordinates: [
                randomIntFromInterval(firstCoord[0], secondCoord[0]),
                randomIntFromInterval(firstCoord[1], secondCoord[1]),
              ],
              screenName: record.value.user.screen_name,
              type: "Tweet",
              details: record.value.user.screen_name,
              text: record.value.text,
              friendsCount: record.value.user.friends_count,
              profileImageUrl: record.value.user.profile_image_url,
              userDescription: record.value.user.description,
            };
          });

          setTweetData(tweetData);
          setLastFetchTime(moment().format("YYYY-MM-DD HH:mm:ss"));
        }
      })
      .finally(() => {
        tweetTimer.nextTimeoutId = setTimeout(
          () => setTweetTimer({ id: tweetTimer.nextTimeoutId }),
          REFRESH_TIME
        );
      });

    return () => {
      clearTimeout(tweetTimer.nextTimeoutId);
      tweetTimer.id = null;
    };
  }, [tweetTimer]);

  // GET BUS DATA - TODO: issues with getting bus data using updated koverseURL
  useEffect(() => {
    console.log(lastFetchTime);
    const query = {
      collectionNames: ["RTD Metro"],
      query: {
        $and: [
          {
            time: {
              $gte: moment().subtract("5", "minutes").format("X"),
            },
          },
        ],
      },
      offset: 0,
      limit: 400,
    };
    postData(koverseURL, query, accessToken)
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
              route: record.value.routeId,
              bearing: record.value.bearing,
              index: index,
              type: "Bus",
              details: record.value.routeId,
              speed: record.value.speed,
              isHostile: false,
            };
          });

          const dataAsObj = {};
          let sortedData = busData;
          sortedData.forEach((entry) => (dataAsObj[entry["index"]] = entry));

          sortedData = busData.map(
            (entry) => dataAsObj[entry["index"]] || entry
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

  // GET PORT DATA
  useEffect(() => {
    console.log(lastFetchTime);
    const query = {
      collectionNames: ["Worldwide Ports"],
      query: {
        $or: [
          {
            code: {
              $eq: "USELS",
            },
          },
          {
            code: {
              $eq: "USSAN",
            },
          },
          {
            code: {
              $eq: "USHTD",
            },
          },
          {
            code: {
              $eq: "USWTN",
            },
          },
          {
            code: {
              $eq: "USJNP",
            },
          },
          {
            code: {
              $eq: "USXJX",
            },
          },
        ],
      },
      offset: 0,
      limit: 400,
    };
    postData(koverseURL, query, accessToken).then((data) => {
      console.log(data);
      if (data.length > 0) {
        let portData = data[0].records.map((record, index) => {
          // console.log(record);

          return {
            coordinates: [record.value.longitude, record.value.latitude],
            code: record.value.code,
            portname: record.value.portname,
          };
        });

        console.log(portData);

        //setPortData(portData);
      }
    });
  }, []);

  useEffect(() => {
    console.log("data or radius change");
    // if (busData && tweetData && flightData) {
    if (flightData) {
      // only listen to current watchRadiusData as long as the selectedAlert is for this client socket
      if (watchRadiusData && selectedAlert === socket.id) {
        console.log("has watch radius data firing off alerts");
        // const mergedData = [...busData, ...tweetData, ...flightData];
        const mergedData = [...tweetData, ...flightData];
        const center = [watchRadiusData.lat, watchRadiusData.lon];
        const alerts = mergedData.filter((entity) => {
          if (entity.coordinates.length > 0) {
            const entityCoords = [entity.coordinates[1], entity.coordinates[0]];
            // distance between the entity object and the center of the alert radius
            const distance = haversineDistance(center, entityCoords, false);

            // entity is within the proximity alert radius -> TRIGGER ALERT
            if (distance <= Number(watchRadiusData.radius)) {
              proximityAlert(entity);

              sendAlertTrigger();

              // else, socket.id is listening to a different alert than itself and we
              // will NOT be broadcasting anything
              return entity;
            }
          }
        });
        console.log("alerts updated: ", alerts);
        // if alerts is empty THEN call hidePanel
        if (alerts.length === 0) {
          // hides panel of current user client socket
          hidePanel();
        }
        setActiveAlerts(alerts);
      }
    }
  }, [busData, tweetData, flightData, watchRadiusData]);

  function proximityAlert(entity) {
    console.log("PROXIMITY ALERT");
    console.log(entity);

    // TODO: make this into a React control
    showPanel("a", "B");

    let type = entity.type;

    // const accountSid = 'ACf567a608696e81dc00c9d0916e879c98';
    // const authToken = 'd9b33c5aec1afe92deab0df0aba21f7b';
    // const client = require('twilio')(accountSid, authToken);

    //console.log(client);

    // client.messages
    //     .create({
    //        body: `{type} inside watch radius!`,
    //        messagingServiceSid: 'MGa16006f65d1769cf385e0bd40af147f4',
    //        to: '+13017504608'
    //      })
    //     .then(message => console.log(message.sid))
    //     .done();
  }

  /*********************************************************
   *                   LAYERS                               *
   *********************************************************/

  const flightLayer =
    flightData &&
    new ScenegraphLayer({
      loadOptions: GLBLoader,
      id: "plane-layer",
      data: flightData,
      pickable: true,
      sizeScale: 30,
      scenegraph: MODEL_URL,
      // Doesn't work
      // scenegraph: (d) => determineModel(d),

      // getScale: (d) => d.category == "A1" ? [0.5,1,2] : [1,1,1],

      _animations: ANIMATIONS,
      sizeMinPixels: 0.1,
      sizeMaxPixels: 10,
      getPosition: (d) => d.coordinates,
      getOrientation: (d) => [0, -d.track || 0, 90],
      onClick: (info, event) => showPlaneData(info, event),
      onHover: ({ object, x, y }) => {
        setActivePlane({ object, x, y });
      },

      getColor: (d) => (d.category == "A1" ? "red" : "white"),
      updateTriggers: {
        getFillColor: ["red", "white"],
      },
    });

  const ICON_MAPPING = {
    marker: { x: 0, y: 0, width: 128, height: 128, mask: true },
  };

  const hostilePlaneLayer = new IconLayer({
    id: "icon-layer",
    data: flightData,
    pickable: true,
    // iconAtlas and iconMapping are required
    // getIcon: return a string
    iconAtlas:
      "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png",
    iconMapping: ICON_MAPPING,
    getIcon: (d) => "marker",
    sizeScale: 12,
    // getOrientation: (d) => [0, -d.track || 0, 90],
    getPosition: (d) => d.coordinates,
    getSize: (d) => 5,
    getColor: (d) => (d.category == "A1" ? [255, 0, 0, 144] : [0, 0, 255, 144]),
  });

  const portLayer = new IconLayer({
    id: "port-layer",
    data: portData,
    pickable: true,
    // iconAtlas and iconMapping are required
    // getIcon: return a string
    iconAtlas: "https://cdn-icons-png.flaticon.com/512/2836/2836720.png",
    iconMapping: {
      marker: { x: 0, y: 0, width: 512, height: 512, mask: true },
    },
    getIcon: (d) => "marker",
    sizeScale: 15,
    // getOrientation: (d) => [0, -d.track || 0, 90],
    getPosition: (d) => d.coordinates,
    onHover: ({ object, x, y }) => {
      setActivePort({ object, x, y });
    },
    getSize: (d) => 5,
    getColor: (d) =>
      d.category == "A1" ? [15, 240, 252, 255] : [15, 240, 252, 255],
  });

  // TODO: convert buslayer to icon layer
  // or add overlay icon layer

  // const hostileBusLayer = new IconLayer({
  //   id: 'icon-layer',
  //   data: busData,
  //   pickable: true,
  //   // iconAtlas and iconMapping are required
  //   // getIcon: return a string
  //   iconAtlas: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png',
  //   iconMapping: ICON_MAPPING,
  //   getIcon: d => 'marker',
  //   sizeScale: 15,
  //   getPosition: d => d.coordinates,
  //   getSize: d => 5,
  //   getColor: d => d.isHostile ? [255,0,0, 144] : [0,255,0, 144]
  // });

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
      // getFillColor: (d) =>
      //   d.isHostile ? [0, 255, 0, 144] : [255, 255, 212, 144],
      onClick: (info, event) => showBusData(info, event),
      getLineColor: (d) => [255, 255, 0],
      onHover: ({ object, x, y }) => {
        setActiveBus({ object, x, y });
      },
      // transitions: {
      //   getRadius: {
      //     type: "spring",
      //     stiffness: 0.01,
      //     damping: 0.15,
      //     enter: (value) => [0], // grow from size 0
      //   },
      // },
    });

  // const busLayer =
  //   busData &&
  //   new ScenegraphLayer({
  //     loadOptions: GLBLoader,
  //     id: "bus-layer",
  //     data: busData,
  //     pickable: true,
  //     sizeScale: 300,
  //     scenegraph: ANIMATEDBOX_URL,
  //     sizeMinPixels: 0.1,
  //     sizeMaxPixels: 10,
  //     getPosition: (d) => d.coordinates,
  //     getOrientation: (d) => [0, d.bearing, 90],
  //     onClick: (info, event) => showBusData(info, event),
  //     onHover: ({ object, x, y }) => {setActiveBus({ object, x, y })} ,
  //   });

  const tweetLayer =
    tweetData &&
    new ScatterplotLayer({
      id: "scatterplot-layer-tweet",
      data: tweetData,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 8,
      radiusMinPixels: 5,
      radiusMaxPixels: 100,
      lineWidthMinPixels: 1,
      getPosition: (d) => d.coordinates,
      getRadius: (d) => 25,
      getFillColor: (d) =>
        d.friendsCount < 500 ? chroma("blue").rgb() : chroma("red").rgb(),
      onClick: (info, event) => showTweetData(info, event),
      onHover: ({ object, x, y }) => {
        setActiveTweet({ object, x, y });
      },

      getLineColor: (d) => [0, 0, 0],
      transitions: {
        getRadius: {
          type: "spring",
          stiffness: 0.01,
          damping: 0.15,
          enter: (value) => [0], // grow from size 0
        },
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
      {}
      {/* <Page> */}
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
          initialViewState={viewState}
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
          // onViewStateChange={_onViewStateChange}
          layers={[
            flightLayer,
            tweetLayer,
            hostilePlaneLayer,
            busLayer2,
            busTextlayer,
            circleLayer,
            portLayer,
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

          {_renderPlaneToolTip()}
          {_renderTwitterToolTip()}
          {_renderBusToolTip()}
          {_renderPortToolTip()}
        </DeckGL>
      {/* </Page> */}
    </div>
  );
};

export default EncountersPage;
