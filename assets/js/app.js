
	var methodDropdown = document.getElementById("methodDropdown");
	// var tensionSlider = document.getElementById("tensionSlider");
	var testdataDropdown = document.getElementById("testdataDropdown");
	
	// var method =  methodDropdown.options[methodDropdown.selectedIndex].value;
	// var tension = tensionSlider.value;
	// updateInterp(method, tension);
	
	// SET DEFAULTS
	//methodDropdown.selectedIndex = 0;
	//tensionSlider.value = 0.5;
	//testdataDropdown.selectedIndex = 0;
	
	$(methodDropdown).on('change', function() {
		var method =  methodDropdown.options[methodDropdown.selectedIndex].value;
		// var tension = tensionSlider.value;
		inputPlot.updateInterp(method);
	});
	
	// tensionSlider.oninput = function() {
		// tensionbox.innerHTML = tensionSlider.value;
		
		// var method =  methodDropdown.options[methodDropdown.selectedIndex].value;
		// // var tension = tensionSlider.value; console.log(tension);
		// updateInterp(method);
	// }


var inputPlot;


function linspace(start, end, n) {
	n = typeof n === "undefined" ? 500 : n;
	if (n <= 0) return [];
	var arr = Array(n-1);
	for (var i=0; i<=n-1; i++) {
		arr[i] = ((n-1-i)*start + i*end) / (n-1);
	}
	return arr;
}
	
// sample the drawn function
function drawnFunc(){
	var handles = inputPlot.sohandles; // sorted handles by x-value
	var x_array = linspace(handles.xmin, handles.xmax, 1000);
	
	var interp = new Interpolator();
	
	var y_array = interp.cubicHermite(x_array, handles.x, handles.y,  inputPlot.interpMethod, inputPlot.interpTension);
	return [x_array, y_array];
}

// perform something on the drawn function
function doSomething(y_arr){
	var z_arr = y_arr.map(y => Math.pow(y, 2) - 4*y);
	return z_arr;
}

function redrawPlots(){
	
	var [x_arr, y_arr] = drawnFunc();
	
	var trace_sampled = { name: "S", x: x_arr, y: y_arr, mode: 'markers' }
	var data = [ trace_sampled ];
	var layout = { title:'Sampled', xaxis: {title: "$ \\text{X} $"}, yaxis: {title:"$ \\text{Y} $"}, margin: {t:25, l:45, b:35, r:5} };
	Plotly.newPlot('graph2', data, layout);
	
	
	var new_y_arr = doSomething(y_arr);
	var trace_sampled = { name: "Z", x: x_arr, y: new_y_arr, mode: 'lines' }
	var data = [ trace_sampled ];
	var layout = { title:'Edited - $ Z = Y^{2} - 4Y $', xaxis: {title: "$ \\text{X} $"}, yaxis: {title:"$ \\text{Z} $"}, margin: {t:25, l:45, b:35, r:5} };
	Plotly.newPlot('graph3', data, layout);
	
}

$(document).ready(function(){
	
	// draggable points
	var init_data = {
		x: [0, 49, 50, 129, 130, 199, 200, 299, 300, 350],
		y: [0, 0, 10, 10, 0, 0, 35, 35, 0, 0],
		range: {x: [-50, 350], y: [-1, 80]}
	};
	var layout = {title:'Test', xaxis: {title: "$ \\text{X} $"}, yaxis: {title:"$ \\text{Y} $"}, margin: {t:25, l:45, b:35, r:15}};
	var callback = redrawPlots; // note callback doesn't get any parameters by default - important ones are inputPlot.sohandle, inputPlot.interpMethod, inputPlot.interpTension
	inputPlot = new PlotlyDraggable('graph1', init_data, layout, callback);
	inputPlot.callback(); // for first render

});


