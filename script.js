d3.json("data.json", function(error, data) {
  if (error) throw error;
  // Global constants
  const
    BASE_URL = "https://github.com/isfates/maquettes/",
    TICK_ARRAY_FOR_WIDE_WIDTH = [
      [-0.2, 0.1, 0.4, 0.5, 0.6, 0.7, 1.0],
      [-0.2, 0.1, 0.2, 0.3, 0.4, 0.5, 1.0],
      [-0.2, 0.1, 0.2, 0.3, 0.4, 0.5, 1.0],
      [-0.2, 0.1, 0.2, 0.3, 0.4, 0.5, 1.0],
      [-0.2, 0.1, 0.2, 0.3, 0.4, 0.5, 1.0],
      [-0.2, 0.1, 0.2, 0.3, 0.4, 0.5, 1.0],
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
      "modules": d => d.children ? 0 : (((language_filter & d.language_mask) != 0) & ((sharing_filter & d.sharing_mask) != 0) ? 1 : 0),
      "volumes": d => ((language_filter & d.language_mask) != 0) & ((sharing_filter & d.sharing_mask) != 0) ? d.hours : 0,
      "ECTS": d => ((language_filter & d.language_mask) != 0) & ((sharing_filter & d.sharing_mask) != 0) ? d.ECTS : 0,
    },
    RICH_PROGRAM_NAMES = [
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
    chart_width,
    chart_height,
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
    cumul_policy = "modules",
    language_filter = Math.pow(2, document.querySelectorAll('input[name="language_filter"]').length) - 1,
    sharing_filter = Math.pow(2, document.querySelectorAll('input[name="sharing_filter"]').length) - 1,
    root = d3.partition()(d3.hierarchy(data["tree"])).sum(CUMUL_POLICIES[cumul_policy]),
    cell = root,
    previous_cell,
    PANEL_OFFSET = -TICK_ARRAY_FOR_WIDE_WIDTH[0][0],
    panel_is_open = false,
    previous_ancestors = [root],
    groups = d3.select("svg")
      .selectAll("g")
      .data(root.descendants()).enter()
      .insert("g", "#panel")
        .attr("class", d => d.data.nature)
        .on("click", update_focus)
        .call(group => group.append("rect"))
  ;
  // WTF?
  d3.partition()(root);
  // Set color and multiline text of Program cells
  groups.filter(".program")
    .call(function(group) {
      group.select("rect").style("fill", d => PROGRAM_COLOR_SCALE(d.data.index));
      group.append("foreignObject")
        .attr("style", "overflow:hidden")
        .append("xhtml:body")
          .html((d, i) => RICH_PROGRAM_NAMES[i])
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
          .html(d => `<div class="description"><h1><span class="link_container"><a href="${BASE_URL + d.data.anchor}" class="external_link" target="_blank">❐</a>${d.data.name}</span></h1><h2>${d.data.volumes} = ${d.data.ECTS} ECTS</h2><div class=details value=false></div></div>`)
    })
  ;
  // Create vertical title on first column
  d3.select("svg")
    .insert("g", "#panel")
      .attr("class", "fixed")
      .selectAll("g")
        .data([0]).enter()
        .append("text")
          .attr("class", "fixed_0")
          .text(root.data.long_name)
  ;
  // Create long vertical text (initially empty) of all narrow colums
  d3.select(".fixed")
    .selectAll("g")
      .data([1, 2, 3, 4]).enter()
      .append("text")
        .attr("class", i => `fixed_${i}`)
        .attr("visibility", "hidden")
        .call(function(text) {
          text.append("a")
            .attr("xlink:href", null)
            .attr("target", "_blank")
            .classed("external_link", true) // FIXME: this class has no effect on the style
            .text("❐ ")
          text.append("tspan")
            .classed("label", true);
        })
  ;
  
  // Check the default cumul policy radio button
  d3.select(`input[value="${cumul_policy}"]`)
    .property("checked", true)
  ;
  // Make the radio buttons change the cumul policy
  d3.selectAll('input[name="accumulator"]')
    .on("change", function () {
      cumul_policy = this.value;
      update_cumul()
    })
  ;
  // Update the language filter
  d3.selectAll('input[name="language_filter"]')
    .on("change", function () {
      if (document.querySelectorAll('input[name="language_filter"]:checked').length) {
        language_filter ^= this.value;
        update_cumul()
      } else {
        this.checked = true
      }
    })
  ;
  // Update the sharing filter
  // TODO: factorize this with the previous
  d3.selectAll('input[name="sharing_filter"]')
    .on("change", function () {
      if (document.querySelectorAll('input[name="sharing_filter"]:checked').length) {
        sharing_filter ^= this.value;
        update_cumul()
      } else {
        this.checked = true
      }
    })
  ;

  update_dimensions();
  window.addEventListener("resize", update_dimensions);
  d3.select("#loader").remove();
  d3.select("#main").style("background", "black");
  d3.select("#chart").style("opacity", 1);
  d3.select("#toggle_icon").on("click", () => switch_panel());
  
  function update_cumul() {
    d3.partition()(root.sum(CUMUL_POLICIES[cumul_policy]));
    previous_cell = null;
    update_focus(cell)
  }
  
  function update_scales() {
    ticks = tick_array[cell.depth];
    handle_height = cell.x0 ? chart_height / (screen.width <= 640 ? 15 : 20) : 0;
    x_scale.domain(Array.from([0,1,2,3,4,5,6]).map(i => i/6)).range(ticks.map(x => x * chart_width));
    y_scale.domain([cell.x0, cell.x1]).range([handle_height, chart_height - handle_height]);
    cell_width = d => x_scale(d.y1) - x_scale(d.y0);
    cell_height = d => y_scale(d.x1) - y_scale(d.x0);
    d3.select("#chart").style("height", `${chart_height}px`);
  }

  function update_geometry(milliseconds) {
    groups
      .transition().duration(milliseconds)
      .attr("transform", d => `translate(${x_scale(d.y0)},${y_scale(d.x0)})`)
        .select("rect")
          .attr("width", cell_width)
          .attr("height", cell_height)
    ;
    groups.selectAll(".module foreignObject")
      .attr("width", cell_width)
      .attr("height", cell_height)
    ;
  }

  function update_dimensions() {
    chart_height = Math.max(640, window.innerHeight);
    chart_width = Math.max(640, Math.min(chart_height, window.innerWidth));
    unit_width = chart_width / 10;
    tick_array = screen.width <= 640 ? TICK_ARRAY_FOR_NARROW_WIDTH : TICK_ARRAY_FOR_WIDE_WIDTH;
    update_scales();
    update_geometry(0);

    d3.select("#chart").style("width", `${chart_width}px`);
    d3.select("#menu").style("height", `${chart_height}px`);

    // Update dimensions of multiline Program texts
    font_size = Math.min(unit_width / 3, chart_height / 60);
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
        .attr("y", chart_height / 100)
        .style("font-size", `${font_size}px`)
    ;
    // Update dimensions of vertical middle texts
    font_size = Math.min(unit_width / 2, chart_height / 40);
    d3.selectAll(".fixed text")
      .attr("x", - chart_height / 2)
      .attr("y", i => (ticks[i+1] + Math.max(0, ticks[i])) * 5 * unit_width)
      .style("font-size", `${font_size}px`)
    ;
    // Dimension the invisible container of the Settings' icon
    d3.select("#toggle_box")
      .style("width", `${unit_width}px`)
      .style("height", `${unit_width}px`)
    ;
    // Update dimensions of panel
    d3.select("#panel")
      .attr("x", -3 * unit_width)
      .attr("y", unit_width)
      .attr("width", 3 * unit_width)
      .attr("height", chart_height - unit_width)
    ;
  }


  function update_focus(focus_cell) {
    // If the cell is clicked for the second time, it's equivalent to click its parent
    cell = (focus_cell === previous_cell) && focus_cell.parent ? focus_cell.parent : focus_cell;

    update_scales();

    // Recalculate the position of vertical texts
    d3.selectAll(".fixed text")
      .transition().duration(0)
      .delay(500)
      .attr("y", i => (ticks[i+1] + Math.max(0, ticks[i])) * 5 * unit_width)
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
        .delay(500)
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
    // Post-treatments
    update_geometry(700);
    d3.event.stopPropagation();
    previous_ancestors = cell.ancestors();
    previous_cell = cell;
  };
  
  function switch_panel() {
    panel_is_open = !panel_is_open;
    var panel_offset = panel_is_open ? PANEL_OFFSET : -PANEL_OFFSET;
    if (panel_is_open) {
      d3.select(".fixed_0").attr("opacity", 0);
      d3.select("#toggle_icon").classed("open", true);
    }
    d3.select(".fixed_0").style("display", panel_is_open ? "none" : "block");
    tick_array = tick_array.map(row => row.map(x => x + panel_offset));
    update_scales();
    // Recalculate the position of vertical texts
    d3.selectAll(".fixed text")
      .transition().duration(700)
      .attr("y", i => (ticks[i+1] + Math.max(0, ticks[i])) * 5 * unit_width)
    ;
    d3.select("#panel")
      .transition().duration(700)
      .attr("x", (panel_offset * 10 - 2) / 2 * unit_width)
      .attr("opacity", panel_is_open ? 1 : 0)
    ;
    if (!panel_is_open) {
      d3.select(".fixed_0")
        .transition().duration(0)
        .delay(500)
        .attr("opacity", 1)
      d3.select("#toggle_icon").classed("open", false);
    }
    // Update group geometry
    update_geometry(700);
    ;
  }

});
