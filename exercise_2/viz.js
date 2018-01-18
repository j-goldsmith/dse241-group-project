'use strict';

var colorWheel = [
  //  '#f7f7f7',
    '#d9d9d9',
    '#bdbdbd',
    '#969696',
    '#737373',
    '#525252',
    '#252525'
];

var activeColorWheel =[
    '#eff3ff',
    '#c6dbef',
    '#9ecae1',
    '#6baed6',
    '#4292c6',
    '#2171b5',
    '#084594'
]
var medalColors = ["#a17419",'#b7b7b7',"#d5a500"];
var medalCountColor = d3.scaleLinear()
    .range(["#d9d9d9", "#252525"]);
var max;


function dataAggregateTransform(data, _filter, selectedOnly) {
    if(!data){
        return [];
    }

    if(_filter) {
        var s = _filter.selectedCountries();
        var c = selectedOnly ? s : _.uniq(_.pluck(data,'country'));
        return _.map(c, function (countryName) {
            var countryData = _.filter(data,
                function (d) {
                    return d.country === countryName;
                });

            var filteredAggregates = _.map(countryData, function (d) {
                var eligleYears = _.filter(d.medalCounts, function (m) {
                    return m.year >= _filter.selectedYears()[0] & m.year <= _filter.selectedYears()[1];
                });

                var genderAggregates = _.map(eligleYears, function (e) {
                    var results = [];
                    if (_filter.selectedGenders().indexOf('Male') > -1) {
                        results.push(e.men);
                    }
                    if (_filter.selectedGenders().indexOf('Female') > -1) {
                        results.push(e.women);
                    }

                    return _.reduce(results, function (agg, x) {
                        return [
                            agg[0] + x[0],
                            agg[1] + x[1],
                            agg[2] + x[2]
                        ];
                    }, [0, 0, 0])
                });

                return _.reduce(genderAggregates, function (agg, x) {
                    return [
                        agg[0] + x[0],
                        agg[1] + x[1],
                        agg[2] + x[2]
                    ];
                }, [0, 0, 0]);

            });

            var result = {'country': countryName, 'historicRegions':countryData.length > 0 ? countryData[0].historicRegions:[]};

            result['gold'] = filteredAggregates.length == 0  || _filter.selectededMedalTypes().indexOf('Gold') == -1 ? 0:filteredAggregates[0][0];
            result['silver'] = filteredAggregates.length == 0  || _filter.selectededMedalTypes().indexOf('Silver') == -1 ? 0:filteredAggregates[0][1];
            result['bronze'] = filteredAggregates.length == 0  || _filter.selectededMedalTypes().indexOf('Bronze') == -1 ? 0:filteredAggregates[0][2];

            return result;
        });
    }
    else {
        return _.map(data, function (d) {

            var men = _.map(d.medalCounts, function(m){
                return m.men
            });

            var women = _.map(d.medalCounts, function(m){
                return m.women
            });

            var results = [];
            results = results.concat(men);
            results = results.concat(women);

            var filteredAggregates = _.reduce(results, function (agg, x) {
                return [
                    agg[0] + x[0],
                    agg[1] + x[1],
                    agg[2] + x[2]
                ];
            }, [0, 0, 0]);

            return {
                'country': d.country,
                'gold': filteredAggregates[0],
                'silver': filteredAggregates[1],
                'bronze': filteredAggregates[2],
                'historicRegions':d.historicRegions
            };
        });
    }

}

