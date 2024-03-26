/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js 
--------------------------------------------------------------------*/

/*--------------------------------------------------------------------
Step 1: INITIALIZE MAP
--------------------------------------------------------------------*/
// Define access token
mapboxgl.accessToken = 'pk.eyJ1Ijoia2NoZ28iLCJhIjoiY2xzYzl0ZmdqMGV2MDJrc2J0d2QxY3BjMSJ9.j4YNLdElfmSsY_rztE1FJw'; //****ADD YOUR PUBLIC ACCESS TOKEN*****

// Initialize map and edit to your preference
const map = new mapboxgl.Map({
    container: 'map', // container id in HTML
    style: 'mapbox://styles/mapbox/light-v11',  // ****ADD MAP STYLE HERE *****
    center: [-79.39, 43.65],  // starting point, longitude/latitude
    zoom: 12 // starting zoom level
});

/*--------------------------------------------------------------------
Step 2: VIEW GEOJSON POINT DATA ON MAP
--------------------------------------------------------------------*/
//HINT: Create an empty variable
//      Use the fetch method to access the GeoJSON from your online repository
//      Convert the response to JSON format and then store the response in your new variable

let collisiongeojson;

fetch('https://raw.githubusercontent.com/kchartigango/ggr472-lab4/main/pedcyc_collision_06-21.geojson')
    .then(response => response.json())
    .then(response => {
        console.log(response); //Checking response in the console
        collisiongeojson = response; //Storing the geojson as a variable using the data URL from fetch response
    });

//Loading data to map using GeoJSON variable
map.on('load', () => {

    //Adding underlying source data to view the points
    map.addSource('collis-points', {
        type: 'geojson',
        data: collisiongeojson
    })

    //Visualizing the collision point data on a layer
    map.addLayer({
        'id': 'collis-point-layer',
        'type': 'circle',
        'source': 'collis-points',
        'paint': {
            'circle-radius': 3,
            'circle-color': 'lavender',
            'circle-stroke-color': 'purple',
            'circle-stroke-width': 1
        }
    })

/*--------------------------------------------------------------------
    Step 3: CREATE BOUNDING BOX AND HEXGRID
--------------------------------------------------------------------*/
//HINT: All code to create and view the hexgrid will go inside a map load event handler
//      First create a bounding box around the collision point data then store as a feature collection variable
//      Access and store the bounding box coordinates as an array variable
//      Use bounding box coordinates as argument in the turf hexgrid function

    // let bboxgeojson;
    let bbox = turf.envelope(collisiongeojson);
    let bboxscaled = turf.transformScale(bbox, 1.10);

    //Putting the resulting envelope in a GeoJSON format FeatureCollection
    bboxgeojson = {
        "type": "FeatureCollection",
        "features": [bboxscaled]
    };

    //Creating a hexgrid
    console.log(bboxscaled)
    console.log(bboxscaled.geometry.coordinates)
    
    let bboxcoords = [bboxscaled.geometry.coordinates[0][0][0], //minX
                    bboxscaled.geometry.coordinates[0][0][1], //minY
                    bboxscaled.geometry.coordinates[0][2][0], //maxX
                    bboxscaled.geometry.coordinates[0][2][1]]; //maxY
        
    // let bboxcoords = turf.bbox(collisiongeojson); - simplified code for bounding box
    let hexgeojson = turf.hexGrid(bboxcoords, 0.5, { units: 'kilometers' });
    
    map.addSource('bbox-collis', {
        type: 'geojson',
        data: bboxgeojson
    });

    map.addLayer({
        'id': 'bbox-collis-points',
        'type': 'fill',
        'source': 'bbox-collis',
        'paint': {
            'fill-color': 'lavender',
            'fill-opacity': 0.5,
            'fill-outline-color': 'purple'
        }
    });

    map.addSource('bbox-coords', {
        type: 'geojson',
        data: hexgeojson
    });

    map.addLayer({
        'id': 'hex-layer',
        'type': 'fill',
        'source': 'bbox-coords',
        'paint': {
            'fill-color': 'green',
            'fill-opacity': 0.5,
            'fill-outline-color': 'green'
        }
    });

/*--------------------------------------------------------------------
Step 4: AGGREGATE COLLISIONS BY HEXGRID
--------------------------------------------------------------------*/
//HINT: Use Turf collect function to collect all '_id' properties from the collision points data for each heaxagon
//      View the collect output in the console. Where there are no intersecting points in polygons, arrays will be empty

    let collisionhex = turf.collect(hexgeojson, collisiongeojson, '_id', 'values');

    // Counting the number of features inside each hexagon and identifying the max value
    let maxcollision = 0;

    collisionhex.features.forEach((feature) => { //The forEach loop iterates through each hexagon in hexgeojson
        feature.properties.COUNT = feature.properties.values.length //The 'COUNT' property will have as many features as the dataset it is drawing from
        if (feature.properties.COUNT > maxcollision) { //If the number of collisions in the hexagon is greater than 0, it will be stored in the 'COUNT' property
            console.log(feature);
            maxcollision = feature.properties.COUNT //The 'COUNT' property, or the number of collisions in that hexagon gets stored in the variable maxcollision
        }
    });
    console.log(maxcollision);

    map.addSource('hex-collect', {
        type: 'geojson',
        source: collisionhex
    });

    map.addLayer({
        'id': 'collect-hex-fill',
        'type': 'fill',
        'source': 'hex-collect',
        'paint': {
            'fill-color': [
                'step', //The 'step' expression here will produce stepped results based on the retrieved values.
                ['get', 'COUNT'], //The 'get' expression will retrieve each property value from the 'COUNT' data field.
                '#ffffcc', //The color assigned to any values < first step.
                10, '#a1dab4', //The subsequent colors assigned to values >= each step.
                20, '#41b6c4',
                30, '#253494'
                ],
            'fill-outline-color': 'teal',
            'fill-opacity': 0.8
        }
    });
});

map.on('click', 'collect-hex-fill', (e) => {
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML("<b>Collision count:</b> " + e.features[0].properties.COUNT)
    .addTo(map);
});

// /*--------------------------------------------------------------------
// Step 5: FINALIZE YOUR WEB MAP
// --------------------------------------------------------------------*/
//HINT: Think about the display of your data and usability of your web map.
//      Update the addlayer paint properties for your hexgrid using:
//        - an expression
//        - The COUNT attribute
//        - The maximum number of collisions found in a hexagon
//      Add a legend and additional functionality including pop-up windows


