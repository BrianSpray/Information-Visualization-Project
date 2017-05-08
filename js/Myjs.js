//Init Map
//*******************************************************************************************************************************************************
var lat = 41.141376;
var lng = -8.613999;
var zoom = 14;

// add an OpenStreetMap tile layer
var mbAttr = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
    'Imagery © <a href="http://mapbox.com">Mapbox</a>',
    mbUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoicGxhbmVtYWQiLCJhIjoiemdYSVVLRSJ9.g3lbg_eN0kztmsfIPxa9MQ';




var grayscale = L.tileLayer(mbUrl, {
        id: 'mapbox.light',
        attribution: mbAttr
    }),
    streets = L.tileLayer(mbUrl, {
        id: 'mapbox.streets',
        attribution: mbAttr
    });


var map = L.map('map', {
    center: [lat, lng], // Porto
    zoom: zoom,
    layers: [streets],
    zoomControl: true,
    fullscreenControl: true,
    fullscreenControlOptions: { // optional
        title: "Show me the fullscreen !",
        titleCancel: "Exit fullscreen mode",
        position: 'bottomright'
    }
});

var baseLayers = {
    "Grayscale": grayscale, // Grayscale tile layer
    "Streets": streets, // Streets tile layer
};

layerControl = L.control.layers(baseLayers, null, {
    position: 'bottomleft'
}).addTo(map);

// Initialise the FeatureGroup to store editable layers
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var featureGroup = L.featureGroup();

var drawControl = new L.Control.Draw({
    position: 'bottomright',
	collapsed: false,
    draw: {
        // Available Shapes in Draw box. To disable anyone of them just convert true to false
        polyline: false,
        polygon: false,
        circle: false,
        rectangle: true,
        marker: false,
    },
    edit: {
        featureGroup: drawnItems,
        //remove: true,
        //edit: true
    }

});
map.addControl(drawControl); // To add anything to map, add it to "drawControl"
//*******************************************************************************************************************************************************
//*****************************************************************************************************************************************
// Index Road Network by Using R-Tree
//*****************************************************************************************************************************************
var rt = cw(function(data,cb){
	var self = this;
	var request,_resp;
	importScripts("js/rtree.js");
	if(!self.rt){
		self.rt=RTree();
		request = new XMLHttpRequest();
		request.open("GET", data);
		request.onreadystatechange = function() {
			if (request.readyState === 4 && request.status === 200) {
				_resp=JSON.parse(request.responseText);
				self.rt.geoJSON(_resp);
				cb(true);
			}
		};
		request.send();
	}else{
		return self.rt.bbox(data);
	}
});

rt.data(cw.makeUrl("js/trips.json"));
//*****************************************************************************************************************************************
// Clear the Map.
//*****************************************************************************************************************************************	
function clearMap() {
    for (i in map._layers) {
        if (map._layers[i]._path != undefined) {
            try {
                map.removeLayer(map._layers[i]);
            } catch (e) {
                console.log("problem with " + e + map._layers[i]);
            }
        }
    }
}
//*****************************************************************************************************************************************
// Draw rectangle on Map Event for Query :
// Click the small box on Map and start drawing to do query.
//*****************************************************************************************************************************************	


map.on('draw:created', function (e) {
	
	clearMap();
	
	var type = e.layerType,
		layer = e.layer;
	
	if (type === 'rectangle') {
		var bounds=layer.getBounds();
		rt.data([[bounds.getSouthWest().lng,bounds.getSouthWest().lat],[bounds.getNorthEast().lng,bounds.getNorthEast().lat]]).
		then(function(d){var result = d.map(function(a) {return a.properties;});
		console.log(result);		// Trip Info: avspeed, distance, duration, endtime, maxspeed, minspeed, starttime, streetnames, taxiid, tripid
		DrawRS(result);
        barChart(result);
		});
	}
	drawnItems.addLayer(layer);			//Add your Selection to Map  
});




function barChart(e) {

    var margin =  {
        top: 20,
        right: 20,
        bottom: 50,
    left: 40
    }, 
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;


    var x = d3.scaleBand().rangeRound([0, width], .05).padding(0.1);

    var y = d3.scaleLinear().range([height, 0]);

    var xAxis = d3.axisBottom().scale(x).tickFormat(d3.timeFormat("%I:%M %p"));

    var yAxis = d3.axisLeft().scale(y).ticks(10);

    var svg = d3.select("#graph-display").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var hourParser = d3.isoParse; //d3.timeParse("%I:%M%p");

    /*e.forEach(function(d) {
        d.date = d3.timeHour.round(hourParser(d.starttime));
        d.avspeed = +d.avspeed;
        console.log("Start Time: " + timeFormatter(d3.timeHour.round(d.date)) + " AvSpeed: " + d.avspeed);
    });*/

    var dataset = d3.nest()
        .key(function (d) { return d3.timeHour.round(hourParser(d.starttime)); }).sortKeys(d3.ascending)
        .rollup(function (d) { return d3.mean(d, function (g) { return g.avspeed; }); })
        .entries(e);
        console.log(JSON.stringify(dataset));


    x.domain(dataset.map(function(d) { return new Date(d.key); }));
    y.domain([0, d3.max(dataset, function(d) { return d.value; })]);

   svg.selectAll(".bar")
    .data(dataset)
   .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function(d) { return x(new Date(d.key)); })
    .attr("width", x.bandwidth())
    .attr("y", function(d) { return y(d.value); })
    .attr("height", function(d) { return height - y(d.value); });

   svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", "-.55em")
      .attr("transform", "rotate(-45)" );

  // add the y Axis
    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Value");

}


//*****************************************************************************************************************************************
// DrawRS Function:
// Input is a list of Trip and the function draw these trips on Map based on their IDs
//*****************************************************************************************************************************************
function DrawRS(trips) {
    for (var j=0; j<trips.length; j++) {  // Check Number of Segments and go through all segments
        var TPT = new Array();              
        TPT = TArr[trips[j].tripid].split(',');           // Find each segment in TArr Dictionary. 
        var polyline = new L.Polyline([]).addTo(drawnItems);
        polyline.setStyle({
            color: 'red',                      // polyline color
            weight: 1,                         // polyline weight
            opacity: 0.5,                      // polyline opacity
            smoothFactor: 1.0  
        });
        for(var y = 0; y < TPT.length-1; y=y+2){    // Parse latlng for each segment
            polyline.addLatLng([parseFloat(TPT[y+1]), parseFloat(TPT[y])]);
        }
    }        
}