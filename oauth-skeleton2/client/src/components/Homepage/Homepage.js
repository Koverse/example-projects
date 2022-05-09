import React, { useEffect, useState, useContext, useRef, useCallback} from "react";
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import AuthContext from "../Auth/AuthContext";
import Page from "../PageTemplate/index";

import moment from "moment";
import { InteractiveMap, Marker } from "react-map-gl";
import DeckGL from "@deck.gl/react";

import Geocoder from "react-map-gl-geocoder";
import "react-map-gl-geocoder/dist/mapbox-gl-geocoder.css";

const Homepage = () => {

    const {loggedIn} = useContext(AuthContext);

    const [adsbData, setAdsbData] = useState([]);
    const [dataTimer, setDataTimer] = useState({});
    const [lastFetchTime, setLastFetchTime] = useState(
        moment().subtract("5", "minutes").format("YYYY-MM-DD HH:mm:ss")
      );
    const REFRESH_TIME = 25000;
    //const REFRESH_TIME = 10000;

    const [viewport, setViewport] = useState({
      longitude: -104.991531,
      latitude: 39.742043,
      width: "100%",
      height: "100%",
      zoom: 8,
      bearing: 0,
      pitch: 0
  })
    const mapRef = useRef();
    const geocoderContainerRef = useRef();

    const handleViewportChange = useCallback(
      (newViewport) => setViewport(newViewport),
      []
    );

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

          console.log(res.data.records)
          let preFlightData = res.data.records.map((record, index) => {

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

          preFlightData = preFlightData.filter(function (element) {
            return element !== undefined;
          });

          const dataAsObj = {};
            let sortedData = preFlightData;
            sortedData.forEach((entry) => (dataAsObj[entry["index"]] = entry));
            sortedData = preFlightData.map(
              (entry) => dataAsObj[entry["index"]] || entry
            );
  
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

    return (
        <div>
            {loggedIn && 
                <>
                    <Page>
                    <div
                    ref={geocoderContainerRef}
                    style={{ position: "absolute", top: 15, left: 275, zIndex: 9999 }}
                    />
                    <DeckGL
                        initialViewState={viewport}
                        controller              
                    >
                        <InteractiveMap
                            {...viewport}
                            ref={mapRef}
                            reuseMaps
                            mapStyle="mapbox://styles/mapbox/dark-v9"
                            preventStyleDiffing
                            mapboxApiAccessToken="pk.eyJ1IjoiZ2FycmV0dGNyaXNzIiwiYSI6ImNrYWltOWk5cTAyaXMydHMwdm5rMWd1bXQifQ.xY8kGI7PtunrCBszB_2nCw"
                        >
                            {console.log(adsbData)}
                    {adsbData != null && adsbData.map((data, i) => (
                      <Marker  key={`marker-${i}`} longitude={data.coordinates[0]} latitude={data.coordinates[1]} anchor="bottom" >
                        {console.log("adsbData length: " + adsbData.length)}
                        <img src="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" />
                      </Marker>
                      
                    ))}
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