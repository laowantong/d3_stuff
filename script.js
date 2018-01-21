d3.json("data.json", function(error, data) {
  if (error) throw error;
  // Global constants
  const
    BASE_URL = "https://github.com/isfates/maquettes/",
    TICK_ARRAY_FOR_WIDE_WIDTH = [
      [0, 0, 0.35, 0.45, 0.55, 0.65, 1.0],
      [0, 0, 0.1, 0.2, 0.3, 0.4, 1.0],
      [0, 0, 0.1, 0.2, 0.3, 0.4, 1.0],
      [0, 0, 0.1, 0.2, 0.3, 0.4, 1.0],
      [0, 0, 0.1, 0.2, 0.3, 0.4, 1.0],
      [0, 0, 0.1, 0.2, 0.3, 0.4, 1.0],
    ],
    TICK_ARRAY_FOR_NARROW_WIDTH = [
      [0, 0, 0.35, 0.45, 0.55, 0.65, 1.0],
      [-0.1, 0, 0.1, 0.2, 0.3, 0.4, 1.0],
      [-0.2, -0.1, 0, 0.1, 0.2, 0.3, 1.0],
      [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 1.0],
      [-0.4, -0.3, -0.2, -0.1, 0, 0.1, 1.0],
      [-0.4, -0.3, -0.2, -0.1, 0, 0.1, 1.0],
    ],
    MAX_DEPTH = TICK_ARRAY_FOR_WIDE_WIDTH[0].length - 1,
    CUMUL_POLICIES = {
      "modules": d => d.children ? 0 : 1,
      "volumes": d => d.hours,
      "ECTS": d => d.ECTS,
    },
    DEFAULT_CUMUL_POLICY = "modules",
    LOGOS = [
      "<span class=big>Management</span><br>franco-allemand et international",
      "Management de la<br><span class=big>logistique</span><br>internationale",
      "Management du<br><span class=big>tourisme</span><br>international",
      "<span class=big>Informatique</span><br>et ingénierie du <span class=big>web</span>",
      "Ingénierie des<br><span class=big>systèmes</span><br>intelligents communicants<br>et <span class=big>énergies</span>",
      "<span class=big>Génie</span><br><span class=big>mécanique</span>",
      "<span class=big>Génie civil</span><br>et management en Europe",
    ],
    PROGRAM_COLOR_SCALE = d3.scaleOrdinal([3,5,1,10,7,2,4].map(i => d3.schemeSet3[i])),
    MIDDLE_COLOR_SCALE = [0,1,2,3,4,5,6].map(i => d3.scaleLinear().range(["white", PROGRAM_COLOR_SCALE(i)])),
    MODULE_COLOR_SCALE = d3.scaleOrdinal(d3.schemePastel1)
  ;
  // Global variables (geometry)
  var
    unit_width,
    window_width,
    window_height,
    cell_width,
    cell_height,
    handle_height,
    x_scale = d3.scaleLinear(),
    y_scale = d3.scaleLinear(),
    tick_array,
    ticks
  ;
  // Global variables (topology)
  var
    cumul_policy = DEFAULT_CUMUL_POLICY,
    root = d3.partition()(d3.hierarchy(data["tree"]).sum(CUMUL_POLICIES[cumul_policy])),
    cell = root,
    previous_cell,
    previous_ancestors = [root],
    groups = d3.select("svg")
      .selectAll("g")
      .data(root.descendants()).enter()
      .append("g")
        .attr("class", d => d.data.nature)
        .on("click", update_focus)
        .call(function(group) {
          group.append("rect")
        })
  ;
  // Set color and multiline text of Program cells
  groups.filter(".program")
    .call(function(group) {
      group.select("rect")
        .style("fill", d => PROGRAM_COLOR_SCALE(d.data.index))
      ;
      group.append("foreignObject")
        .attr("style", "overflow:hidden")
        .append("xhtml:body")
          .html((d, i) => LOGOS[i])
    })
  ;
  // Set color and horizontal text of middle cells
  groups.filter(".year,.semester,.UE")
    .call(function(group) {
      group.select("rect")
        .style("fill", d => MIDDLE_COLOR_SCALE[d.data.program](d.data.ratio))
      ;
      group.append("svg:text")
        .text(d => d.data.name)
    })
  ;
  // Set color and HTML text of Module cells
  groups.filter(".module")
    .call(function(group) {
      group.select("rect")
        .style("fill", d => MODULE_COLOR_SCALE(d.data.category))
      ;
      group.append("foreignObject")
        .attr("style", "overflow:hidden")
        .append("xhtml:body")
          .html(d => `<div class="description"><h1><a href="${BASE_URL + d.data.anchor}" class="external_link" target="_blank">❐ </a>${d.data.name} </h1><h2>${d.data.ECTS} ECTS pour ${d.data.volumes}</h2><div class=details value=false></div></div>`)
    })
  ;
  // Create long vertical text (initially empty) of all narrow colums
  d3.select("svg")
    .append("g")
      .attr("class", "fixed")
      .selectAll("g")
        .data([1, 2, 3, 4]).enter()
        .append("text")
          .attr("class", i => `fixed_${i}`)
          .attr("visibility", "hidden")
          .call(function(text) {
            text.append("a")
              .attr("target", "_blank")
              .html("❐ ");
            text.append("tspan")
              .classed("label", true);
          })
  ;
  // Retrieve the title from the root node and display it in the header 
  d3.select("#header")
    .text(root.data.long_name)
    .on("click", () => update_focus(root))
  ;
  // Check the default cumul policy radio button
  d3.select(`input[value="${cumul_policy}"]`)
    .property("checked", true)
  ;
  // Make the radio buttons change the cumul policy
  d3.selectAll("input")
    .on("change", function () {
      cumul_policy = this.value;
      d3.partition()(root.sum(CUMUL_POLICIES[cumul_policy]));
      previous_cell = null;
      update_focus(cell)
    })
  ;

  update_dimensions();
  window.addEventListener("resize", update_dimensions);
  d3.select("#loader").remove();
  d3.select("#logo").remove();
  d3.selectAll("#background, #chart")
    .transition().duration(1000)
    .style("opacity", 1);

  function update_scales() {
    ticks = tick_array[cell.depth];
    x_scale.domain(Array.from([0,1,2,3,4,5,6]).map(i => i/6)).range(ticks.map(x => x * window_width));
    y_scale.domain([cell.x0, cell.x1]).range([handle_height, window_height - handle_height]);
    cell_width = d => x_scale(d.y1) - x_scale(d.y0);
    cell_height = d => y_scale(d.x1) - y_scale(d.x0);
    d3.select("#chart")
      .style("height", `${window_height - (cell.y0 && cell.x1 < 0.99 ? 0 : handle_height)}px`)
    ;
  }

  function update_group_geometry(group) {
    group.attr("transform", d => `translate(${x_scale(d.y0)},${y_scale(d.x0)})`)
      .select("rect")
        .attr("width", cell_width)
        .attr("height", cell_height)
    ;
    group.select(".module foreignObject")
      .attr("width", cell_width)
      .attr("height", cell_height)
  }

  function update_dimensions() {
    window_height = Math.max(640, window.innerHeight);
    window_width = Math.max(640, Math.min(window_height, window.innerWidth));
    unit_width = window_width / 10;
    tick_array = screen.width <= 640 ? TICK_ARRAY_FOR_NARROW_WIDTH : TICK_ARRAY_FOR_WIDE_WIDTH;
    handle_height = window_height / (screen.width <= 640 ? 15 : 20);
    update_scales();

    groups.call(update_group_geometry);

    d3.select("#chart").style("width", `${window_width}px`);

    // Update dimensions of header and footer
    let font_size = 0.6 * handle_height;
    d3.select("#background")
      .style("width", `${window_width}px`)
      .style("font-size", `${font_size}px`)
    ;
    // Update dimensions of multiline Program texts
    font_size = Math.min(unit_width / 3, window_height / 60);
    groups.filter(".program")
      .select("foreignObject")
        .attr("width", cell_width)
        .attr("height", cell_height)
        .style("font-size", `${font_size}px`)
    ;
    // Update dimensions of horizontal middle texts
    font_size = unit_width / 5;
    groups.filter(".year,.semester,.UE")
      .select("text")
        .attr("x", unit_width / 2)
        .attr("y", window_height / 100)
        .style("font-size", `${font_size}px`)
    ;
    // Update dimensions of vertical middle texts
    font_size = Math.min(unit_width / 2, window_height / 40);
    d3.selectAll(".fixed text")
      .attr("x", - window_height / 2)
      .attr("y", i => (ticks[i+1] + ticks[i]) * 5 * unit_width)
      .style("font-size", `${font_size}px`)
    ;
  }


  function update_focus(focus_cell) {
    // If the cell is clicked for the second time, it's equivalent to click its parent
    cell = (focus_cell === previous_cell) && focus_cell.parent ? focus_cell.parent : focus_cell;

    update_scales();

    // Recalculate the position of vertical texts
    d3.selectAll(".fixed text")
      .transition().duration(0)
      .delay(d3.event.altKey ? 5000 : 500)
      .attr("y", i => (ticks[i+1] + ticks[i]) * 5 * unit_width)
    ;
    // When all module heights are equals and the focus is on a Program, print them as a list
    d3.selectAll(".description")
        .classed("listing", cell.depth == 1 && cumul_policy == "modules")
    ;
    // Hide all vertical labels whose depth is greater than the clicked cell
    for (let i = cell.depth + 1; i < MAX_DEPTH; i++) {
      d3.select(".fixed_" + i)
        .attr("visibility", "hidden")
    };
    // Hide all vertical labels of the new ancestors of the clicked cell (including it)
    let new_ancestors = cell.ancestors().filter(d => !previous_ancestors.includes(d))
    new_ancestors.map(function(d) {
      d3.select(".fixed_" + d.depth)
        .attr("visibility", "hidden")
    })
    ;
    // Show all vertical labels of the new ancestors
    new_ancestors.map(function(d) {
      d3.select(".fixed_" + d.depth)
        .transition().duration(0)
        .delay(d3.event.altKey ? 5000 : 500)
        .attr("visibility", "visible")
      ;
      d3.select(`.fixed_${d.depth}>a`)
        .attr("xlink:href", BASE_URL + d.data.anchor);
      d3.select(`.fixed_${d.depth}>.label`)
        .text(d.data.long_name);
    })
    ;
    // Enable or disable details
    if (cell.depth >= 3) {
      let children_and_nephews = cell.parent.descendants();
      d3.selectAll(".module")
        .filter(d => children_and_nephews.includes(d))
        .select(".details[value=false]")
          .attr("value", true)
          .html(d => data["descriptions"][d.data.EC_id])
    } else {
      d3.selectAll(".details[value=true]")
        .attr("value", false)
        .html("")
    };
    // Show only horizontal labels whose depth is greater than the current cell's
    d3.selectAll(".program foreignObject,.year text,.semester text,.UE text")
      .attr("visibility", d => d.depth > cell.depth ? "visible" : "hidden")
    ;
    // Update group geometry
    groups.transition()
      .duration(d3.event.altKey ? 7000 : 700)
      .call(update_group_geometry)
    ;
    // Post-treatments
    d3.event.stopPropagation();
    previous_ancestors = cell.ancestors();
    previous_cell = cell;
  };

});
