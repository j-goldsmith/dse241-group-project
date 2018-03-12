var h1b = {};

h1b.dataMunger = function(){
    var data, filters,geo;

    var contexts = {
        state:{
            dataId:'WORKSITE_STATE',
            geoId:'iso_3166_2',
            filter: function(data){
                return data;
            },
            matchToGeo:function(f){
                var comparison = function(d){
                    var geoState = f.properties[contexts[filters.mapContext].geoId];
                    var dataState = d.indexValue;
                    var c = geoState
                        && dataState
                        && geoState == dataState;

                    return c;
                };

                return comparison;
            }
        },
        county:{
            dataId:'WORKSITE_COUNTY',
            geoId:'name',
            filter: function(data){
                return _.filter(data, function(d){
                    return d[contexts.state.dataId] == filters.selectedMapRegion;
                });
            },
            matchToGeo:function(f){
                var comparison = function(d){
                    var geoState = f.properties[contexts.state.geoId];
                    var geoCounty = f.properties[contexts[filters.mapContext].geoId];
                    var dataCounty = d.indexValue;
                    var selectedState  = filters.selectedMapRegion;
                    var c = geoState
                        && geoCounty
                        && dataCounty
                        && selectedState
                        && geoState == selectedState
                        && (
                            dataCounty.toLowerCase() == geoCounty.toLowerCase()
                            || dataCounty.toLowerCase().replace('county','') == geoCounty.toLowerCase()
                            || dataCounty.toLowerCase()+' county' == geoCounty.toLowerCase()
                        );

                    return c;
                };

                return comparison;
            },
            filterGeo:function(f){
                return f.properties[contexts.state.geoId] == filters.selectedMapRegion;
            }
        },
        zip:{
            dataId:'WORKSITE_POSTAL_CODE',
            geoId:'zip',
            filter: function(data){
                return _.filter(data, function(d){
                    return d[contexts.state.dataId] == filters.selectedMapRegion;
                });
            },
            matchToGeo: function(f){
                var comparison = function(d){
                    var geoState = f.properties.state;
                    var geoZip = f.properties.zip;
                    var dataZip = d.indexValue;
                    var selectedState  = filters.selectedMapRegion;
                    var c = geoState
                        && geoZip
                        && dataZip
                        && selectedState
                        && geoState == selectedState
                        && dataZip == geoZip;

                    return c;
                };

                return comparison;
            },
            filterGeo:function(f){
                return f.properties.state == filters.selectedMapRegion;
            }
        }
    };

    function topoToGeoJson(d, context){
        return topojson.feature(
            d[context],
            d[context].objects[context]
        );
    }

    function countByCol(col){
        var filteredData = contexts[filters.mapContext].filter(data);

        var groups = _.groupBy(filteredData, col);
        var transformedGroups = _.map(groups, function(g, colVal){
            return {
                indexValue: colVal,
                indexName: col,
                totalCount: g.length
            }
        });
        return transformedGroups;
    }

    function filterGeo(){
        if(!filters.selectedMapRegion) {
            return geo[filters.mapContext];
        }
        else{
            var contextGeo = _.clone(geo[filters.mapContext]);
            contextGeo.features = _.filter(geo[filters.mapContext].features, contexts[filters.mapContext].filterGeo);
            return contextGeo;
        }
    }

    function aggregateForMap(){
        var groupCol = contexts[filters.mapContext].dataId;
        var aggregatedData = countByCol(groupCol);
        var filteredGeo = filterGeo();
        var results = [];

        filteredGeo.features.forEach(function(f){
            var geoData = _.find(
                aggregatedData,
                contexts[filters.mapContext].matchToGeo(f)
            );
            if(!geoData){
                f.properties.totalCount = 0;
            } else {
                f.properties = geoData;
            }
        });

        return filteredGeo;
    }

    function constructor(d, f){
        data = _.map(d['h1b'], function(e){
            Object.keys(e).forEach(function(key) {
                if(key.indexOf('DATE') > -1 || key =='CASE_SUBMITTED'){
                    e[key] = moment(e[key]);
                }
            });

            return e;
        });
        geo = {
            state: topoToGeoJson(d['geo'],'state'),
            county: topoToGeoJson(d['geo'],'county'),
            zip: topoToGeoJson(d['geo'],'zip')
        };
        filters = f;

        return constructor;
    }

    constructor.aggregateForMap = aggregateForMap;
    constructor.geo = topoToGeoJson;
    constructor.aggregateByCol = countByCol;
    constructor.extent = function(col){
        return d3.extent(_.pluck(data, col));
    };
    constructor.filtered = function(){
        return data;
    };

    return constructor;
}();

