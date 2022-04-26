import React, { useState, useEffect, useRef, useCallback } from "react";
import Page from "../PageTemplate";

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
import { useKeycloak } from "@react-keycloak/web";

import {
  IconLayer,
  TextLayer,
  GeoJsonLayer,
  ScatterplotLayer,
} from "@deck.gl/layers";
import { ScenegraphLayer } from "@deck.gl/mesh-layers";
import "react-map-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { ConversationList } from "twilio/lib/rest/conversations/v1/conversation";
// websocket updates
import WebSocket from "ws";
//import { io } from "socket.io-client";

const accountSid = "ACf567a608696e81dc00c9d0916e879c98";
const authToken = "d9b33c5aec1afe92deab0df0aba21f7b";

//const client = require("twilio")(accountSid, authToken);

/*********************************************************
 *                   VARIABLES                            *
 *********************************************************/

const EncountersPage = ({ user }) => {
  registerLoaders(GLTFLoader);

  const { initialized, keycloak } = useKeycloak();

  const [flightData, setFlightData] = useState(null);
  const [busData, setBusData] = useState(null);
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

  // difference between active plane and flightData?
  const [activePlane, setActivePlane] = useState({});
  const [activeTweet, setActiveTweet] = useState({});
  const [activeBus, setActiveBus] = useState({});

  const [activeAlerts, setActiveAlerts] = useState([]);
  // create a createdAlerts state array
  const [_createdMessages, setCreatedMessages] = useState([]);
  const [isConnectionOpen, setConnectionOpen] = useState(false);

  // websocket updates
  const ws = useRef();

  // Available Models
  //const DUCK_URL = "https://github.com/KhronosGroup/glTF-Sample-Models/raw/master/2.0/Duck/glTF-Binary/Duck.glb";
  const PLANE_URL =
    "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/scenegraph-layer/airplane.glb";
  //const BOX_URL = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb";
  //const ANIMATEDBOX_URL = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxAnimated/glTF-Binary/BoxAnimated.glb";

  // Selected Model for plane layer
  const MODEL_URL = PLANE_URL;

  const REFRESH_TIME = 25000;

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

  // is this the server to throw websockets in?
  //const koverseURL = `http://egypt.koverse.com:7080/api/v1/queries/object/names?recordStyle=2.2&apiToken=$`
  //const koverseURL = `http://ec2-52-61-255-125.us-gov-west-1.compute.amazonaws.com:7080/api/v1/queries/object/names?recordStyle=2.2`;
  const koverseURL = `http://egypt.koverse.com:7080/api/v1/queries/object/names?recordStyle=2.2&apiToken=${apiKeyMap.admin}`;

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

  //const [selectedItem, setSelectedItem] = useState(null);

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
    ws.current = new WebSocket("ws://localhost:3031");

    ws.current.onopen = () => {
      console.log("Connection opened!");
      //ws.current.send(JSON.stringify({ "new client loaded" : true }));
      setConnectionOpen(true);
    };

    // event listener for when alert is received
    // what if this event listener had not just the 'ev' listener param but a topic param
    ws.current.onmessage = (ev) => {
      console.log("Message received!");
      const message = ev.data;
      //const message = JSON.parse(ev.data);
      console.log("Message: " + JSON.stringify(message));
      setCreatedMessages((_createdMessages) => [..._createdMessages, message]);
    };

    // event listener for when user exits/closes out of app
    ws.current.onclose = () => {
      console.log("disconnected");
    };

    return () => {
      // Cleanup code, which runs when the component gets unmounted
    };
  }, []);

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
    // send watchRadiusData message to clients that an alert has been created
    ws.current.send(JSON.stringify({ alertloaded: "true" }));
    console.log("Alert 1 created");
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
          <p>Friends: {object.friendsCount} </p>
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
                .subtract("5", "minutes")
                .utc()
                .format("YYYY-MM-DDTHH:mm:ss[Z]"),
            },
          },
        ],
      },
      offset: 0,
      limit: 400,
    };
    postData(koverseURL, query, keycloak.token)
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
          REFRESH_TIME
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
            timestamp_ms: {
              $gte: moment().subtract("5", "minutes").format("X"),
            },
          },
        ],
      },
      offset: 0,
      limit: 400,
    };
    postData(koverseURL, query, keycloak.token)
      //postData(koverseURL, query)
      .then((data) => {
        if (data.length > 0 && tweetTimer.id !== null) {
          const tweetData = data[0].records.map((record) => {
            let firstCoord = record.value.place.bounding_box.coordinates[0][0];
            let secondCoord = record.value.place.bounding_box.coordinates[0][2];

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

  // GET BUS DATA
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
    postData(koverseURL, query, keycloak.token)
      //postData(koverseURL, query)
      .then((data) => {
        if (data.length > 0 && busTimer.id !== null) {
          let busData = data[0].records.map((record, index) => {
            // console.log(record);

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

  useEffect(() => {
    console.log("data or radius change");
    // if (busData && tweetData && flightData) {
    if (flightData) {
      if (watchRadiusData) {
        console.log("has watch radius data firing off alerts");
        // const mergedData = [...busData, ...tweetData, ...flightData];
        const mergedData = [...tweetData, ...flightData];
        const center = [watchRadiusData.lat, watchRadiusData.lon];
        const alerts = mergedData.filter((entity) => {
          if (entity.coordinates.length > 0) {
            // lon and lat?
            const entityCoords = [entity.coordinates[1], entity.coordinates[0]];
            // distance between the entity object and the center of the alert radius
            const distance = haversineDistance(center, entityCoords, false);

            // entity is within the proximity alert radius -> TRIGGER ALERT
            if (distance <= Number(watchRadiusData.radius)) {
              proximityAlert(entity);

              return entity;
            }
          }
          //
          //
        });
        console.log("alerts updated: ", alerts);
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
    sizeScale: 15,
    // getOrientation: (d) => [0, -d.track || 0, 90],
    getPosition: (d) => d.coordinates,
    getSize: (d) => 5,
    getColor: (d) => (d.category == "A1" ? [255, 0, 0, 144] : [0, 0, 255, 144]),
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
    getColor: (d) => [100, 65, 30, 255],
    getSize: 24,
    getAngle: 0,
    getTextAnchor: "middle",
    getAlignmentBaseline: "center",
    onHover: ({ object, x, y }) => {
      setActiveBus({ object, x, y });
    },
  });

  const busLayer2 =
    tweetData &&
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
      getFillColor: (d) =>
        d.isHostile ? [0, 255, 0, 144] : [255, 255, 212, 144],
      onClick: (info, event) => showBusData(info, event),
      getLineColor: (d) => [255, 255, 0],
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
      radiusMinPixels: 1,
      radiusMaxPixels: 100,
      lineWidthMinPixels: 1,
      getPosition: (d) => d.coordinates,
      getRadius: (d) => 25,
      getFillColor: (d) =>
        d.friendsCount < 100 ? chroma("blue").rgb() : chroma("red").rgb(),
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
      <Page>
        <div
          id="infoPanel"
          style={{
            position: "absolute",
            top: 150,
            left: 25,
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
        </DeckGL>
      </Page>
    </div>
  );
};

export default EncountersPage;
