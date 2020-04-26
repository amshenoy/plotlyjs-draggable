
    function clamp(x, lower, upper) {
        return Math.max(lower, Math.min(x, upper));
    }

    function linspace(start, end, n) {
        n = typeof n === "undefined" ? 500 : n;
        if (n <= 0) return [];
        var arr = Array(n-1);
        for (var i=0; i<=n-1; i++) {
            arr[i] = ((n-1-i)*start + i*end) / (n-1);
        }
        return arr;
    }

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	
	var trash_svg = '<svg class="trash" width="20" height="20" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M704 736v576q0 14-9 23t-23 9h-64q-14 0-23-9t-9-23v-576q0-14 9-23t23-9h64q14 0 23 9t9 23zm256 0v576q0 14-9 23t-23 9h-64q-14 0-23-9t-9-23v-576q0-14 9-23t23-9h64q14 0 23 9t9 23zm256 0v576q0 14-9 23t-23 9h-64q-14 0-23-9t-9-23v-576q0-14 9-23t23-9h64q14 0 23 9t9 23zm128 724v-948h-896v948q0 22 7 40.5t14.5 27 10.5 8.5h832q3 0 10.5-8.5t14.5-27 7-40.5zm-672-1076h448l-48-117q-7-9-17-11h-317q-10 2-17 11zm928 32v64q0 14-9 23t-23 9h-96v948q0 83-47 143.5t-113 60.5h-832q-66 0-113-58.5t-47-141.5v-952h-96q-14 0-23-9t-9-23v-64q0-14 9-23t23-9h309l70-167q15-37 54-63t79-26h320q40 0 79 26t54 63l70 167h309q14 0 23 9t9 23z"/></svg>';

    /* We have 4 different types of handles:
        normal      standard draggable handle
        endpoint    only draggable in y direction, can't be deleted
        spawn       the dummy handle used for spawning new handles, not included in the interpolation
        hidden      like a normal handle but invisible, can't be moved or deleted
    */	

class PlotlyDraggable {
		
		
	  constructor(fig, initdata, layout, callback) {
			this.fig = fig;
			this.figElement = document.getElementById(fig);
			this.initdata = initdata;
			//this.layout = layout;
			this.callback = callback;
			
			this.interpMethod = 'Linear'; // Linear, FiniteDifference, Cardinal, FritschCarlson, FritschButland, Steffen
			this.interpTension = 0.5; // [0,1], only used for Cardinal splines
			
			this.firstx = initdata.x[0]; // Position of the leftmost breakpoint. Drag a handle beyond this to delete it.
			
			this.init(fig, layout); // load plot
			
			this.processData(); // create handles from initdata
			
			this.updateFigure();
			this.updatePointHandles();
			this.startDragBehavior();
		}
		  //////////////////
		  init(fig, layout){
			
			layout.showlegend = false;
			
			var interpline = { x: [1, 8], y: [1, 40], type: 'scatter', mode: 'lines', hoverinfo: 'none' }; //TBD HIDE/SHOW THIS IF CLASS PARAMETER
			var bps = { x: [1, 8], y: [5, 30], type: 'scatter', cliponaxis: false, mode: 'markers',
			marker: { size: 15, symbol: "circle-open-dot", color: '#b00', line: { width: 2 } }, hoverinfo: 'none'};
			
			var fe = this.figElement;
			fe.innerHTML = trash_svg;
			var trash = this.trash = fe.querySelector(".trash");
			
			Plotly.plot(fe, [interpline, bps], layout, {staticPlot: true});

			//var pc = figurecontainer.querySelector(".scatterlayer .trace:last-of-type g");
			var pc = fe.querySelector(".scatterlayer .trace:last-of-type .points");
			this.points = pc.getElementsByTagName("path");
			//console.log(points);
			
			var xsp = this.xspawn = 20; var ysp = this.yspawn = 90;       // pixel coordinates of the spawn handle
			var trashsize = trash.getAttribute("width");
			pc.parentNode.insertBefore(trash, pc);
			//console.log((xspawn - trashsize/2) + "," + (yspawn - trashsize/2 + 5));
			trash.setAttribute("transform", "translate(" + (xsp - trashsize/2) + "," + (ysp - trashsize/2 + 5) + ")");
			trash.setAttribute("display", "none");
			
		}
		
		processData(){
			this.handles = [];   // the global list of handles
			var id = this.initdata;
			
			Plotly.relayout(this.figElement, {
				'xaxis.range': id.range.x,
				'yaxis.range': id.range.y
			})
			var type;
			
			this.addHandle('spawn');
			for (var i=0, len = id.x.length; i < len; i++) {
				type = i == 0 || i == len-1 ? "endpoint" : "normal";
				this.addHandle(type, id.x[i], id.y[i]);
			}
		}
		
		updateInterp(interpMethod, interpTension=0){
			this.interpMethod = interpMethod;
			this.interpTension = interpTension;
			this.updateFigure();
			this.callback();
		}
		
