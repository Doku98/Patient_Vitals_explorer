d3.csv("reduced_vitals.csv").then(data => {
    data.forEach(d => {
      d.caseid = +d.caseid;
      d.time_sec = +d.time_sec;
      d.value = +d.value;
      d.norm_time = +d.norm_time;
      d.stability_index = +d.stability_index;
    });
  
    const nested = d3.group(data, d => d.caseid);
    const patientFilter = d3.select("#patientFilter");
  
    patientFilter
      .selectAll("option")
      .data(Array.from(nested.keys()))
      .join("option")
      .attr("value", d => d)
      .text(d => "Patient " + d);
  
    patientFilter.on("change", () => {
      const selectedId = +patientFilter.property("value");
      drawChart(selectedId);
    });
  
    function drawChart(patientId) {
      const patientData = data.filter(d => d.caseid === patientId);
      const stabilityPoints = Array.from(
        d3.group(patientData, d => d.time_sec),
        ([time, entries]) => {
          const map = entries.find(e => e.signal === "map")?.value ?? null;
          const hr = entries.find(e => e.signal === "hr")?.value ?? null;
          const spo2 = entries.find(e => e.signal === "spo2")?.value ?? null;
          const stability = entries[0]?.stability_index ?? null;
          return { time_sec: +time, map, hr, spo2, stability_index: stability };
        }
      ).filter(d => d.stability_index != null);
  
      const svg = d3.select("svg");
      svg.selectAll("*").remove();
      const margin = {top: 20, right: 200, bottom: 30, left: 50};
      const width = +svg.attr("width") - margin.left - margin.right;
      const height = +svg.attr("height") - margin.top - margin.bottom;
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  
      const x = d3.scaleLinear()
        .domain(d3.extent(stabilityPoints, d => d.time_sec))
        .range([0, width]);
  
      const y = d3.scaleLinear()
        .domain([0, d3.max(stabilityPoints, d => d.stability_index)])
        .range([height, 0]);
  
      g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
      g.append("g").call(d3.axisLeft(y));
  
      const line = d3.line()
        .x(d => x(d.time_sec))
        .y(d => y(d.stability_index));
  
      g.append("path")
        .datum(stabilityPoints)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", line);
  
      svg.selectAll(".dot")
        .data(stabilityPoints)
        .join("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.time_sec) + margin.left)
        .attr("cy", d => y(d.stability_index) + margin.top)
        .attr("r", 4)
        .attr("fill", "steelblue")
        .on("mouseover", (event, d) => {
          d3.select("#tooltip")
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 28) + "px")
            .style("opacity", 1)
            .html(
              `<strong>Time:</strong> ${d.time_sec}s<br/>
               <strong>Stability Index:</strong> ${d.stability_index.toFixed(3)}<br/><br/>
               <strong>MAP:</strong> ${d.map ?? "N/A"}<br/>
               <strong>HR:</strong> ${d.hr ?? "N/A"}<br/>
               <strong>SpO₂:</strong> ${d.spo2 ?? "N/A"}`
            );
        })
        .on("mouseout", () => d3.select("#tooltip").style("opacity", 0));
    }
  
    const defaultPatient = +patientFilter.property("value");
    drawChart(defaultPatient);
  });
  