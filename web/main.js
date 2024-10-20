require(["esri/views/MapView", "esri/WebMap", "esri/layers/FeatureLayer","esri/widgets/LayerList","esri/widgets/BasemapGallery","esri/widgets/Search","esri/widgets/Search/SearchSource","esri/geometry/geometryEngine","esri/geometry/Point","esri/request","esri/Graphic"], (MapView, WebMap, FeatureLayer, LayerList, BasemapGallery, Search, SearchSource,geometryEngine,Point,esriRequest,Graphic) => {
  /************************************************************
   * Creates a new WebMap instance. A WebMap must reference
   * a PortalItem ID that represents a WebMap saved to
   * arcgis.com or an on-premise portal.
   *
   * To load a WebMap from an on-premise portal, set the portal
   * url with esriConfig.portalUrl.
   ************************************************************/

  
  const webmap = new WebMap({
    portalItem: {
      // autocasts as new PortalItem()
      id: "e21ce13ffd7e4dae82ca971ece0e4c9c"
    }
  });
  // An open data address search API for world wide locations
  const url = "https://photon.komoot.io/api/";
  /************************************************************
   * Set the WebMap instance to the map property in a MapView.
   ************************************************************/
  const view = new MapView({
    map: webmap,
    container: "viewDiv"
  });

  const basemaps = new BasemapGallery({
    view: view,
    container: "basemaps-container"
  });

  const layerList = new LayerList({ 
  view: view,
  selectionEnabled: true,
  container: "layers-container"
  });
  webmap.when(() => {
  const title = webmap.portalItem.title;
  document.getElementById("header-title").textContent = title;
  });
  /////////////Create feature layers for query////////////////////////
  const sceneLayer = new FeatureLayer({
    url:"https://services9.arcgis.com/6EuFgO4fLTqfNOhu/arcgis/rest/services/Trip_Organizer_cvl5846_pennstate/FeatureServer/0",
    definitionExpression: "1=0"
  });
  const stopLayer = new FeatureLayer({
    url:"https://services9.arcgis.com/6EuFgO4fLTqfNOhu/arcgis/rest/services/Trip_Organizer_cvl5846_pennstate/FeatureServer/1",
    definitionExpression: "1=0"
  });
  const routeLayer = new FeatureLayer({
    url:"https://services9.arcgis.com/6EuFgO4fLTqfNOhu/arcgis/rest/services/Trip_Organizer_cvl5846_pennstate/FeatureServer/7",
    definitionExpression: "1=0"
  });
  webmap.addMany([sceneLayer,stopLayer,routeLayer]);
///////////////feature layers for search source////////////////////////
  const featureLayerScene = new FeatureLayer({
    url:"https://services9.arcgis.com/6EuFgO4fLTqfNOhu/arcgis/rest/services/Trip_Organizer_cvl5846_pennstate/FeatureServer/0",
    popupTemplate: {
      title: "{Location}",
      overwriteActions: true,}
  });
  const featureLayerStop = new FeatureLayer({
    url:"https://services9.arcgis.com/6EuFgO4fLTqfNOhu/arcgis/rest/services/Trip_Organizer_cvl5846_pennstate/FeatureServer/1",
    popupTemplate: {
      title: "{StationNam}",
      overwriteActions: true,
    }
  });
  // /////////////////////////////////////
  let activeWidget;

  const handleActionBarClick = (event) => {
  const target = event.target; 
  if (target.tagName !== "CALCITE-ACTION") {
  return;
  }

  if (activeWidget) {
  document.querySelector(`[data-action-id=${activeWidget}]`).active = false;
  document.querySelector(`[data-panel-id=${activeWidget}]`).hidden = true;
  }

  const nextWidget = target.dataset.actionId;
  if (nextWidget !== activeWidget) {
  document.querySelector(`[data-action-id=${nextWidget}]`).active = true;
  document.querySelector(`[data-panel-id=${nextWidget}]`).hidden = false;
  activeWidget = nextWidget;
  } else {
  activeWidget = null;
  }
  };
  document.querySelector("calcite-action-bar").addEventListener("click", handleActionBarClick);

  //Custom Search Source from Photon Geocoding Service
  const customSearchSource = new SearchSource({
    name: "Photon Geocoding Service",
    placeholder: "example: Nijo Castle",
    // Provide a getSuggestions method
    // to provide suggestions to the Search widget
    getSuggestions: (params) => {
      // You can request data from a
      // third-party source to find some
      // suggestions with provided suggestTerm
      // the user types in the Search widget
      return esriRequest(url, {
        query: {
          q: params.suggestTerm.replace(/ /g, "+"),
          limit: 6,
          lat: view.center.latitude,
          lon: view.center.longitude
        },
        responseType: "json"
      }).then((results) => {
        // Return Suggestion results to display
        // in the Search widget
        return results.data.features.map((feature) => {
          return {
            key: "name",
            text: feature.properties.name,
            sourceIndex: params.sourceIndex
          };
        });
      }).catch((error) => {
        console.error("Error fetching suggestions:", error);
        return [];
      });
    },
    // Provide a getResults method to find
    // results from the suggestions
    getResults: (params) => {
      let query = {};
      // You can perform a different query if a location
      // is provided
      if (params.location) {
        query.lat = params.location.latitude;
        query.lon = params.location.longitude;
      } else {
        query.q = params.suggestResult.text.replace(/ /g, "+");
        query.limit = 6;
      }
      return esriRequest(url, {
        query: query,
        responseType: "json"
      }).then((results) => {
        // Parse the results of your custom search
        const searchResults = results.data.features.map((feature) => {
          // Create a Graphic the Search widget can display
          const graphic = new Graphic({
            geometry: new Point({
              x: feature.geometry.coordinates[0],
              y: feature.geometry.coordinates[1]
            }),
            attributes: feature.properties
          });
          // Optionally, you can provide an extent for a point result, so the view can zoom to it
          const buffer = geometryEngine.geodesicBuffer(
            graphic.geometry,
            100,
            "meters"
          );
          return {
            name: feature.properties.name,
            extent: buffer.extent,
            feature: graphic
          };
        });
        return searchResults;
      }).catch((error) => {
        console.error("Error fetching results:", error);
        return [];
      });
    }
  });

  const searchWidget = new Search({
    view: view,
    allPlaceholder:"Search for a location, station or site name",
    includeDefaultSources: false,
    sources:[
      {
        layer: featureLayerScene,
        searchFields: ["Location"],
        displayField: "Location",
        exactMatch: false,
        outField:["Location", "Category","Date"],
        name:"Scene",
        placeholder:"example: Hotel Tomiya",
      },
      {
        layer: featureLayerStop,
        searchFields: ["StationNam"],
        displayField: "StationNam",
        exactMatch: false,
        outField:["StationNam","Date"],
        name:"Stop",
        placeholder:"example: Kyoto Station",
      },
      customSearchSource
    ]
  });
  view.ui.add(searchWidget, {
    position: "manual"
  });

  setDates();
  document.getElementById("getTripButton").addEventListener("click", getTrip);

  function setDates(){
    let today = new Date();
    let pastDate = new Date();
    pastDate.setDate(pastDate.getDate()-400);
    let dtFromBox = document.getElementById("dateFrom");
    dtFromBox.value = pastDate;
    dtFromBox.min = pastDate;
    let dtToBox = document.getElementById("dateTo");
    dtToBox.value = today;
    dtToBox.min = pastDate;
  }

  function getTrip(){
    const noticeEl = document.getElementById("notice");
    noticeEl.open = "false";
      // Hide the WebMap's portal item layers
      // if (webmap.layers.length > 0) {
      //   const topLayer = webmap.layers.getItemAt(3);
      //   console.log(topLayer.title);
      //   topLayer.visible = false;
      // }
    const topLayer = webmap.layers.getItemAt(3);
    sceneLayer.definitionExpression = "1=0";
    stopLayer.definitionExpression = "1=0";
    routeLayer.definitionExpression = "1=0";
    const startDate = document.getElementById("dateFrom").value;
    const endDate = document.getElementById("dateTo").value;
    view.map.reorder(sceneLayer, 3);
    view.map.reorder(stopLayer, 2);
    view.map.reorder(routeLayer, 1);
    view.map.reorder(topLayer, 0);
    sceneLayer.definitionExpression = "Date >= DATE'"+startDate + "'AND Date <= DATE'"+endDate+"'";
    stopLayer.definitionExpression = "Date >= DATE'"+startDate + "'AND Date <= DATE'"+endDate+"'";
    routeLayer.definitionExpression = "Date >= DATE'"+startDate + "'AND Date <= DATE'"+endDate+"'";


    routeLayer.queryFeatureCount().then(function(numFeatures){
      document.getElementById("tripCount").innerHTML = "Fount " + numFeatures + " trip routes in the selected period. Please turn off the 'Trip Organizer cvl5846_pennstate' layer from the laylist on the left to see the results.";
      if (numFeatures > 0){
        noticeEl.icon = "thumbs-up";
      }else{
        noticeEl.icon = "thumbs-down";
      }
      noticeEl.open = "true";
    }).catch(function(error) {
      console.error("Error querying feature count: ", error);
    });
  }

});