h1b.title = function(){
    var container, data;

    var dimensions = {
        width:0,
        height:0
    };

    var colors = {

    };

    var filters = {

    };

    var scales = {

    };

    function draw(){

    }

    function constructor(selection){
        selection.each(function (d, i) {
            data = d;
            container = d3.select(this);
            draw();
        });
    }

    constructor.dimensions = function (value) {
        if (!arguments.length) return dimensions;
        dimensions = value;
        return constructor;
    };
    constructor.colors = function (value) {
        if (!arguments.length) return colors;
        colors = value;
        return constructor;
    };
    constructor.filters = function (value) {
        if (!arguments.length) return filters;
        filters = value;
        return constructor;
    };
    constructor.scales = function (value) {
        if (!arguments.length) return scales;
        scales = value;
        return constructor;
    };

    return constructor;
};

h1b.map = function(){
    var container, data;

    var dimensions = {
        width:0,
        height:0,
        parentWidth:0,
        parentHeight:0
    };

    var colors = {

    };

    var filters = {

    };

    var scales = {
        values:d3.scaleQuantize(),
    };

    var _onUpdateCallbacks = [];

    function onUpdate(){
        //handles callbacks

        //then
        draw();
    }

    function _calcMapBounds(filteredData){
        var center = d3.geoCentroid(filteredData);
        var scale  = (dimensions.width - 20) * .8;
        var offset = [(dimensions.width - 20)/2, (dimensions.height - 20)/2];
        var projection = d3.geoMercator().scale(scale).center(center)
            .translate(offset);

        // create the path
        var path = d3.geoPath().projection(projection);

        // using the path determine the bounds of the current map and use
        // these to determine better values for the scale and translation
        var bounds  = path.bounds(filteredData);
        var hscale  = scale*dimensions.width  / (bounds[1][0] - bounds[0][0]);
        var vscale  = scale*dimensions.height / (bounds[1][1] - bounds[0][1]);
        var scale   = (hscale < vscale) ? hscale : vscale;
        var offset  = [dimensions.width - (bounds[0][0] + bounds[1][0])/2,
            dimensions.height - (bounds[0][1] + bounds[1][1])/2];

        return {
            bounds:bounds,
            scale:scale,
            offset:offset,
            center:center
        };
    }

    function draw(){
        var aggregatedData = data.aggregateForMap();
        var valueExtent = d3.extent(_.map(aggregatedData.features,function(d){return d.properties.totalCount;}));
        var mapBounds = _calcMapBounds(aggregatedData);

        container.attr('width',dimensions.width);
        container.attr('height',dimensions.height);

        scales.values
            .domain(valueExtent)
            .range(colors.secondary.slice(1));

        var geoProjection = d3.geoMercator()
            .scale(mapBounds.scale)
            .center(mapBounds.center)
            .translate(mapBounds.offset);
        var geoPath = d3.geoPath()
            .projection(geoProjection);


        container.select('g.contextPaths')
            .selectAll("path").remove();
        var p = container.select('g.contextPaths')
            .selectAll("path").data(aggregatedData.features);

        p.enter()
            .append("path")
            .style('stroke', '#f7f7f7')
            .style('stroke-width', 0.3)
            .merge(p)
            .attr("d", geoPath)
            .on('click',function(d){
                if(filters.mapContext == 'state'){
                    filters.mapContext = 'county';
                    filters.selectedMapRegion = d.properties.indexValue;
                }
                else if ( filters.mapContext == 'county'){
                    filters.mapContext = 'zip'
                }


                onUpdate();
            })
            .attr('fill', function(d){
                return d.properties.totalCount
                    ? scales.values(d.properties.totalCount)
                    : colors.secondary[0];
            });

        p.exit().remove();

        container.call(
            d3.zoom()
                .scaleExtent([1, 8])
                .on("zoom", function () {
                    container.select('g.contextPaths').attr("transform", d3.event.transform);
                })
        );

    }

    function constructor(selection){
        selection.each(function (d, i) {
            data = h1b.dataMunger(d,filters);
            container = d3.select(this);
            draw();
        });
    }

    constructor.dimensions = function (value) {
        if (!arguments.length) return dimensions;
        dimensions.parentHeight = value.height;
        dimensions.parentWidth = value.width;

        dimensions.width = value.width * (2/3);
        dimensions.height = value.height * (7/10);

        return constructor;
    };
    constructor.colors = function (value) {
        if (!arguments.length) return colors;
        colors = value;
        return constructor;
    };
    constructor.filters = function (value) {
        if (!arguments.length) return filters;
        filters = value;
        return constructor;
    };
    constructor.scales = function (value) {
        if (!arguments.length) return scales;
        scales = value;
        return constructor;
    };
    constructor.onUpdate = function (value) {
        if (!arguments.length) return onUpdate;
        _onUpdateCallbacks = value;
        return constructor;
    };

    return constructor;
};

