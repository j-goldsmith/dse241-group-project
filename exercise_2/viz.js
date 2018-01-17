'use strict';

var colorWheel = [
    '#f7f7f7',
    '#d9d9d9',
    '#bdbdbd',
    '#969696',
    '#737373',
    '#525252'
    //'#252525'
];
var medalColors = ["#a17419",'#b7b7b7',"#d5a500"];
var medalCountColor = d3.scaleLinear()
    .range(["#f7f7f7", "#525252"]);
var max;

function dataAggregateTransform(data, _filter) {
    if(!data){
        return [];
    }

    if(_filter) {
        return _.map(_filter.selectedCountries(), function (countryName) {
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

            return {
                'country': countryName,
                'gold': filteredAggregates.length > 0 ? filteredAggregates[0][0]:0,
                'silver': filteredAggregates.length > 0 ? filteredAggregates[0][1]:0,
                'bronze': filteredAggregates.length > 0 ? filteredAggregates[0][2]:0
            };
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
                'bronze': filteredAggregates[2]
            };
        });
    }

}

function filter() {
    var rootElement, genderElement, medalElement, yearElement, legendElement;
    var drilldown;

    var options = {
        selectedCountries: [],

        selectedGenders: ['Male', 'Female'],
        genderOptions: ['Male', 'Female'],

        selectedMedalTypes: ['Gold', 'Silver', 'Bronze'],
        medalOptions: ['Gold', 'Silver', 'Bronze'],

        selectedYears: [1926, 2006],
        yearOptions: [1926, 2006]
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
            .html('Winter Olympic Medals Won by Country');

        var legendWidth = 500,
            legendHeight = 75;
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

        var pct = linspace(0, 100, 6).map(function(d) {
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
            .tickValues([0,20,40,60,80,96])
            .tickFormat(d3.format("d"));

        legendSvg.append("g")
            .attr("class", "legend axis")
            .attr("transform", "translate(50,20)")
            .call(legendAxis);

        var row = rootElement.append('div').attr('class', 'row');
        genderElement = row.append('div')
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

        yearElement = rootElement
            .append('div')
            .attr('class', 'row')
            .append('div')
            .attr('class', 'col-sm')
            .append('div').attr('class','slider-holder');
        setupSlider(
            options.yearOptions[0],
            options.yearOptions[1],
            function(lo,hi){
                options.yearOptions[0] = lo;
                options.yearOptions[1] = hi;
            },
            function(x){return colorWheel[2];})
    }

    function render() {
        if (!rootElement) {
            return;
        }

        genderElement.selectAll('label').attr('class', function (d) {
            return (options.selectedGenders.indexOf(d) > -1)
                ? 'btn btn-secondary active'
                : 'btn btn-secondary';
        });

        medalElement.selectAll('label').attr('class', function (d) {
            return (options.selectedMedalTypes.indexOf(d) > -1)
                ? 'btn btn-secondary active'
                : 'btn btn-secondary';
        });


    }

    function refresh() {
        render();
        if (drilldown) {
            drilldown.refresh(this);
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
        refresh()
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

    return _filter;
}

function map() {
    var rootElement, svgElement, countryGroupElement;
    var currentData, filter;

    var width = 500,
        height = 500,
        projection,
        colorScale = d3.scaleLinear()
            .domain([0, 300])
            .range([colorWheel[0], colorWheel[6]]);


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
    }

    function render() {
        projection = d3.geoMercator()
            .scale(100)
            .translate([width / 2, height / 2]);
        var geoPath = d3.geoPath().projection(projection);

        countryGroupElement
            .attr("class", "countries")
            .selectAll("path")
            .data(currentData.atlas.features)
            .enter().append("path")
            .attr("d", geoPath)
            .style("fill", function (d) {
                var countryStats = _.find(currentData.medalCounts, {'country': d.properties.name});
                var medalCount = countryStats ? countryStats['count'] : 0

                return colorScale(medalCount);
            })
            .style('stroke', '#f7f7f7')
            .style('stroke-width', 0.3)
            .on('mouseover', function (d) {
                d3.select(this)
                    .style("opacity", .8)
                    .style("stroke", "#252525");
            })
            .on('mouseout', function (d) {
                d3.select(this)
                    .style("opacity", 1)
                    .style("stroke", "#f7f7f7")
                    .style("stroke-width", 0.3);
            })
            .on('click', function (d) {
                if (filter) {
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
            render();
        });
    }

    _map.setFilter = function (value) {
        filter = value;
        return _map;
    }
    _map.colorScale = function (value) {
        if (!arguments.length) return colorScale;
        colorScale = value;
        return _map;
    }

    return _map;
}

function drilldown() {
    var rootElement, countryElement, stackedBarElement;
    var currentData;
    var _filter;
    var width = 500,
        height = 800;
    var y = d3.scaleLinear()
        .rangeRound([450, 0]);


    var medalColorScale = d3.scaleOrdinal()
        .range(medalColors)
        .domain(['bronze','silver','gold']);

    function init(parent) {
        rootElement = d3.select(parent)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        countryElement = rootElement.append('g')
            .attr('width', 300)
            .attr('height', 350)
            .attr("transform", "translate(0,700) rotate(-90)");

        stackedBarElement = rootElement.append('g')
            .attr('width', 300)
            .attr('height', 450);

    }

    function render() {

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

        var data = dataAggregateTransform(currentData,_filter);

        var layers = d3.stack()
            .keys(['bronze','silver','gold'])
            (data);

        var layer = stackedBarElement.selectAll(".layer")
            .data(layers);

        var newLayers = layer.enter().append("g")
            .attr("class", "layer")
            .attr("transform", "translate(0,50)")
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