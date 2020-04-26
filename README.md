# PlotlyJS Draggable Interactive Plots

[View Demo](https://amshenoy.github.io/plotlyjs-draggable)

## Usage

<link href="./plotly-draggable/draggable.css" rel="stylesheet" type="text/css"></link>
<script src="./plotly-draggable/draggable.js"></script>
<script src="./plotly-draggable/interpolator.js"></script>

'''javascript
  
  var inputPlot;
  
	// draggable points
	var init_data = {
		x: [0, 49, 50, 129, 130, 199, 200, 299, 300, 350],
		y: [0, 0, 10, 10, 0, 0, 35, 35, 0, 0],
		range: {x: [-50, 350], y: [-1, 80]}
	};
	var layout = {title:'Test'}; // Normal Plotly layout config
	var callback = redrawPlots; // note callback doesn't get any parameters by default - important ones are inputPlot.sohandle, inputPlot.interpMethod, inputPlot.interpTension
	inputPlot = new PlotlyDraggable('graph1', init_data, layout, callback);
	inputPlot.callback(); // for first render
  
  // sample the drawn function
  function drawnFunc(){
    var handles = inputPlot.sohandles; // sorted handles by x-value
    var x_array = linspace(handles.xmin, handles.xmax, 1000);
    var interp = new Interpolator();
    var y_array = interp.cubicHermite(x_array, handles.x, handles.y,  inputPlot.interpMethod, inputPlot.interpTension);
    return [x_array, y_array];
  }
  
  function redrawPlots(){
    var [x_arr, y_arr] = drawnFunc();

    var trace_sampled = { name: "S", x: x_arr, y: y_arr, mode: 'markers' }
    var data = [ trace_sampled ];
    var layout = { title:'Sampled', xaxis: {title: "$ \\text{X} $"}, yaxis: {title:"$ \\text{Y} $"}, margin: {t:25, l:45, b:35, r:5} };
    Plotly.newPlot('graph2', data, layout);
  }

'''
  
