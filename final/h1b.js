var h1b = {};

h1b.dataMunger = function(){
    var data,filteredData, filteredForCompanies, filteredForJobs, filters,geo, wages, filteredWages;

    var mapMunged,companyMunged,jobMunged;

    var scales = {
        jobCount:d3.scaleLog(),
        wages:d3.scaleLinear(),
        jobCountColor:d3.scaleThreshold(),
        wagesColor:d3.scaleThreshold()
    };

    function avgWage(jobs){
        var wages = _.map(
            jobs,
            function(j){
                var wage;
                if(j['WAGE_RATE_OF_PAY_FROM'] > 0 && j['WAGE_RATE_OF_PAY_TO'] > 0){
                    wage = (j['WAGE_RATE_OF_PAY_TO'] + j['WAGE_RATE_OF_PAY_FROM']) / 2;
                }
                else if(j['WAGE_RATE_OF_PAY_FROM'] > 0){
                    wage = j['WAGE_RATE_OF_PAY_FROM'];
                }

                if(wage && j['TOTAL_WORKERS']){
                    return wage * j['TOTAL_WORKERS'];

                }
                else{
                    return 0;
                }

            });
        var totalWorkers = totalWorkerCount(jobs);

        return _.reduce(wages, function(a,b){return a+b;})/ totalWorkers;
    }

    function totalWorkerCount(jobs){
        return _.reduce(_.map(jobs, function(j){ return j['TOTAL_WORKERS']?j['TOTAL_WORKERS']:0 ; }), function(a,b){return a+b;});
    }
    function execFilters(){
        filteredData = _.filter(data, function(d){
            var conditions = [];

            if(filters.selectedState){
                conditions.push(d['WORKSITE_STATE'] == filters.selectedState)
            }

            if(filters.selectedCounty){
                conditions.push(d['WORKSITE_COUNTY'] == filters.selectedCounty)
            }

            if(filters.selectedCompanies && filters.selectedCompanies.length > 0){
                conditions.push(filters.selectedCompanies.indexOf(d['EMPLOYER_NAME']) > -1);
            }

            if(filters.selectedJobs && filters.selectedJobs.length > 0){
                conditions.push(filters.selectedJobs.indexOf(d['SOC_CODE'].substring(0,2)) > -1);
            }

            if(filters.selectedWageRange && filters.selectedWageRange.length == 2){
                conditions.push(d['WAGE_RATE_OF_PAY_FROM'] >= filters.selectedWageRange[0] && d['WAGE_RATE_OF_PAY_FROM'] <= filters.selectedWageRange[1]);
            }

            return _.every(conditions);
        });

        filteredForCompanies = _.filter(data, function(d){
            var conditions = [];

            if(filters.selectedState){
                conditions.push(d['WORKSITE_STATE'] == filters.selectedState)
            }

            if(filters.selectedCounty){
                conditions.push(d['WORKSITE_COUNTY'] == filters.selectedCounty)
            }

            if(filters.selectedJobs && filters.selectedJobs.length > 0){
                conditions.push(filters.selectedJobs.indexOf(d['SOC_CODE'].substring(0,2)) > -1);
            }

            return _.every(conditions);
        });

        filteredForJobs = _.filter(data, function(d){
            var conditions = [];

            if(filters.selectedState){
                conditions.push(d['WORKSITE_STATE'] == filters.selectedState)
            }

            if(filters.selectedCounty){
                conditions.push(d['WORKSITE_COUNTY'] == filters.selectedCounty)
            }

            if(filters.selectedCompanies && filters.selectedCompanies.length > 0){
                conditions.push(filters.selectedCompanies.indexOf(d['EMPLOYER_NAME']) > -1);
            }

            return _.every(conditions);
        });

        constructMiniMungers();

        mapMunged = miniMungers.map.aggregate();
        companyMunged = miniMungers.company.aggregate();
        jobMunged = miniMungers.job.aggregate();

        var jobMax = _.max([
            _.max(_.pluck(companyMunged,'jobCount')),
            _.max(_.pluck(jobMunged,'jobCount')),
            _.max(_.pluck(mapMunged,function(d){return d.properties['totalCount'];}))
        ]);

        var wageMax = _.max([
            _.max(_.pluck(companyMunged,'avgWage')),
            _.max(_.pluck(jobMunged,'avgWage'))
        ]);
        scales.jobCount.domain([1,jobMax]);
        scales.wages.domain([0,wageMax])
    }

    mapMunger = function(){
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
                        return d[contexts.state.dataId] == filters.selectedState;
                    });
                },
                matchToGeo:function(f){
                    var comparison = function(d){
                        var geoState = f.properties[contexts.state.geoId];
                        var geoCounty = f.properties[contexts[filters.mapContext].geoId];
                        var dataCounty = d.indexValue;
                        var selectedState  = filters.selectedState;
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
                    return f.properties[contexts.state.geoId] == filters.selectedState ||  f.properties[contexts.state.geoId] == filters.selectedState;
                }
            },
            zip:{
                dataId:'WORKSITE_POSTAL_CODE',
                geoId:'zip',
                filter: function(data){
                    return _.filter(data, function(d){
                        return d[contexts.state.dataId] == filters.selectedState;
                    });
                },
                matchToGeo: function(f){
                    var comparison = function(d){
                        var geoState = f.properties.state;
                        var geoZip = f.properties.zip;
                        var dataZip = d.indexValue;
                        var selectedState  = filters.selectedState;
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
                    return f.properties.state == filters.selectedState;
                }
            }
        };

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
            if(!filters.selectedState) {
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
                    f.properties = _.extend(f.properties, geoData);
                }
            });

            return filteredGeo;
        }

        function constructor(d, f){
            data = d['h1b'];
            geo = d['geo'];
            filters = f;
            return constructor;
        }

        constructor.aggregate = aggregateForMap;

        return constructor;
    }();
    companyMunger = function(){
        var data, filters, unfilteredData;

        function aggregate(){
            var g =  _.groupBy(data, function(d){
                return d['EMPLOYER_NAME'];
            });

            return _.sortBy(_.map(g, function(c, d){ return {
                name:d,
                jobCount:totalWorkerCount(c),
                avgWage:avgWage(c)};
            }), 'jobCount').slice(-20);
        }

        function constructor(d, f){
            data = d['h1b'];
            unfilteredData = d['unfilteredH1b'];
            filters = f;
            return constructor;
        }
        constructor.aggregate = aggregate;

        return constructor;
    }();
    jobMunger = function(){
        var data, filters;

        var jobTypes = {
            '11':'Management Occupations',
            '13':'Business and Financial Operations Occupations',
            '15':'Computer and Mathematical Occupations',
            '17':'Architecture and Engineering Occupations',
            '19':'Life, Physical, and Social Science Occupations',
            '21':'Community and Social Service Occupations',
            '23':'Legal Occupations',
            '25':'Education, Training, and Library Occupations',
            '27':'Arts, Design, Entertainment, Sports, and Media Occupations',
            '29':'Healthcare Practitioners and Technical Occupations',
            '31':'Healthcare Support Occupations',
            '33':'Protective Service Occupations',
            '35':'Food Preparation and Serving Related Occupations',
            '37':'Building and Grounds Cleaning and Maintenance Occupations',
            '39':'Personal Care and Service Occupations',
            '41':'Sales and Related Occupations',
            '43':'Office and Administrative Support Occupations',
            '45':'Farming, Fishing, and Forestry Occupations',
            '47':'Construction and Extraction Occupations',
            '49':'Installation, Maintenance, and Repair Occupations',
            '51':'Production Occupations',
            '53':'Transportation and Material Moving Occupations'
        };


        function aggregate(){
            var g =  _.groupBy(data, function(d){
                return d['SOC_CODE'].substring(0,2);
            });

            return _.map(g, function(c, d){ return {
                code:d,
                name:jobTypes[d],
                jobCount:totalWorkerCount(c),
                avgWage:avgWage(c)};
            });
        }
        function constructor(d, f){
            data = d['h1b'];
            filters = f;

            return constructor;
        }
        constructor.aggregate = aggregate;

        return constructor;
    }();

    var miniMungers = {
        map:null,
        company:null,
        job:null
    };

    function topoToGeoJson(d, context){
        return topojson.feature(
            d[context],
            d[context].objects[context]
        );
    }

    function constructMiniMungers(){
        miniMungers.map = mapMunger({h1b:filteredData,geo:geo},filters);
        miniMungers.company = companyMunger({
            h1b:filteredForCompanies,
            geo:geo,
            unfilteredH1b:data
        }, filters);

        miniMungers.job = jobMunger({h1b:filteredForJobs},filters);
    }

    function constructor(d, f){
        var floatCols = ['WAGE_RATE_OF_PAY_FROM', ['WAGE_RATE_OF_PAY_TO']];
        var intCols = ['TOTAL_WORKERS'];
        var dateCols = ['CASE_SUBMITTED'];
        data = _.map(d['h1b'], function(e){
            Object.keys(e).forEach(function(key) {
                if(key.indexOf('DATE') > -1 || dateCols.indexOf(key) > -1){
                    e[key] = moment(e[key]);
                }
                else if(intCols.indexOf(key) > -1){
                    e[key] = parseInt(e[key]);
                }
                else if(floatCols.indexOf(key) > -1){
                    e[key] = parseFloat(e[key]);
                }

            });

            return e;
        });
        geo = {
            state: topoToGeoJson(d['geo'],'state'),
            county: topoToGeoJson(d['geo'],'county'),
            zip: topoToGeoJson(d['geo'],'zip')
        };
        wages = d['wages'];
        filters = f;

        execFilters();
        return constructor;
    }

    constructor.aggregateForMap = function(){
        return mapMunged;
    };
    constructor.aggregateForCompanies = function(){
        return companyMunged;
    };
    constructor.aggregateForWages = function(){
        return jobMunged;
    };
    constructor.aggregateForJobs = function(){
        return miniMungers.job.aggregate();
    };
    constructor.execFilters = execFilters;
    constructor.scales = function(){return scales;}
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
        container.attr('style','width:'+dimensions.width+'px;height:'+dimensions.height+'px;');
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
        dimensions.parentHeight = value.height;
        dimensions.parentWidth = value.width;

        dimensions.width = value.width;
        dimensions.height = value.height * (1/10);

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

