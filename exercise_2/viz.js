'use strict';
var colorWheel = [
    '#f7f7f7',
    '#d9d9d9',
    '#bdbdbd',
    '#969696',
    '#737373',
    '#525252',
    '#252525'
];
var medalColors = ["#d5a500", '#b7b7b7', "#a17419"];
function filter() {
    var rootElement, countryElement, genderElement, medalElement, yearElement;
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

    function init(parent) {
        rootElement = d3.select(parent)
            .append('div')
            .attr('class', 'col-sm');

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
        .rangeRound([450, 0])
        .domain([0, d3.max(_filter.filteredData(), function(d) { return d.total; })])
        .nice();

    var medalColorScale = d3.scaleOrdinal()
        .range(medalColors)
        .domain(['Gold', 'Silver', 'Bronze']);

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
            .attr('height', 50)
            .attr('width', 200)
            .attr('x', 0)
            .attr('y', function (d, i) {
                return i * 50;
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


    }

    function _drilldown(selection) {
        selection.each(function (data, i) {
            currentData = data;
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
    var medalCountColor = d3.scaleLinear()
        .domain([0, 350])
        .range(["#f7f7f7", "#252525"]);

    function _viz(selection) {
        selection.each(function (data, i) {
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