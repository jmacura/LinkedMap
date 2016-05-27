/* JavaScript Document */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* @author: jmacura 2015–2016 */

// global variables
var controller = L.control.layers(null, null); //control pane for layers, empty when started
var layerList = [false, false, false]; //this list ensures that every layer will exists only once

// This serves for some candy-eye effects in the main page
function aboutHider() {
	var objs = document.getElementsByClassName("hidden");
	for(var i = 0; i < objs.length; i++) {
		objs[i].style.display = (objs[i].style.display == "inline") ? "none" : "inline";
	}
}

// Currently unused
function onMapClick(e) {
	alert("You clicked the map at " + e.latlng);
}

// **** This is the AROUND query ****
function getList(target) {
	if(layerList[0]) {alert('Layer already exists'); return;}
	$.getJSON(target + '&callback=?', function(data) { //jQuery function
		var d = data.props[625]; //only property P625 (geographic coordinates) is interesting here
		//console.log(d);
		var wd_layer = L.featureGroup(null);
		for(var i = 0; i < d.length; i++) { //for each item found create a pin-like marker and add it to separate layer
			var coords = d[i][2].split("|"); //the coordinates are written in form latitude|longitude
			var mark = L.marker([coords[0],coords[1]]);
			wd_layer.addLayer(mark);
		}
		wd_layer.addTo(map); //add the layer of all newly created markers to the map window
		controller.addOverlay(wd_layer, "Items around given coordinates");
		map.setView([49.77, 13.38], 12); //zoom the map window to the center of points
		layerList[0] = true; //prevent creating the layer more than once
	});
}

// **** This is binded with AROUND query ****
/* If the user confirms the content of the query, the getList() function is called */
function aroundQuery() {
	if (confirm("Bude odeslán následující dotaz:\r\n\r\nAROUND[49.7462414,13.3778353,2]")) {
		getList("https://wdq.wmflabs.org/api?q=around%5B625,49.7462414,13.3778353,2%5D&props=625");
	}
}

// Error logging
function doShit() {
	console.log("Operation was not successful from unknown reason.");
}

// **** Background support for displaying info ****
function showInfo(e) { //e is the event, which called this function
	var feature = e.target;
	var infoBlock = document.getElementById("info-block");
	//parsing values for info-block
	var attrs = feature.name.split('|');
	var ls, r, d, l, t;
	//1st line
	ls = document.createElement("TABLE");
	r = document.createElement("TR");
	d = document.createElement("TD");
	t = document.createTextNode( (attrs[0] == "wd") ? "Mayor:" : "Laureate name");
	d.appendChild(t); r.appendChild(d);
	d = document.createElement("TD");
	t = document.createTextNode(attrs[1]);
	if (attrs[2] != "null") { //if the link to Wikipedia article about the person was retieved then create a link element
		l = document.createElement("A");
		l.setAttribute("href", (attrs[0] == "dbp") ? attrs[2].split('?')[0] : attrs[2]); //DBpedia provides permanent links to older versions of article, which are extended with the '?oldid=nnn'
		l.setAttribute("target", "_blank");
		l.appendChild(t); d.appendChild(l);
	}
	else {d.appendChild(t);}
	r.appendChild(d); ls.appendChild(r);
	//2nd line
	if (attrs[0] == "wd") { //only add another line, if the marker is about mayor
		r = document.createElement("TR");
		d = document.createElement("TD");
		t = document.createTextNode("City:");
		d.appendChild(t); r.appendChild(d);
		d = document.createElement("TD");
		t = document.createTextNode(attrs[3]);
		if (attrs[4] != "null") {//if the link to Wikipedia article of the city was retrieved then create a link element
			l = document.createElement("A"); l.setAttribute("href", attrs[4]); l.setAttribute("target", "_blank");
			l.appendChild(t); d.appendChild(l);
		}
		else {d.appendChild(t);}
		r.appendChild(d); ls.appendChild(r);
	}
	while(infoBlock.hasChildNodes()) { //remove existing information
		infoBlock.removeChild(infoBlock.firstChild);
	}
	infoBlock.appendChild(ls);
}

