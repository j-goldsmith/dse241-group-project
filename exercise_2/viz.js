'use strict';
function filter(){
    var rootElement, countryElement, genderElement, medalElement, yearElement;
    var drilldown;

    var options = {
        selectedCountries:[],
        selectedGenders:['Male','Female'],
        selectedMedalTypes:['Gold', 'Silver', 'Bronze'],
        selectedYears:[1926,2006]
    };

    function init(parent){
        rootElement = d3.select(parent).append('div');
        countryElement = rootElement.append('ul')
            .attr('class','countries list-group')
    }

    function render(){
        if(!rootElement){
            return;
        }

        countryElement.selectAll('li').remove();
        var liEntered = countryElement.selectAll('li')
            .data(options.selectedCountries)
            .enter().append('li')
            .attr('class','list-group-item');

        liEntered.append('button')
            .attr('class','close float-left')
            .append('span')
                .html('&times;');

        liEntered.append('span')
            .attr('class','float-left')
            .text(function (d) {
                return d;
            });
    }

    function refresh(){
        render();
        if(drilldown) {
            drilldown.refresh(options);
        }
    }

    function _filter(selection){
        selection.each(function(data, i){
            if(!rootElement){
                init(this);
            }
            render();
        })
    }

    _filter.selectedCountries = function(value){
        if (!arguments.length) return options.selectedCountries;
        options.selectedCountries = value;
        refresh()
        return _filter;
    };

    _filter.selectCountry = function(value){
        if(options.selectedCountries.indexOf(value) < 0) {
            options.selectedCountries.push(value);
            refresh();
        } else{
            _filter.deselectCountry(value);
            refresh();
        }

        return _filter;
    };

    _filter.deselectCountry = function(value){
        var i = options.selectedCountries.indexOf(value);
        if(i > -1) {
            options.selectedCountries.splice(i, 1);
            refresh();
        }

        return _filter;
    };

    _filter.setDrilldown = function(value){
        drilldown = value;
        drilldown.refresh(options);

        return _filter;
    };
    return _filter;
}

function map() {
    var rootElement, countryGroupElement;
    var currentData, filter;

    var width = 960,
        height = 500,
        projection = d3.geoMercator()
            .scale(150)
            .translate([width / 2, height / 2]),
        zoomScale = (width - 1) / 2 / Math.PI,
        colorScale = d3.scaleLinear()
            .domain([0, 300])
            .range(["#f7f7f7", "#252525"]);


    function init(parent){
        rootElement = d3.select(parent)
            .append('svg')
            .attr('class','map');

        countryGroupElement = rootElement
            .append('g')
            .attr('class','countries');

        rootElement.call(
            d3.zoom()
                .scaleExtent([1, 8])
                .on("zoom", function(){
                    countryGroupElement.attr("transform", d3.event.transform);
                })
        );
    }

    function render(){
        var geoPath = d3.geoPath().projection(projection);

        countryGroupElement
            .attr("class", "countries")
            .selectAll("path")
            .data(currentData.atlas.features)
            .enter().append("path")
            .attr("d", geoPath)
            .style("fill", function(d) {
                var countryStats = _.find(currentData.medalCounts,{'country':d.properties.name});
                var medalCount = countryStats ? countryStats['count'] : 0

                return colorScale(medalCount);
            })
            .style('stroke', '#f7f7f7')
            .style('stroke-width', 0.3)
            .on('mouseover',function(d){
                d3.select(this)
                    .style("opacity", .8)
                    .style("stroke","#252525");
            })
            .on('mouseout', function(d){
                d3.select(this)
                    .style("opacity", 1)
                    .style("stroke","#f7f7f7")
                    .style("stroke-width",0.3);
            })
            .on('click', function(d){
                if(filter) {
                    filter.selectCountry(d.properties.name);
                }
            });

        /* .on("click", function(d){
         var bounds = path.bounds(d),
         dx = bounds[1][0] - bounds[0][0],
         dy = bounds[1][1] - bounds[0][1],
         x = (bounds[0][0] + bounds[1][0]),
         y = (bounds[0][1] + bounds[1][1]),
         scale = Math.max(1, Math.min(8, 1 / Math.max(dx / width, dy / height))),
         translate = [width - scale * x, height - scale * y];

         svg.transition()
         .duration(750)
         .call(
         zoom.transform,
         d3.zoomIdentity
         .translate(translate[0],translate[1])
         .scale(scale) ); // updated for d3 v4
         })*/

        rootElement.append("path")
            .datum(topojson.mesh(currentData.atlas.features, function(a, b) { return a.id !== b.id; }))
            .attr("class", "names")
            .attr("d", geoPath);
    }

    function _map(selection) {
        selection.each(function(data,i){
            if(!rootElement){
                init(this);
            }
            currentData = data;
            render();
        });
    }

    _map.setFilter = function(value){
        filter = value;
        return _map;
    }
    _map.colorScale = function(value){
        if (!arguments.length) return colorScale;
        colorScale = value;
        return _map;
    }

    return _map;
}

function drilldown() {
    var rootElement;
    function init(parent){
        rootElement = d3.select(parent).append('div');
    }
    function _drilldown(selection) {
        selection.each(function(data,i) {
            if(!rootElement){
                init(this);
            }
        });
    }

    _drilldown.refresh = function(filterOptions){
        if(rootElement) {

        }

        return _drilldown;
    };

    return _drilldown;
}

function viz() {
    var selectedCountries = [];
    var width = 960,
        height = 500;
    var rootElement;
    var medalCountColor = d3.scaleLinear()
        .domain([0, 350])
        .range(["#f7f7f7", "#252525"]);

    function _viz(selection) {
        selection.each(function (data, i) {
            rootElement = d3.select(this);

            var filterInstance = filter()
                .selectedCountries(selectedCountries);;
            var drilldownInstance = drilldown();
            var mapInstance = map()
                .colorScale(medalCountColor);

            rootElement.call(mapInstance);
            rootElement.call(filterInstance);
            rootElement.call(drilldownInstance);

            filterInstance.setDrilldown(drilldownInstance);
            mapInstance.setFilter(filterInstance);
        });
    }

    _viz.selectedCountries = function(value){
        if (!arguments.length) return selectedCountries;
        selectedCountries = value;
        return _viz;
    };
    _viz.width = function(value){
        if (!arguments.length) return width;
        width = value;
        return _viz;
    };
    _viz.height = function(value){
        if (!arguments.length) return height;
        height = value;
        return _viz;
    };

    return _viz;
}