function filter() {
    var rootElement, genderElement, medalElement, yearElement, legendElement;
    var drilldown, map;

    var options = {
        selectedCountries: [],

        selectedGenders: ['Male', 'Female'],
        genderOptions: ['Male', 'Female'],

        selectedMedalTypes: ['Gold', 'Silver', 'Bronze'],
        medalOptions: ['Gold', 'Silver', 'Bronze'],

        selectedYears: [1924, 2006],
        yearOptions: [1924, 2006]
    };
    function linspace(start, end, n) {
        var out = [];
        var delta = (end - start) / (n - 1);

        var i = 0;
        while(i < (n - 1)) {
            out.push(start + (i * delta));
            i++;
        }

        out.push(end);
        return out;
    }
    function init(parent) {
        rootElement = d3.select(parent)
            .append('div')
            .attr('class', 'col-sm');



        legendElement = rootElement.append('div')
            .attr('class', 'row')
            .append('div')
                .attr('class','col-sm text-center');

         legendElement.append('h6')
            .html('Winter Olympic Medals by Country');
         legendElement.append('h7')
             .attr('id','year-output');

        var legendWidth = 500,
            legendHeight = 45;
         var legendSvg = legendElement.append('svg')
                .attr('width',legendWidth)
                .attr('height',legendHeight)
                .append('g');

        var gradient = legendSvg.append('defs')
            .append('linearGradient')
            .attr('id', 'gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%')
            .attr('spreadMethod', 'pad');

        var pct = linspace(1, 100, 6).map(function(d) {
            return Math.round(d) + '%';
        });

        var colourPct = d3.zip(pct, colorWheel);

        colourPct.forEach(function(d) {
            gradient.append('stop')
                .attr('offset', d[0])
                .attr('stop-color', d[1])
                .attr('stop-opacity', 1);
        });

        legendSvg.append('g')
            .attr('transform','translate(50,10)')
            .append('rect')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('width', 400)
                .attr('height', 10)
                .style('fill', 'url(#gradient)');

        // create a scale and axis for the legend
        var legendScale = d3.scaleLinear()
            .domain([0, max])
            .range([0, 400]);

        var legendAxis = d3.axisBottom()
            .scale(legendScale)
            .tickValues([1,60,120,180,240])
            .tickSize(0)
            .tickPadding(7)
            .tickFormat(d3.format("d"));

        var axisG = legendSvg.append("g")
            .attr("class", "legend axis")
            .attr("transform", "translate(50,20)")
            .call(legendAxis);

        axisG.select(".domain").remove();

        yearElement = rootElement
            .append('div')
            .attr('class', 'row mt-2')
            .append('div')
            .attr('class', 'col-sm text-center')
            .append('div').attr('class','slider-holder');
        setupSlider(
            options.yearOptions[0],
            options.yearOptions[1],
            function(lo,hi){
                options.selectedYears[0] = lo;
                options.selectedYears[1] = hi;
                refresh();
            },
            function(x){return colorWheel[2];})

        var row = rootElement.append('div').attr('class', 'row mt-4');
   /*     genderElement = row.append('div')
            .attr('class', 'col-sm text-center')
            .append('div')
                .attr('class', 'btn-group btn-group-toggle')
                .attr('data-toggle', 'buttons');

        var enteredGenderLabel = genderElement.selectAll('label')
                .data(options.genderOptions)
                .enter().append('label');

        enteredGenderLabel.append('input')
            .attr('type', 'checkbox')
            .on('click', function (d) {
            _filter.selectGender(d)
        });
        enteredGenderLabel.append('span').text(function (d) {
            return d;
        })
*/

        medalElement = row.append('div')
            .attr('class', 'col-sm text-center')
            .append('div')
            .attr('class', 'btn-group btn-group-toggle')
            .attr('data-toggle', 'buttons');

        var enteredMedalLabel = medalElement.selectAll('label')
                .data(options.medalOptions)
                .enter().append('label');

        enteredMedalLabel.append('input')
            .attr('type', 'checkbox').on('click', function (d) {
            _filter.selectMedalType(d)
        });
        enteredMedalLabel.append('span').text(function (d) {
            return d;
        });


    }

    function render() {
        if (!rootElement) {
            return;
        }

        legendElement.selectAll('#year-output').text(options.selectedYears[0]+" to "+options.selectedYears[1]);

       /* genderElement.selectAll('label').attr('class', function (d) {
            return (options.selectedGenders.indexOf(d) > -1)
                ? 'btn btn-secondary active'
                : 'btn btn-secondary';
        });
*/
        medalElement.selectAll('label').attr('class', function (d) {
            return (options.selectedMedalTypes.indexOf(d) > -1)
                ? 'filter-button btn btn-secondary  active'
                : 'filter-button btn btn-secondary';
        });


    }

    function refresh() {
        render();
        if (drilldown) {
            drilldown.refresh(this);
        }
        if (map) {
            map.refresh(this);
        }
    }

    function _filter(selection) {
        selection.each(function (data, i) {
            if (!rootElement) {
                init(this);
            }
            render();
        })
    }

    _filter.selectedCountries = function (value) {
        if (!arguments.length) return options.selectedCountries;
        options.selectedCountries = value;
        refresh()
        return _filter;
    };
    _filter.selectedYears = function (value) {
        if (!arguments.length) return options.selectedYears;
        options.selectedYears = value;
        refresh()
        return _filter;
    };
    _filter.selectedGenders = function (value) {
        if (!arguments.length) return options.selectedGenders;
        options.selectedGenders = value;
        refresh()
        return _filter;
    };
    _filter.selectededMedalTypes = function (value) {
        if (!arguments.length) return options.selectedMedalTypes;
        options.selectedMedalTypes = value;
        refresh();
        return _filter;
    };

    _filter.selectCountry = function (value) {
        if (options.selectedCountries.indexOf(value) < 0) {
            options.selectedCountries.push(value);
            refresh();
        } else {
            _filter.deselectCountry(value);
            refresh();
        }

        return _filter;
    };
    _filter.deselectCountry = function (value) {
        var i = options.selectedCountries.indexOf(value);
        if (i > -1) {
            options.selectedCountries.splice(i, 1);
            refresh();
        }

        return _filter;
    };

    _filter.selectGender = function (value) {
        if (options.selectedGenders.indexOf(value) < 0) {
            options.selectedGenders.push(value);
            refresh();
        } else {
            _filter.deselectGender(value);
            refresh();
        }

        return _filter;
    };
    _filter.deselectGender = function (value) {
        var i = options.selectedGenders.indexOf(value);
        if (i > -1) {
            options.selectedGenders.splice(i, 1);
            refresh();
        }

        return _filter;
    };

    _filter.selectMedalType = function (value) {
        if (options.selectedMedalTypes.indexOf(value) < 0) {
            options.selectedMedalTypes.push(value);
            refresh();
        } else {
            _filter.deselectMedalType(value);
            refresh();
        }

        return _filter;
    };
    _filter.deselectMedalType = function (value) {
        var i = options.selectedMedalTypes.indexOf(value);
        if (i > -1) {
            options.selectedMedalTypes.splice(i, 1);
            refresh();
        }

        return _filter;
    };

    _filter.setDrilldown = function (value) {
        drilldown = value;
        drilldown.refresh(_filter);

        return _filter;
    };
    _filter.setMap = function (value) {
        map = value;
        map.refresh(_filter);

        return _filter;
    };
    return _filter;
}