h1b.details = function(){
    var container, data;

    var dimensions = {
        width:0,
        height:0
    };

    var colors = {

    };

    var filters = {

    };

    var scales = {

    };

    function draw(){

    }

    function constructor(selection){
        selection.each(function (d, i) {
            data = d;
            container = d3.select(this);
            draw();
        });
    }

    constructor.dimensions = function (value) {
        if (!arguments.length) return dimensions;
        dimensions = value;
        return constructor;
    };
    constructor.colors = function (value) {
        if (!arguments.length) return colors;
        colors = value;
        return constructor;
    };
    constructor.filters = function (value) {
        if (!arguments.length) return filters;
        filters = value;
        return constructor;
    };
    constructor.scales = function (value) {
        if (!arguments.length) return scales;
        scales = value;
        return constructor;
    };

    return constructor;
};

h1b.display = function(){
    var container, data;

    var dimensions = {
        width:0,
        height:0
    };

    var colors = {
        primary:[
            '#7AB793',
            '#4C996B',
            '#297A4A',
            '#0F5C2E',
            '#003D19'
        ],
        secondary:[
            '#827FB2',
            '#595494',
            '#373276',
            '#1E1959',
            '#0C083B'
        ],
        tertiary:[
            '#FFECAA',
            '#D4BC6A',
            '#AA9039',
            '#806715',
            '#554200'
        ],
        quaternary:[
            '#FFBAAA',
            '#D47F6A',
            '#AA4E39',
            '#802A15',
            '#551000'
        ],
        blackWhite:[]
    };

    var filters = {
        mapContext:'state',
        selectedMapRegion:null
    };

    var scales = {

    };

    var components = {
        title: this.title(),
        map: this.map(),
        details: this.details()
    };

    function draw(){
        container.attr('width',dimensions.width);
        container.attr('height',dimensions.height);

        components.title
            .dimensions(dimensions)
            .filters(filters)
            .colors(colors);

        components.map
            .dimensions(dimensions)
            .filters(filters)
            .colors(colors)
            .onUpdate([components.details.draw]);

        components.details
            .dimensions(dimensions)
            .filters(filters)
            .colors(colors);

        container.select('.title')
            .call(components.title);
        container.select('.map')
            .call(components.map);
        container.select('.details')
            .call(components.details);
    }

    function constructor(selection){
        selection.each(function (d, i) {
            data = d;
            container = d3.select(this);
            draw();
        });
    }

    constructor.dimensions = function (value) {
        if (!arguments.length) return dimensions;
        dimensions = value;
        return constructor;
    };
    constructor.colors = function (value) {
        if (!arguments.length) return colors;
        colors = value;
        return constructor;
    };
    constructor.filters = function (value) {
        if (!arguments.length) return filters;
        filters = value;
        return constructor;
    };
    constructor.scales = function (value) {
        if (!arguments.length) return scales;
        scales = value;
        return constructor;
    };

    return constructor;
};