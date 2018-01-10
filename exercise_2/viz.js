'use strict';

function map() {
    var selectedCountries = [];

    function display(selection) {
        selection.each(function(data,i){
            var rootElement = d3.select(this);
            var projection = d3.geoMercator();
            var path = d3.geoPath().projection(projection);

            rootElement
                .append("g")
                .attr("class", "countries")
                .selectAll("path")
                .data(data.atlas.features)
                .enter().append("path")
                .attr("d", path)
               // .style("fill", function(d) { return color(populationById[d.id]); })
                .style('stroke', 'white')
                .style('stroke-width', 1.5)
                .style("opacity",0.8)


            rootElement.append("path")
                .datum(topojson.mesh(data.atlas.features, function(a, b) { return a.id !== b.id; }))
                .attr("class", "names")
                .attr("d", path);

        });
    }

    display.selectedCountries = function(value){
        if (!arguments.length) return selectedCountries;
        selectedCountries = value;
        return display;
    };

    return display;
}

function drilldown() {
    var selectedCountries = [];

    function display(selection) {
        selection.each(function(data,i) {
            d3.select(this)
                .append('text')
                .attr('x', 100)
                .attr('y', 100)
                .text('Drilldown Element');
        });
    }

    display.selectedCountries = function(value){
        if (!arguments.length) return selectedCountries;
        selectedCountries = value;
        return display;
    };

    return display;
}

function viz() {
    var selectedCountries = [];

    function display(selection) {
        selection.each(function (data, i) {
            var rootElement = d3.select(this);

            rootElement
                .append('svg')
                    .attr('class','map')
                .call(map().selectedCountries(selectedCountries));

            rootElement
                .append('svg')
                    .attr('class','map')
                .call(drilldown().selectedCountries(selectedCountries));
        });
    }

    display.selectedCountries = function(value){
        if (!arguments.length) return selectedCountries;
        selectedCountries = value;
        return display;
    };

    return display;
};