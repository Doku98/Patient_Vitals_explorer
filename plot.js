d3.csv("reduced_vitals.csv").then(data => {
    data.forEach(d => {
      d.caseid = +d.caseid;  // force to number
      d.time_sec = +d.time_sec;
      d.value = +d.value;
      d.norm_time = +d.norm_time;
      d.stability_index = +d.stability_index;
    });
  
    const signalsToShow = ["map", "hr", "spo2"];
  
    const nested = d3.group(data, d => d.caseid);
    const patientFilter = d3.select("#patientFilter");
  
    console.log("Unique patient IDs:", Array.from(nested.keys()));
  
    patientFilter
      .selectAll("option")
      .data(Array.from(nested.keys()))
      .join("option")
      .attr("value", d => d)
      .text(d => "Patient " + d);
  
    patientFilter.on("change", () => {
      const selectedId = +patientFilter.property("value");
      console.log("Patient selected from dropdown:", selectedId);
      drawChart(selectedId);
    });
  
    function drawChart(patientId) {
      const patientData = data.filter(d => d.caseid === patientId && signalsToShow.includes(d.signal));
      
      console.log("Drawing chart for Patient ID:", patientId);
      console.log("Available signals:", Array.from(new Set(data.filter(d => d.caseid === patientId).map(d => d.signal))));
      console.log("Filtered data length:", patientData.length);
      if (patientData.length === 0) {
        console.warn("No valid signals found for this patient!");
        return;
      }
  
      const svg = d3.select("svg");
      svg.selectAll("*").remove();
      const margin = {top: 20, right: 150, bottom: 30, left: 50};
      const width = +svg.attr("width") - margin.left - margin.right;
      const height = +svg.attr("height") - margin.top - margin.bottom;
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  
      const x = d3.scaleLinear().domain(d3.extent(patientData, d => d.time_sec)).range([0, width]);
      const y = d3.scaleLinear().domain([0, d3.max(patientData, d => d.value)]).range([height, 0]);
  
      const color = d3.scaleOrdinal().domain(signalsToShow).range(d3.schemeSet1);
  
      g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
      g.append("g").call(d3.axisLeft(y));
  
      const line = d3.line()
        .x(d => x(d.time_sec))
        .y(d => y(d.value));
  
      const signalGroups = d3.group(patientData, d => d.signal);
      for (const [signal, values] of signalGroups) {
        g.append("path")
          .datum(values)
          .attr("fill", "none")
          .attr("stroke", color(signal))
          .attr("stroke-width", 1.8)
          .attr("d", line);
  
        svg.selectAll(".dot-" + signal)
          .data(values)
          .join("circle")
          .attr("class", "dot-" + signal)
          .attr("cx", d => x(d.time_sec) + margin.left)
          .attr("cy", d => y(d.value) + margin.top)
          .attr("r", 3)
          .attr("fill", color(signal))
          .on("mouseover", (event, d) => {
            const mean = d3.mean(values, v => v.value);
            const std = d3.deviation(values, v => v.value) || 1;
            const z = ((d.value - mean) / std).toFixed(2);
  
            d3.select("#tooltip")
              .style("left", (event.pageX + 15) + "px")
              .style("top", (event.pageY - 28) + "px")
              .style("opacity", 1)
              .html(
                `<strong>Signal:</strong> ${d.signal}<br/>
                 <strong>Time (s):</strong> ${d.time_sec}<br/>
                 <strong>Value:</strong> ${d.value}<br/>
                 <strong>Z-Score:</strong> ${z}<br/>
                 <strong>Stability Index:</strong> ${d.stability_index.toFixed(3)}`
              );
          })
          .on("mouseout", () => d3.select("#tooltip").style("opacity", 0));
      }
  
      const legend = svg.append("g")
        .attr("transform", `translate(${width + margin.left + 10}, ${margin.top})`);
      signalsToShow.forEach((signal, i) => {
        legend.append("circle")
          .attr("cx", 0).attr("cy", i * 20).attr("r", 5)
          .attr("fill", color(signal));
        legend.append("text")
          .attr("x", 10).attr("y", i * 20 + 4)
          .text(signal)
          .style("font-size", "12px");
      });
    }
  
    const defaultPatient = +patientFilter.property("value");
    console.log("Default patient selected:", defaultPatient);
    drawChart(defaultPatient);
  });
  