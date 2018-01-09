'use strict';

var viz = function() {

    function display(element, data) {
        var selectedCountries = [];

        var map = (function (rootElement, data, selectedCountries) {
            rootElement
                .append('svg')
                    .attr('class', 'map')
                .append('text')
                    .attr('x',100)
                    .attr('y',100)
                    .text('Map Element!');
        })(element, data, selectedCountries);

        var drilldown = (function (rootElement, data, selectedCountries) {
            rootElement
                .append('svg')
                    .attr('class', 'drilldown')
                .append('text')
                    .attr('x',100)
                    .attr('y',100)
                    .text('Drilldown Element');
        })(element, data, selectedCountries);

    };

    function chart(selection) {
        selection.each(function (data) {
            display(
                d3.select(this),
                data
            );
        });
    }

    chart.selectCountries = function(){
        return selectedCountries;
    }

    return chart;
}();