// **** this is for query female mayors from WikidataQuery Service****
function wdQuery() {
	if(layerList[1]) {alert('Layer already exists'); return;}
	var cities_layer = L.featureGroup(null);
	var url = "https://query.wikidata.org/sparql";
	var query =
		'PREFIX wikibase: <http://wikiba.se/ontology#>\n' +
		'PREFIX : <http://www.wikidata.org/entity/>\n' +
		'PREFIX wdt: <http://www.wikidata.org/prop/direct/>\n' +
		'PREFIX p: <http://www.wikidata.org/prop/>\n' +
		'PREFIX ps: <http://www.wikidata.org/prop/statement/>\n' +
		'PREFIX psv: <http://www.wikidata.org/prop/statement/value/>\n' +
		'PREFIX pq: <http://www.wikidata.org/prop/qualifier/>\n' +
		'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n' +
		'SELECT DISTINCT ?lat ?lon ?citylabel ?cityarticle ?mayorlabel ?mayorarticle WHERE {\n' +
		'?city wdt:P31/wdt:P279* :Q515 . # instanceOf city or something that is a subclass of city\n' +
		'?city p:P6 ?statement . # headOfGovernment statement \n' +
		'?statement ps:P6 ?mayor . # the value of statement\n' +
		'?mayor wdt:P21 :Q6581072 . # the sexOrGender of the mayor is female\n' +
		'FILTER NOT EXISTS { ?statement pq:P582 ?x } # there is no endDate qualifier\n' +
		'?city p:P625/psv:P625 ?coords_value . # coordinates value for city\n' +
		'?coords_value wikibase:geoLatitude ?lat .\n' +
		'?coords_value wikibase:geoLongitude ?lon .\n' +
		'OPTIONAL { # optionally find English label(s) for each city\n' +
			'?city rdfs:label ?citylabel .\n' +
			'FILTER ( LANG(?citylabel) = \"en\" )\n' +
		'} OPTIONAL {# optionally find Wikipedia article for each city\n' +
			'?cityarticle schema:about ?city;\n' +
			'schema:isPartOf <https://en.wikipedia.org/> .\n' +
		'} OPTIONAL {# optionally find English label(s) for each mayor\n' +
			'?mayor rdfs:label ?mayorlabel .\n' +
			'FILTER ( LANG(?mayorlabel) = \"en\" )\n' +
		'} OPTIONAL {# optionally find Wikipedia article for each mayor\n' +
			'?mayorarticle schema:about ?mayor;\n' +
			'schema:isPartOf <https://en.wikipedia.org/> .\n' +
		'}}';
	console.log(query); //show the SPARQL query in the console
	var queryUrl = url+"?query="+encodeURIComponent(query)+"&format=json";
	$.ajax({ //jQuery function, slightly more complex than getJSON()
		dataType: "json",
		url: queryUrl,
		success: function(data, stat) { //this function will be called after successful end of AJAX request
			//console.log(data);
			var results = data.results.bindings;
			for (var i = 0; i < results.length; i++) { //create a pretty marker for each retrieved pair of coordinates
				var mark = L.circleMarker([results[i].lat.value, results[i].lon.value], {radius: 7});
				var ml = results[i].mayorlabel ? results[i].mayorlabel.value : 'n/a';
				var ma = results[i].mayorarticle ? results[i].mayorarticle.value : null;
				var cl = results[i].citylabel ? results[i].citylabel.value : 'n/a';
				var ca = results[i].cityarticle ? results[i].cityarticle.value : null;
				mark.name = 'wd|' + ml + '|' + ma + '|' + cl + '|' + ca; //all retieved info is stored in the name of the marker for future use
				mark.on('click', showInfo); // this binds an onClick event handler for each marker, so the info can be shown to the user
				cities_layer.addLayer(mark);
			}
			cities_layer.addTo(map);
			controller.addOverlay(cities_layer, "Cities with female mayor");
			map.setView([30, 0], 2); //zoom out the map window to the whole world
			layerList[1] = true; //prevent creating this layer more than once
		},
		error: function(jqXHR, status, error) { //if something fails, log what is wrong
			console.log("status: ", status, " error: ", error);
		}
	}).fail(doShit);
}

// **** this is for query Nobel prize laureates from DBpedia SPARQL endpoint****
function dbpQuery() {
	if(layerList[2]) {alert('Layer already exists'); return;}
	var birthplace_layer = L.featureGroup(null);
	var url = "http://dbpedia.org/sparql";
	var query =
		'SELECT ?author SAMPLE(?lat) AS ?lat SAMPLE(?lon) AS ?lon SAMPLE(?wp) AS ?authorarticle SAMPLE(?name) AS ?authorname WHERE {\n' +
		'?author a dbo:Person . # firstly select persons (we do not want institutions here)\n' +
		'?author dct:subject ?any . # then look what classes they belong into ...\n' +
		'?any skos:broader+ dbc:Nobel_laureates . # ... and choose NobelLaureates or their subclasses\n' +
		'?author dbo:birthPlace ?place . # get the birtplace for each person\n' +
		'?place geo:lat ?lat . # latitude of birthplace\n' +
		'?place geo:long ?lon . # longitude of birthplace\n' +
		'OPTIONAL { # optionally find the Wikipedia article connected with each person\n' +
			'?author prov:wasDerivedFrom ?wp .\n' +
		'} OPTIONAL { # optionally find the English label(s) for each person\n' +
			'?author dbp:name ?name\n' +
			'FILTER ( LANG(?name) = "en" ) .\n' +
		'}} GROUP BY (?author)';
	console.log(query);
	var queryUrl = url+"?query="+encodeURIComponent(query)+"&format=json&callback=?";
	$.ajax({ //jQuery function, slightly more complex than getJSON()
		dataType: "json",
		url: queryUrl,
		success: function(data, stat) { //this function will be called after successful end of AJAX request
			//console.log(data);
			var results = data.results.bindings;
			for (var i = 0; i < results.length; i++) { //create a pretty marker for each retrieved pair of coordinates
				var mark = L.circleMarker([results[i].lat.value, results[i].lon.value], {radius: 7, color: 'rgb(0, 163, 61)'});
				var name = results[i].authorname ? results[i].authorname.value : 'n/a';
				var link = results[i].authorarticle ? results[i].authorarticle.value : null;
				mark.name = 'dbp|' + name + '|' + link; //all retieved info is stored in the name of the marker for future use
				mark.on('click', showInfo); // this binds an onClick event handler for each marker, so the info can be shown to the user
				birthplace_layer.addLayer(mark);
			}
			birthplace_layer.addTo(map);
			controller.addOverlay(birthplace_layer, "Birthplaces of Nobel laureates");
			map.setView([30, 0], 2); //zoom out the map window to the whole world
			layerList[2] = true; //prevent creating this layer more than once
		},
		error: function(jqXHR, status, error) { // if something fails, log what is wrong
			console.log("status: ", status, " error: ", error);
		}
	}).fail(doShit);
}


function showAnotherInfo(e) {
	console.log(e.target);
}