		///////////////////////////////////////////////////////////////////////////
		////////////////////////// HANDLING HANDLES ///////////////////////////////
		///////////////////////////////////////////////////////////////////////////
		sortedHandles() {
			var hs = this.handles;
			hs.sort(function(a,b) {
				return a.x-b.x;
			});
			var x = [], y = [], xvis = [], yvis = [], xmin = Infinity, xmax = -Infinity;
			for (var i=0; i < hs.length; i++) {
				if (hs[i].type != 'spawn') {
					x.push(hs[i].x);
					y.push(hs[i].y);
					xmin = hs[i].x < xmin ? hs[i].x : xmin;
					xmax = hs[i].x > xmax ? hs[i].x : xmax;
				}
				if (hs[i].type != 'hidden') {
					xvis.push(hs[i].x);
					yvis.push(hs[i].y);
				}
			}
			return {x: x, y: y, xvis: xvis, yvis: yvis, xmin: xmin, xmax: xmax};
		}
		
		updateFigure() {
		
			var sortedhandles = this.sortedHandles();
			var xx = linspace(sortedhandles.xmin, sortedhandles.xmax, 1000); // TBD ADD 1000 as a parameter
			//var xx = linspace(sortedhandles.xmin, sortedhandles.xmax, (sortedhandles.xmax - sortedhandles.xmin)/(0.0001)) );
			
			var interp = new Interpolator();
			var yy = interp.cubicHermite(xx, sortedhandles.x, sortedhandles.y, this.interpMethod,this.interpTension); // TBD DON'T PERFORM THIS IF TOGGLE IS SET TO NO INTERPLINE
			
			Plotly.restyle(this.figElement, {'x': [xx, sortedhandles.xvis], 'y': [yy, sortedhandles.yvis]});
			
			this.sohandles = sortedhandles;			
		}

		updatePointHandles() {
			var handles = this.handles;
			for (var i=0, p=0; i < handles.length; i++) {
				if (handles[i].type != 'hidden') {
					this.points[p++].handle = handles[i];
				}
			}
		}

		destroyHandle(handle) {
			var i = this.handles.indexOf(handle);
			this.handles.splice(i,1);
			this.updateFigure();
		}

		// NOT USED
		// poofHandle(handle) {
			// Plotly.d3.select(this.points[0]).transition().duration(500)
				// .attr("transform", "translate(" + this.xspawn + "," + this.yspawn + ") scale(0)")
				// .each("end", function() {
					// destroyHandle(handle);
				// });
		// }

		addHandle(type, x, y) {
			if (type == 'spawn') {
				x = this.figElement._fullLayout.xaxis.p2l(this.xspawn);
				y = this.figElement._fullLayout.yaxis.p2l(this.yspawn);
			}
			var newhandle = {
				x: x,
				y: y,
				type: type
			};
			this.handles.push(newhandle);
			return newhandle;
		}
		
		///////////////////////////////////////
		/////// Handle Drag Behaviour /////////
		///////////////////////////////////////
		startDragBehavior() {
			var d3 = Plotly.d3;
			var drag = d3.behavior.drag();
			var plot = this;
			drag.origin(function() {
				var transform = d3.select(this).attr("transform");
				var translate = transform.substring(10, transform.length-1).split(/,| /);
				return {x: translate[0], y: translate[1]};
			});
			drag.on("dragstart", function() {
				if (this.handle.type != 'spawn') {
					plot.trash.setAttribute("display", "inline");
					plot.trash.style.fill = "rgba(0,0,0,.2)";
					plot.destroyHandle(plot.points[0].handle);
				}
			});
			drag.on("drag", function() {
				var xmouse = d3.event.x, ymouse = d3.event.y;
				d3.select(this).attr("transform", "translate(" + [xmouse, ymouse] + ")");
				var xaxis = plot.figElement._fullLayout.xaxis;
				var yaxis = plot.figElement._fullLayout.yaxis;
				var handle = this.handle;
				if (handle.type != 'endpoint') handle.x = clamp(xaxis.p2l(xmouse), xaxis.range[0], xaxis.range[1] - 1e-9);
				if (handle.type == 'spawn' && handle.x > plot.handles[1].x) {
					plot.trash.setAttribute("display", "inline");
					plot.trash.style.fill = "rgba(0,0,0,.2)";
					handle.type = 'normal';
				}
				handle.y = clamp(yaxis.p2l(ymouse), yaxis.range[0], yaxis.range[1]);
				if (handle.x < plot.firstx) {    // release from the interpolation if dragged beyond the leftmost breakpoint
					handle.type = 'spawn';
					plot.trash.style.fill = "#a00";              
				}
				plot.updateFigure();
			});
			drag.on("dragend", function() {
				if (this.handle.x < plot.firstx) plot.destroyHandle(this.handle);
				plot.addHandle('spawn');
				plot.updateFigure();
				plot.updatePointHandles();
				plot.trash.setAttribute("display", "none");
				d3.select(".scatterlayer .trace:last-of-type .points path:last-of-type").call(drag);   

				plot.callback();
			});
			d3.selectAll(".scatterlayer .trace:last-of-type .points path").call(drag);
		}
}