h1b.filterDescription = function(){
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

    var components;

    function draw(){
        components.forEach(function(f){
           f(container);
        });
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
    constructor.components = function (value) {
        if (!arguments.length) return components;
        components = value;
        return constructor;
    };
    constructor.draw = draw;

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
        data.execFilters();

        //then
        draw();

        //then handle callbacks
        _onUpdateCallbacks.forEach(function(f){
            f();
        })

    }

    function drawFilterDescription(e){
        var c = e.select('.location-filter-description');

        var state = c.select('.selected-state');
        var county = c.select('.selected-county');

        state.style('display',function(){ return filters.selectedState ? 'block':'none';});
        state.select('span').html('<strong>State:</strong> '+filters.selectedState);
        state.select('button').on('click',function(){ filters.selectedState=null;filters.selectedCounty=null;filters.mapContext='state'; onUpdate();})

        county.style('display',function(){ return filters.selectedCounty ? 'block':'none';});
        county.select('span').html('<strong>County:</strong> '+filters.selectedCounty);
        county.select('button').on('click',function(){ filters.selectedCounty=null; onUpdate();})
    }

    function _calcMapBounds(filteredData){
        var center = d3.geoCentroid(filteredData);
        var scale  = (dimensions.width) * .8;
        var offset = [(dimensions.width)/2, (dimensions.height)/2];
        var projection = d3.geoMercator().scale(scale).center(center)
            .translate(offset);

        // create the path
        var path = d3.geoPath().projection(projection);

        // using the path determine the bounds of the current map and use
        // these to determine better values for the scale and translation
        var bounds  = path.bounds(filteredData);
        var hscale  = scale*(dimensions.width-20)  / (bounds[1][0] - bounds[0][0]);
        var vscale  = scale*(dimensions.height-20) / (bounds[1][1] - bounds[0][1]);
        var scale   = (hscale < vscale) ? hscale : vscale;
        var offset  = [dimensions.width -20 - (bounds[0][0] + bounds[1][0])/2,
            dimensions.height - 20 - (bounds[0][1] + bounds[1][1])/2];

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

        container.attr('width',dimensions.width)
            .attr('height',dimensions.height)
            .attr('x', dimensions.parentWidth*1/3);

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
                    filters.selectedState = d.properties.indexValue;
                }
                else if ( filters.mapContext == 'county'){
                    filters.selectedCounty = d.properties.indexValue;
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
            container = d3.select(this);
            draw();
        });
    }

    constructor.dimensions = function (value) {
        if (!arguments.length) return dimensions;
        dimensions.parentHeight = value.height;
        dimensions.parentWidth = value.width;

        dimensions.width = value.width * (1/3);
        dimensions.height = value.height * (1/2);

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
    constructor.data = function (value) {
        if (!arguments.length) return data;
        data = value;
        return constructor;
    };
    constructor.drawFilterDescription = drawFilterDescription;
    constructor.draw = draw;

    return constructor;
};

