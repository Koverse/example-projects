/// app.js
import React, { useState, useRef } from 'react';
import ReactMapGL from 'react-map-gl'
import Page from "../PageTemplate";

const MAPBOX_TOKEN = 'pk.eyJ1IjoiaW5kaXJhamhlbm55IiwiYSI6ImNsMmc1NGtlYzAwbDczamx3OXpnZ3NrNzMifQ.ei_QTtV_inPDuU_SKQ1BBA';

function Map2() {
    const [viewport, setViewport] = useState({
        longitude: -104.991531,
        latitude: 39.742043,
        width: "100%",
        height: "100%",
        zoom: 10,
    })
    const mapRef = useRef();

    return (
        <div style={{ height: "100vh" }}>
            <ReactMapGL
               {...viewport}
               ref={mapRef}
               mapStyle="mapbox://styles/mapbox/dark-v9"
               mapboxAccessToken={MAPBOX_TOKEN}
               onViewportChange={(nextViewport) => setViewport(nextViewport)}
               >
            markers here
            </ReactMapGL>        
            </div>
    );

}
export default Map2;