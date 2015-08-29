//# require=d3
function update(data) {
  show(data.toList());
}

function e2d3Show(updateFlag) {
    if (updateFlag) {
        e2d3.bind2Json(e2d3BindId, { dimension: "nested" }, show);
    } else {
        e2d3.addChangeEvent(e2d3BindId, e2d3Update, function () {
            e2d3.bind2Json(e2d3BindId, { dimension: "nested" }, show);
        });
    }

}
function e2d3Update(responce) {
    console.log("Begin e2d3Update");
    e2d3Show(true);
}



function show(data) {
  d3.select(root).selectAll('*').remove();
  
// Various accessors that specify the four dimensions of data to visualize.
function x(d) { return d.income; }
function y(d) { return d.lifeExpectancy; }
function radius(d) { return d.population; }
function color(d) { return d.region; }
function key(d) { return d.name; }
// Chart dimensions.
var margin = {top: 19.5, right: 19.5, bottom: 19.5, left: 29.5},
    width = 770 - margin.right,
    height = 460 - margin.top - margin.bottom;
// Various scales. These domains make assumptions of data, naturally.
var xScale = d3.scale.log().domain([300, 1e5]).range([0, width]),
    yScale = d3.scale.linear().domain([10, 85]).range([height, 0]),
    radiusScale = d3.scale.sqrt().domain([0, 5e8]).range([0, 40]),
    colorScale = d3.scale.category10();
// The x & y axes.
var xAxis = d3.svg.axis().orient("bottom").scale(xScale).ticks(12, d3.format(",d")),
    yAxis = d3.svg.axis().scale(yScale).orient("left");
// Create the SVG container and set the origin.
var svg = d3.select(root).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
// Add the x-axis.
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);
// Add the y-axis.
svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);
// Add an x-axis label.
svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height - 6)
    .text("income per capita, inflation-adjusted (dollars)");
// Add a y-axis label.
svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", 6)
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    .text("life expectancy (years)");
// Add the year label; the value is set on transition.
var label = svg.append("text")
    .attr("class", "year label")
    .attr("text-anchor", "end")
    .attr("y", height - 24)
    .attr("x", width)
    .text(1800);

// Load the data.
//d3.json("nations.json", function(nations) {
  var nations = [];
  var names = d3.set(data.map(function(d){return d.name;})).values();
  var types = d3.set(data.map(function(d){return d.type;})).values();
  names.forEach(function(nation)
  {
    var tmp = data.filter(function(d){return d.name === nation;});
    var obj = {name: nation, region: tmp[0].region};
    types.forEach(function(type)
    {
      var row = tmp.filter(function(d){return d.type === type;})[0];
      var years = d3.keys(row).filter(function(d){return d!=='type' && d!=='name' && d!=='region';});
      var coords = [];
      years.forEach(function(year)
      {
        if (row[year] !== '-')
        {
          coords.push([+year, +row[year]]);
        }
      });
      obj[type] = coords;
    });
    nations.push(obj);
  });
  // A bisector since many nation's data is sparsely-defined.
  var bisect = d3.bisector(function(d) { return d[0]; });
  // Add a dot per nation. Initialize the data at 1800, and set the colors.
  var dot = svg.append("g")
      .attr("class", "dots")
    .selectAll(".dot")
      .data(interpolateData(1800))
    .enter().append("circle")
      .attr("class", "dot")
      .style("fill", function(d) { return colorScale(color(d)); })
      .call(position)
      .sort(order);
  // Add a title.
  dot.append("title")
      .text(function(d) { return d.name; });
  // Add an overlay for the year label.
  var box = label.node().getBBox();
  var overlay = svg.append("rect")
        .attr("class", "overlay")
        .attr("x", box.x)
        .attr("y", box.y)
        .attr("width", box.width)
        .attr("height", box.height)
        .on("mouseover", enableInteraction);
  // Start a transition that interpolates the data based on year.
  svg.transition()
      .duration(30000)
      .ease("linear")
      .tween("year", tweenYear)
      .each("end", enableInteraction);
  // Positions the dots based on data.
  function position(dot) {
    dot .attr("cx", function(d) { return xScale(x(d)); })
        .attr("cy", function(d) { return yScale(y(d)); })
        .attr("r", function(d) { return radiusScale(radius(d)); });
  }
  // Defines a sort order so that the smallest dots are drawn on top.
  function order(a, b) {
    return radius(b) - radius(a);
  }
  // After the transition finishes, you can mouseover to change the year.
  function enableInteraction() {
    var yearScale = d3.scale.linear()
        .domain([1800, 2009])
        .range([box.x + 10, box.x + box.width - 10])
        .clamp(true);
    // Cancel the current transition, if any.
    svg.transition().duration(0);
    overlay
        .on("mouseover", mouseover)
        .on("mouseout", mouseout)
        .on("mousemove", mousemove)
        .on("touchmove", mousemove);
    function mouseover() {
      label.classed("active", true);
    }
    function mouseout() {
      label.classed("active", false);
    }
    function mousemove() {
      displayYear(yearScale.invert(d3.mouse(this)[0]));
    }
  }
  // Tweens the entire chart by first tweening the year, and then the data.
  // For the interpolated data, the dots and label are redrawn.
  function tweenYear() {
    var year = d3.interpolateNumber(1800, 2009);
    return function(t) { displayYear(year(t)); };
  }
  // Updates the display to show the specified year.
  function displayYear(year) {
    dot.data(interpolateData(year), key).call(position).sort(order);
    label.text(Math.round(year));
  }
  // Interpolates the dataset for the given (fractional) year.
  function interpolateData(year) {
    return nations.map(function(d) {
      return {
        name: d.name,
        region: d.region,
        income: interpolateValues(d.income, year),
        population: interpolateValues(d.population, year),
        lifeExpectancy: interpolateValues(d.lifeExpectancy, year)
      };
    });
  }
  // Finds (and possibly interpolates) the value for the specified year.
  function interpolateValues(values, year) {
    var i = bisect.left(values, year, 0, values.length - 1),
        a = values[i];
    if (i > 0) {
      var b = values[i - 1],
          t = (year - a[0]) / (b[0] - a[0]);
      return a[1] * (1 - t) + b[1] * t;
    }
    return a[1];
  }
}