h1b.companyStats = function () {
    var container, data;

    var dimensions = {
        width:0,
        height:0
    };

    var colors = {

    };

    var filters = {

    };


    var _onUpdateCallbacks = [];

    function onUpdate(){
        data.execFilters();

        //then
        draw();

        //then handle callbacks
        _onUpdateCallbacks.forEach(function(f){
            f();
        })

    }
    function drawFilterDescription(e){
        var c = e.select('.company-filter-description');

        var list = c.select('.list-group');

        var l = list.selectAll('li')
            .data(filters.selectedCompanies);
        var lis = l
            .enter()
            .append('li')
            .attr('class','list-group-item')
            .merge(l)
            .html(function(d){
               return d;
            });

        lis.append('button')
            .attr('class','close')
            .on('click',function(d){
                var i = filters.selectedCompanies.indexOf(d);
                if(i > -1){
                    filters.selectedCompanies.splice(i,1);
                }
                onUpdate();
            })
            .append('span')
            .html('&times;');

        l.exit().remove();
    }
    var scales = {
        jobCount: d3.scaleLog(),
        wages: d3.scaleLinear()
    };

    function draw(){
        var aggregatedData = data.aggregateForCompanies();
        var globalScales = data.scales();

        var jobCountExtent = d3.extent(_.map(aggregatedData,function(d){return d['jobCount']; }));
        var wageExtent = d3.extent(_.map(aggregatedData,function(d){return d['avgWage']; }));

        container.attr('width',dimensions.width)
            .attr('height',dimensions.height)
            .attr('x', dimensions.parentWidth * (2/3));

        if(jobCountExtent[1] > 15000){
            scales.jobCount = d3.scaleLog();
        }
        else {
            scales.jobCount = d3.scaleLinear();
        }

        globalScales.wages
            .range([dimensions.height * .9, dimensions.height * .15]);

        scales.jobCount
            .domain(jobCountExtent)
            .range([dimensions.height * .9, dimensions.height * .15]);

        var jobTicks = scales.jobCount.ticks(5);
        var wageTicks = globalScales.wages.ticks(5);

        var plots = container.select('.plots');
        var tooltipElement = d3.select('#tooltip');

        var p = plots.selectAll('line.job')
            .data(aggregatedData);
        p
            .enter()
            .append('line')
            .attr('class','job')
            .attr('id',function(d,i){return 'job-'+i;})
            .merge(p)
            .transition()
            .attr('y2',function(d){ return scales.jobCount(d['jobCount']); })
            .attr('x2',dimensions.width * .8)
            .attr('y1',function(d){ return globalScales.wages(d['avgWage']); })
            .attr('x1',dimensions.width * .2)
            .attr('opacity',.65)
            .attr('stroke','lightgrey')
            .attr('stroke-width',2.5);

        p.exit().remove();

        var p = plots.selectAll('line.job-hover')
            .data(aggregatedData);
        p
            .enter()
            .append('line')
            .attr('class','job-hover')
            .on('click', function(d){
                if(filters.selectedCompanies.indexOf(d['name']) == -1){
                    filters.selectedCompanies.push(d['name']);

                    onUpdate();
                }
                else{
                    filters.selectedCompanies.slice(filters.selectedCompanies.indexOf(d['name']), 1);

                    onUpdate();
                }
            })
            .on('mouseover', function (d,i) {
                var html = d.name;
                container.select('#job-'+i)
                    .attr('stroke-width',4);
                tooltipElement.select('.tooltip-inner').html(html).style("opacity", .9);
                tooltipElement.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltipElement
                    .style("left", (d3.event.pageX + 40 ) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");

            })
            .on('mouseout', function (d,i) {
                container.select('#job-'+i)
                    .attr('stroke-width',2.5).style("opacity", .65);

                tooltipElement.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .merge(p)
            .attr('y2',function(d){ return scales.jobCount(d['jobCount']); })
            .attr('x2',dimensions.width * .8)
            .attr('y1',function(d){ return globalScales.wages(d['avgWage']); })
            .attr('x1',dimensions.width * .2)
            .attr('opacity',0)
            .attr('stroke','grey')
            .attr('stroke-width',15);

        p.exit().remove();

        container.select('line.jobs')
            .attr('y1', dimensions.height * .15)
            .attr('y2', dimensions.height * .9)
            .attr('x1', dimensions.width * .8)
            .attr('x2', dimensions.width * .8)
            .attr('stroke','lightgrey')

        container.select('line.wages')
            .attr('y1', dimensions.height * .15)
            .attr('y2', dimensions.height * .9)
            .attr('x1', dimensions.width * .2)
            .attr('x2', dimensions.width * .2)
            .attr('stroke','lightgrey')

        container.select('text.wage-title')
            .attr('text-anchor','middle')
            .attr('y',dimensions.height * .13)
            .attr('x',dimensions.width * .2)
            .attr('fill','lightgrey');

        container.select('text.job-title')
            .attr('text-anchor','middle')
            .attr('y',dimensions.height * .13)
            .attr('x',dimensions.width * .8)
            .attr('fill','lightgrey');

        container.select('text.title')
            .attr('text-anchor','middle')
            .text('Top '+aggregatedData.length+' Companies')
            .attr('y',dimensions.height * .05)
            .attr('x',dimensions.width /2);


        container.selectAll('g.job-ticks').remove();

        var g = container.selectAll('g.job-ticks')
            .data(jobTicks)
            .enter()
            .append('g');

        g.attr('class','job-ticks');
        g.append('line')
            .attr('x1',dimensions.width * .8)
            .attr('x2',dimensions.width * .85)
            .attr('y1',function(d){return scales.jobCount(d);})
            .attr('y2',function(d){return scales.jobCount(d);})
            .attr('stroke','lightgrey');

        g.append('text')
            .attr('x', dimensions.width * .86)
            .attr('y', function(d){return scales.jobCount(d) + 5;})
            .attr('fill','lightgrey')
            .text(function(d){return d3.format(",")(d);});

        g.exit().remove();

        container.selectAll('g.wage-ticks').remove();

        var g = container.selectAll('g.wage-ticks')
            .data(wageTicks)
            .enter()
            .append('g');

        g.attr('class','wage-ticks');
        g.append('line')
            .attr('x1',dimensions.width * .2)
            .attr('x2',dimensions.width * .15)
            .attr('y1',function(d){return globalScales.wages(d);})
            .attr('y2',function(d){return globalScales.wages(d);})
            .attr('stroke','lightgrey');

        g.append('text')
            .attr('text-anchor','end')
            .attr('x', dimensions.width * .14)
            .attr('y', function(d){return globalScales.wages(d) + 5;})
            .attr('fill','lightgrey')
            .text(function(d){return d3.format("$,")(d);});

        g.exit().remove();

    }


    function constructor(selection){
        selection.each(function (d, i) {
            container = d3.select(this);
            draw();
        });
    }

    constructor.dimensions = function (value) {
        if (!arguments.length) return dimensions;
        dimensions.parentHeight = value.height;
        dimensions.parentWidth = value.width;

        dimensions.width = value.width * (1/3);
        dimensions.height = value.height;

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
    constructor.data = function (value) {
        if (!arguments.length) return data;
        data = value;
        return constructor;
    };
    constructor.onUpdate = function (value) {
        if (!arguments.length) return onUpdate;
        _onUpdateCallbacks = value;
        return constructor;
    };
    constructor.draw = draw;
    constructor.drawFilterDescription = drawFilterDescription;

    return constructor;
};

h1b.jobStats = function () {
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
        jobCount: d3.scaleLog(),
        wages: d3.scaleLinear()
    };
    var _onUpdateCallbacks = [];

    function onUpdate(){
        data.execFilters();

        //then
        draw();

        //then handle callbacks
        _onUpdateCallbacks.forEach(function(f){
            f();
        })

    }
    function draw(){
        var aggregatedData = data.aggregateForJobs();
        var globalScales = data.scales();

        var jobCountExtent = d3.extent(_.map(aggregatedData,function(d){return d['jobCount']; }));
        var wageExtent = d3.extent(_.map(aggregatedData,function(d){return d['avgWage']; }));

        container.attr('width',dimensions.width)
            .attr('height',dimensions.height);

        globalScales.wages
            .range([dimensions.height * .9, dimensions.height * .15]);

        if(jobCountExtent[1] > 15000){
            scales.jobCount = d3.scaleLog();
        }
        else {
            scales.jobCount = d3.scaleLinear();
        }

        scales.jobCount
            .domain(jobCountExtent)
            .range([dimensions.height * .9, dimensions.height * .15])
            .nice();

        var jobTicks = scales.jobCount.ticks(5);
        var wageTicks = globalScales.wages.ticks(5);


        var plots = container.select('.plots');
        var tooltipElement = d3.select('#tooltip');

        var p = plots.selectAll('line.job')
            .data(aggregatedData);
        p
            .enter()
            .append('line')
            .attr('class','job')
            .attr('id',function(d,i){return 'job-'+i;})
            .on('click', function(d){
                if(filters.selectedJobs.indexOf(d['name']) == -1){
                    filters.selectedJobs.push(d['name']);

                    onUpdate();
                }
                else{
                    filters.selectedJobs.slice(filters.selectedJobs.indexOf(d['name']), 1);

                    onUpdate();
                }
            })
            .on('mouseover', function (d) {
                var html = d.name;

                tooltipElement.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltipElement.html(html)
                    .style("left", (d3.event.pageX + 40 ) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");

            })
            .on('mouseout', function (d) {
                tooltipElement.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .merge(p)
            .transition()
            .attr('y2',function(d){ return scales.jobCount(d['jobCount']); })
            .attr('x2',dimensions.width * .2)
            .attr('y1',function(d){ return globalScales.wages(d['avgWage']); })
            .attr('x1',dimensions.width * .8)
            .attr('stroke','lightgrey')
            .attr('opacity',.65)
            .attr('stroke-width',2.5);

        p.exit().remove();


        var p = plots.selectAll('line.job-hover')
            .data(aggregatedData);
        p
            .enter()
            .append('line')
            .attr('class','job-hover')
            .on('click', function(d){
                if(filters.selectedJobs.indexOf(d['code']) == -1){
                    filters.selectedJobs.push(d['code']);

                    onUpdate();
                }
                else{
                    filters.selectedJobs.slice(filters.selectedJobs.indexOf(d['code']), 1);

                    onUpdate();
                }
            })
            .on('mouseover', function (d,i) {
                var html = d.name;
                container.select('#job-'+i)
                    .attr('stroke-width',4);
                tooltipElement.select('.tooltip-inner').html(html).style("opacity", .9);
                tooltipElement.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltipElement
                    .style("left", (d3.event.pageX + 40 ) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");

            })
            .on('mouseout', function (d,i) {
                container.select('#job-'+i)
                    .attr('stroke-width',2.5).style("opacity", .65);

                tooltipElement.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .merge(p)
            .attr('y2',function(d){ return scales.jobCount(d['jobCount']); })
            .attr('x2',dimensions.width * .2)
            .attr('y1',function(d){ return globalScales.wages(d['avgWage']); })
            .attr('x1',dimensions.width * .8)
            .attr('opacity',0)
            .attr('stroke','grey')
            .attr('stroke-width',15);

        p.exit().remove();

        container.select('line.jobs')
            .attr('y1', dimensions.height * .15)
            .attr('y2', dimensions.height * .9)
            .attr('x1', dimensions.width * .2)
            .attr('x2', dimensions.width * .2)
            .attr('stroke','lightgrey')

        container.select('line.wages')
            .attr('y1', dimensions.height * .15)
            .attr('y2', dimensions.height * .9)
            .attr('x1', dimensions.width * .8)
            .attr('x2', dimensions.width * .8)
            .attr('stroke','lightgrey')

        container.select('text.wage-title')
            .attr('text-anchor','middle')
            .attr('y',dimensions.height * .13)
            .attr('x',dimensions.width * .8)
            .attr('fill','lightgrey');

        container.select('text.job-title')
            .attr('text-anchor','middle')
            .attr('y',dimensions.height * .13)
            .attr('x',dimensions.width * .2)
            .attr('fill','lightgrey');

        container.select('text.title')
            .attr('text-anchor','middle')
            .text('Job Types')
            .attr('y',dimensions.height * .05)
            .attr('x',dimensions.width /2)

        container.selectAll('g.job-ticks').remove();

        var g = container.selectAll('g.job-ticks')
            .data(jobTicks)
            .enter()
            .append('g');

        g.attr('class','job-ticks');
        g.append('line')
            .attr('x1',dimensions.width * .2)
            .attr('x2',dimensions.width * .15)
            .attr('y1',function(d){return scales.jobCount(d);})
            .attr('y2',function(d){return scales.jobCount(d);})
            .attr('stroke','lightgrey');

        g.append('text')
            .attr('text-anchor','end')
            .attr('x', dimensions.width * .14)
            .attr('y', function(d){return scales.jobCount(d) + 5;})
            .attr('fill','lightgrey')
            .text(function(d){return d3.format(",")(d);});

        g.exit().remove();

        container.selectAll('g.wage-ticks').remove();

        var g = container.selectAll('g.wage-ticks')
            .data(wageTicks)
            .enter()
            .append('g');

        g.attr('class','wage-ticks');
        g.append('line')
            .attr('x1',dimensions.width * .8)
            .attr('x2',dimensions.width * .85)
            .attr('y1',function(d){return globalScales.wages(d);})
            .attr('y2',function(d){return globalScales.wages(d);})
            .attr('stroke','lightgrey');

        g.append('text')
            .attr('text-anchor','start')
            .attr('x', dimensions.width * .86)
            .attr('y', function(d){return globalScales.wages(d) + 5;})
            .attr('fill','lightgrey')
            .text(function(d){return d3.format("$,")(d);});

        g.exit().remove();

    }

    function constructor(selection){
        selection.each(function (d, i) {
            container = d3.select(this);
            draw();
        });
    }

    constructor.dimensions = function (value) {
        if (!arguments.length) return dimensions;
        dimensions.parentHeight = value.height;
        dimensions.parentWidth = value.width;

        dimensions.width = value.width * (1/3);
        dimensions.height = value.height;

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
    constructor.data = function (value) {
        if (!arguments.length) return data;
        data = value;
        return constructor;
    };
    constructor.onUpdate = function (value) {
        if (!arguments.length) return onUpdate;
        _onUpdateCallbacks = value;
        return constructor;
    };
    constructor.draw = draw;
    constructor.drawFilterDescription = function(){};

    return constructor;
};

h1b.panels = function(){
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

    var components = {
        map: this.map(),
        companyStats: this.companyStats(),
        //wageStats: this.wageStats(),
        jobStats: this.jobStats()
    };
    var _onUpdateCallbacks = [];


    function draw(){
        container.attr('style','width:'+dimensions.width+'px;height:'+dimensions.height+'px;');
        components.map
            .dimensions(dimensions)
            .filters(filters)
            .colors(colors)
            .onUpdate(_onUpdateCallbacks.concat([components.companyStats.draw, components.jobStats.draw]))
            .data(data);

        container.select('.map')
            .call(components.map);

        components.companyStats
            .dimensions(dimensions)
            .filters(filters)
            .colors(colors)
            .onUpdate(_onUpdateCallbacks.concat([components.map.draw, components.jobStats.draw]))
            .data(data);

        container.select('.company-stats')
            .call(components.companyStats);

     /*   components.wageStats
            .dimensions(dimensions)
            .filters(filters)
            .colors(colors)
            .onUpdate(_onUpdateCallbacks.concat([components.map.draw,components.companyStats.draw]))
            .data(data);

        container.select('.wage-stats')
            .call(components.wageStats);
*/
        components.jobStats
            .dimensions(dimensions)
            .filters(filters)
            .colors(colors)
            .onUpdate(_onUpdateCallbacks.concat([components.map.draw,components.companyStats.draw]))
            .data(data);

        container.select('.job-stats')
            .call(components.jobStats);
    }

    function constructor(selection){
        selection.each(function (d, i) {
            container = d3.select(this);
            draw();
        });
    }

    constructor.dimensions = function (value) {
        if (!arguments.length) return dimensions;
        dimensions.parentHeight = value.height;
        dimensions.parentWidth = value.width;

        dimensions.width = value.width;
        dimensions.height = value.height * (9/10);

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
    constructor.data = function (value) {
        if (!arguments.length) return data;
        data = value;
        return constructor;
    };
    constructor.onUpdate = function (value) {
        if (!arguments.length) return onUpdate;
        _onUpdateCallbacks = value;
        return constructor;
    };
    constructor.drawFilterDescriptions = function(){
        return [
            components.map.drawFilterDescription,
            components.companyStats.drawFilterDescription
        ]
    };
    return constructor;
};

h1b.jobList = function(){
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
    constructor.data = function (value) {
        if (!arguments.length) return data;
        data = value;
        return constructor;
    };
    return constructor;
};

h1b.jobListPagination = function(){
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
    constructor.data = function (value) {
        if (!arguments.length) return data;
        data = value;
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
        selectedState:null,
        selectedCounty:null,
        selectedCompanies:[],
        selectedJobs:[],
        selectedWageRange:null
    };

    var scales = {
        wageColors:d3.scaleThreshold(),
        jobCounts:d3.scaleThreshold()
    };

    var components = {
        title: this.title(),
        panels: this.panels(),
        jobList: this.jobList(),
        jobListPagination: this.jobListPagination(),
        filterDescription: this.filterDescription()
    };

    function draw(){
        components.title
            .dimensions(dimensions)
            .filters(filters)
            .colors(colors);

        components.panels
            .dimensions(dimensions)
            .filters(filters)
            .colors(colors)
            .onUpdate([components.filterDescription.draw])
            .data(data);

        components.filterDescription
            .dimensions(dimensions)
            .filters(filters)
            .colors(colors)
            .components(components.panels.drawFilterDescriptions());

        components.jobList
            .dimensions(dimensions)
            .filters(filters)
            .colors(colors)
            .data(data);
        components.jobListPagination
            .dimensions(dimensions)
            .filters(filters)
            .colors(colors)
            .data(data);

        container.select('.title')
            .call(components.title);
        container.select('.panels')
            .call(components.panels);
        container.select('.filter-description')
            .call(components.filterDescription);
        container.select('.job-list')
            .call(components.jobList);
        container.selectAll('.job-list-pagination')
            .call(components.jobListPagination);
    }

    function constructor(selection){
        selection.each(function (d, i) {
            data = h1b.dataMunger(d, filters);
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