function map() {
    var rootElement, svgElement, countryGroupElement,tooltipElement;
    var currentData,transformedData, _filter;

    var width = 500,
        height = 500,
        projection,
        colorScale = medalCountColor,
        activeColorScale = d3.scaleLinear()
            .range([activeColorWheel[1], activeColorWheel[6]])
            .domain([1,max]);


    function aggTrans(){
        if(!currentData || !_filter){
            return;
        }

        var t = dataAggregateTransform(currentData.medalCounts,_filter,false);
        return _.map(currentData.atlas.features, function(d){
            var country = d.properties.name;
            var stats = _.filter(t, function(x){ return x.country == country});
            if(stats.length > 0){
                var related = stats[0]['historicRegions']
                    ? _.filter(t, function(x){
                        return stats[0]['historicRegions'].indexOf(x.country) > -1;})
                    : [];

                stats = stats.concat(related);
            }

            d['medals'] = {
                'total': _.reduce(stats,function(a,x){
                    return a + x.gold + x.silver + x.bronze;
                },0),
                'stats': stats.length > 0 ? stats : [{'country':country,'gold':0,'bronze':0,'silver':0}]
            };
            return d;
        })

    }

    function init(parent) {
        rootElement = d3.select(parent)
            .append('div')
            .attr('class', 'col-sm text-center');

        svgElement = rootElement.append('svg')
            .attr('class', 'map');

        countryGroupElement = svgElement
            .append('g')
            .attr('class', 'countries');

        svgElement.call(
            d3.zoom()
                .scaleExtent([1, 8])
                .on("zoom", function () {
                    countryGroupElement.attr("transform", d3.event.transform);
                })
        );

        tooltipElement = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
    }

    function render() {
        projection = d3.geoMercator()
            .scale(100)
            .translate([width / 2, height / 2]);
        var geoPath = d3.geoPath().projection(projection);

        transformedData = aggTrans(currentData.medalCounts,_filter);
        var countries = countryGroupElement
            .selectAll("path")
            .data(transformedData);

        countries.style("fill", function (d) {
            var medalCount = d.medals.total;
            return medalCount > 0 ? colorScale(medalCount):'#f7f7f7';
        });


        countries.enter().append("path")
            .attr("d", geoPath)
            .style("fill", function (d) {
                var medalCount =d.medals.total;
                return medalCount > 0 ? colorScale(medalCount):'#f7f7f7';
            })
            .style('stroke', '#f7f7f7')
            .style('stroke-width', 0.3)
            .on('mouseover', function (d) {

                var html = "";
                d.medals.stats.forEach(function(x){
                    html +=
                        "<strong>Country: </strong><span class='details'>" + x.country + "</span><br>" +
                        "<i>Gold: </i><span class='details'>" + x.gold +"</span><br>"+
                        "<i>Silver: </i><span class='details'>" + x.silver +"</span><br>" +
                        "<i>Bronze: </i><span class='details'>" + x.bronze +"</span><br>"
                });

                tooltipElement.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltipElement.html(html)
                    .style("left", (d3.event.pageX + 40 ) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");

                d3.select(this)
                    //.style("opacity", .8)
                    //.moveToFront()
                   // .style("stroke", "#252525")
                    .style("fill", function (d) {
                        var medalCount = d.medals.total;
                        return medalCount > 0 ? activeColorScale(medalCount):activeColorWheel[0];
                    });
            })
            .on('mouseout', function (d) {
                tooltipElement.transition()
                    .duration(500)
                    .style("opacity", 0);

                d3.select(this)
                   // .style("opacity", 1)
                    //.style("stroke", "#f7f7f7")
                   // .style("stroke-width", 0.3)
                    .style("fill", function (d) {
                        var medalCount = d.medals.total;
                        return medalCount > 0 ? colorScale(medalCount):'#f7f7f7';
                    });
            })
            .on('click', function (d) {
                d3.select(this).classed("active", !d3.select(this).classed("active"))
                if (_filter) {
                    d.medals.stats.forEach(function(c){
                        _filter.selectCountry(c.country);
                    });

                }
            });

        countries.exit().remove();

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
            .datum(topojson.mesh(currentData.atlas.features, function (a, b) {
                return a.id !== b.id;
            }))
            .attr("class", "names")
            .attr("d", geoPath);
    }

    function _map(selection) {
        selection.each(function (data, i) {
            if (!rootElement) {
                init(this);
            }
            currentData = data;
            //render();
        });
    }

    _map.setFilter = function (value) {
        _filter = value;
        return _map;
    }
    _map.colorScale = function (value) {
        if (!arguments.length) return colorScale;
        colorScale = value;
        return _map;
    }
    _map.refresh = function (filterInstance) {
        //_filter = filterInstance;
        if (rootElement) {
            render();
        }

        return _map;
    };
    return _map;
}

function drilldown() {
    var rootElement, countryElement, stackedBarElement, legendElement;
    var currentData;
    var _filter;
    var width = 500,
        height = 800;
    var y = d3.scaleLinear()
        .rangeRound([500, 50]);

    var medalColorScale = d3.scaleOrdinal()
        .range(medalColors)
        .domain(['bronze','silver','gold']);

    function init(parent) {
        rootElement = d3.select(parent)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        legendElement = rootElement.append('g')
            .attr('width', 300)
            .attr('height',450);
        countryElement = rootElement.append('g')
            .attr('width', 300)
            .attr('height', 350)
            .attr("transform", "translate(0,700) rotate(-90)");

        stackedBarElement = rootElement.append('g')
            .attr('width', 300)
            .attr('height', 450);



    }

    function render() {
        var data = _.range(max-1,-1,-20);


        legendElement.selectAll('line')
            .data(data)
            .enter().append('line')
            .attr('y1',function(d){return y(d);})
            .attr('x1', 0)
            .attr('y2',function(d){return y(d);})
            .attr('x1', 500)
            .style('stroke','#d9d9d9')
            .style('stroke-width','1')

        legendElement.selectAll('text')
            .data(data)
            .enter()
            .append('text')
            .text(function(d){
                return d;})
            .attr('x',470)
            .attr('y',function(d){return y(d) + 15;})
            .attr('height',20)
            .attr('width',40)
            .style('fill','#bdbdbd');

        countryElement.selectAll('rect').remove();
        countryElement.selectAll('rect')
            .data(_filter.selectedCountries())
            .enter().append('rect')
            .attr('class', 'selected-country')
            .attr('height', 40)
            .attr('width', 200)
            .attr('x', 0)
            .attr('y', function (d, i) {
                return (i * 50)+5;
            }).attr('style', 'fill:white;stroke:' + colorWheel[1] + ';')
            .on('click', function (d) {
                _filter.deselectCountry(d);
            });

        countryElement.selectAll('text').remove();
        countryElement.selectAll('text')
            .data(_filter.selectedCountries())
            .enter().append('text')
            .attr('class', 'selected-country')
            .attr('height', 50)
            .attr('width', 200)
            .attr('font-size', 16)
            .attr('x', 25)
            .attr('y', function (d, i) {
                return (i * 50) + 30;
            })
            .html(function (d) {
                return d;
            })
            .on('click', function (d) {
                _filter.deselectCountry(d);
            });



        //stackedBarElement.selectAll(".layer").remove();

        var data = dataAggregateTransform(currentData,_filter,true);

        var layers = d3.stack()
            .keys(['bronze','silver','gold'])
            (data);

        var layer = stackedBarElement.selectAll(".layer")
            .data(layers);

        var newLayers = layer.enter().append("g")
            .attr("class", "layer")
            .attr("transform", "translate(0,0)")
            .style("fill", function(d, i) { return medalColorScale(i); });

        layer.exit().remove();

        var block = layer.selectAll("rect")
            .data(function(d) { return d; });

        block.transition()
            .attr("y", function(d) { return y(d[1]); })
            .attr('style','stroke:'+colorWheel[1])
            .attr("height", function(d) { return y(d[0]) - y(d[1]); })

        block.enter().append("rect")
            .attr("x", function(d,i) { return (i*50)+5; })
            .attr("y", function(d) { return y(d[1]); })
            .attr('style','stroke:'+colorWheel[1])
            .attr("height", function(d) {
                var y1 = y(d[0]);
                var y2 = y(d[1]);

                return y1 - y2;
            })
            .attr("width", 40);

        block.exit().remove()




    }

    function _drilldown(selection) {
        selection.each(function (data, i) {
            currentData = data.medalCounts;
            y.domain([0,max]);
            if (!rootElement) {
                init(this);
            }
        });
    }

    _drilldown.refresh = function (filterInstance) {
        // _filter = filterInstance;
        if (rootElement) {
            render();
        }

        return _drilldown;
    };
    _drilldown.setFilter = function (value) {
        _filter = value;
        return _drilldown;
    }
    return _drilldown;
}

function viz() {
    var selectedCountries = [];
    var width = 960,
        height = 500;
    var rootElement, leftColElement, rightColElement;

    function setDomain(data){
        var transformed = dataAggregateTransform(data)
        max =  d3.max(transformed,
            function(d) {
                return d.gold+d.silver+d.bronze;
            });
        medalCountColor.domain([
            0,
            max
        ]);
    }

    function _viz(selection) {
        selection.each(function (data, i) {
            setDomain(data.medalCounts);
            rootElement = d3.select(this)
                .append('div')
                .attr('class', 'container');

            var row = rootElement.append('div').attr('class', 'row');
            leftColElement = row.append('div').attr('class', 'col-sm');
            rightColElement = row.append('div').attr('class', 'col-sm');

            var filterInstance = filter()
                .selectedCountries(selectedCountries);
            var drilldownInstance = drilldown();
            var mapInstance = map()
                .colorScale(medalCountColor);

            leftColElement.append('div')
                .attr('class', 'row')
                .call(mapInstance);
            leftColElement.append('div')
                .attr('class', 'row')
                .call(filterInstance);

            rightColElement.call(drilldownInstance);

            mapInstance.setFilter(filterInstance);
            drilldownInstance.setFilter(filterInstance);

            filterInstance.setDrilldown(drilldownInstance);
            filterInstance.setMap(mapInstance);
        });
    }

    _viz.selectedCountries = function (value) {
        if (!arguments.length) return selectedCountries;
        selectedCountries = value;
        return _viz;
    };
    _viz.width = function (value) {
        if (!arguments.length) return width;
        width = value;
        return _viz;
    };
    _viz.height = function (value) {
        if (!arguments.length) return height;
        height = value;
        return _viz;
    };

    return _viz;
}