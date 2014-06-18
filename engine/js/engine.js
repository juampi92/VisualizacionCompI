var engine = {};

	// ************************
	//		Canvas
	// ************************

	engine.MyCanvas = {
		el: document.getElementById('canvas'),
		backup: null,
		context: null,
		init: function(w,h){
			this.context = this.el.getContext('2d');

			// Inicializar canvas
			var $parent = $(this.el).parent();

			if ( w !== undefined ) {
				this.el.width = w;
				this.el.height = h;
			} else {
				this.el.width = $parent.innerWidth() - 30;
				this.el.height = $parent.innerHeight() - 30;
			}

			this.backup = document.createElement('canvas');
			this.backup.width = this.el.width;
			this.backup.height = this.el.height;
		},
		reset: function(){
			this.el.width = this.el.width;
		},
		renderCanvas: function( canvas , keep ){
			if ( ! keep ) engine.MyCanvas.reset();

			engine.MyCanvas.context.drawImage( canvas , 0,0 );
		},
		renderImg: function( imag , keep ){
			// Clear screen
			if ( ! keep ) engine.MyCanvas.reset();
			
			// Resize to fit Image:
			/*if ( engine.MyCanvas.el.width < imag.width ) {
				var ratio = engine.MyCanvas.el.width / imag.width;
				imag.width = engine.MyCanvas.el.width;
				imag.height = imag.height * ratio;
			} else if ( engine.MyCanvas.el.height < imag.height ){
				var ratio = engine.MyCanvas.el.height / imag.height;
				imag.height = engine.MyCanvas.el.height;
				imag.width = imag.width * ratio;
			}*/ // Aprender a hacer resize en imagen

			this.el.width = imag.width;
			this.el.height = imag.height;

			/*var x = ( engine.MyCanvas.el.width - imag.width ) / 2,
				y = ( engine.MyCanvas.el.height - imag.height ) / 2;*/

			engine.MyCanvas.context.putImageData( imag.imgData , 0,0 );
		},
		getCurrentData: function(){
			return this.context.getImageData(0, 0, engine.MyCanvas.el.width, engine.MyCanvas.el.height);
		},
		drawTriangle: function(p1,p2,p3,color){
			var ctx = this.backup.getContext('2d'),
				h = this.el.height;

			ctx.beginPath();
			ctx.moveTo(p1.x,h - p1.y);
			ctx.lineTo(p2.x,h - p2.y);
			ctx.lineTo(p3.x,h - p3.y);
			ctx.fillStyle = '#' + color;
			ctx.fill();
		},
		done: function(){
			this.renderCanvas(this.backup,false);
			this.backup.width = this.el.width;
		}
	};

	// ************************************************
	//						Imagen
	// ************************************************

	engine.Imagen = function( src ){
		this.img = new Image();
		this.loaded = false;
		this.src = src;
		this.imgData = null;
		this.width = this.height = 0;
		this.histograma = null;
		this.onEvents = {};

		return this;
	};

	engine.Imagen.prototype.create = function( width , height ){
		// Create empty image
		var canvas = document.createElement('canvas');
		
		this.width = this.img.width = canvas.width = width;
		this.height = this.img.height = canvas.height = height;

		this.imgData = canvas.getContext('2d').createImageData(width,height);
	};

	engine.Imagen.prototype.load = function( onload , remote ) {
		var self = this;

		this.img.onload = function(){
			self.getImageData(onload);
			self.loaded = true;
			self.trigger('load');
		};
		
		if ( ! remote ) {
			this.img.src = this.src;
		} else {
			// Fetch base64 of remote Image
			$.getImageData({
				url: self.src,
				server: './getImage.php',
				success: function(image){
					image.onload = self.img.onload;
					self.img = image;
					self.img.onload();
					self.trigger('remote');
				},
				error: function(xhr, text_status){
					// Handle your error here
					self.trigger('error',xhr,text_status);
				}
			});
		}
	};

	engine.Imagen.prototype.clone = function(){
		var ret = new engine.Imagen();

		var canvas = document.createElement('canvas');
		
		ret.width = ret.img.width = canvas.width = this.width;
		ret.height = ret.img.height = canvas.height = this.height;

		var context = canvas.getContext('2d');

		context.putImageData(this.imgData,0,0);
		ret.imgData = context.getImageData(0, 0, this.width,this.height);
		return ret;
	};

	engine.Imagen.prototype.getImageData = function( onload ){
		var canvas = document.createElement('canvas');

		canvas.width = this.img.width;
		canvas.height = this.img.height;

		//Resize image:
		var w = this.img.width,
			h = this.img.height;

		if ( w > engine.MyCanvas.el.width ){
			h = ( ( engine.MyCanvas.el.width * h ) / w );
			w = engine.MyCanvas.el.width;
		}
		if ( h > engine.MyCanvas.el.height ){
			w = ( ( engine.MyCanvas.el.height * w ) / h );
			h = engine.MyCanvas.el.height;
		}

		w = Math.floor(w);
		h = Math.floor(h);

		var context = canvas.getContext('2d');
		context.drawImage(this.img,0,0,w,h);

		this.imgData = context.getImageData(0, 0, w,h);

		this.width = w;
		this.height = h;

		if ( onload ) onload(this);
	};

	engine.Imagen.prototype.loop = function(callback){
		var i = 0;
		for ( var y = 0 ; y < this.height ; y++ )
			for ( var x = 0 ; x < this.width ; x++ ){
				callback(i,x,y,this.imgData.data[i],this.imgData.data[i+1],this.imgData.data[i+2]);
				i += 4;
			}
	};

	engine.Imagen.prototype.selectiveLoop = function(from,to,callback){
		var i = from*4,
			coords_from = this.getCoordsFromPos(from),
			coords_to = this.getCoordsFromPos(to);

		for ( var y = coords_from.y ; y < coords_to.y ; y++ )
			for ( var x = 0 ; x < this.width ; x++ ){
				callback(i,x,y,this.imgData.data[i],this.imgData.data[i+1],this.imgData.data[i+2]);
				i += 4;
			}
	};

	engine.Imagen.prototype.resize = function(newWidth,newHeight){};

	engine.Imagen.prototype.getBase64 = function(){
		var canvas = document.createElement('canvas');
		canvas.width = this.width;
		canvas.height = this.height;

		var context = canvas.getContext('2d');

		context.putImageData(this.imgData,0,0);
		return canvas.toDataURL();
	};

	engine.Imagen.prototype.getPixelBase = function(x,y){
		return ((y - 1) * (this.img.width * 4)) + ((x - 1) * 4);
	};

	engine.Imagen.prototype.getCoordsFromPos = function(pos){ // IT's NOT DIVIDED BY 4
		return {y: Math.floor(pos/this.width), x: pos%this.width};
	};

	engine.Imagen.prototype.getColor = function(x,y) {
		var pixBase = this.getPixelBase(x,y);
		return {r:this.imgData.data[pixBase],
				g:this.imgData.data[pixBase+1],
				b:this.imgData.data[pixBase+2],
				a:this.imgData.data[pixBase+3]};
	};

	engine.Imagen.prototype.setPixel = function(x,y,color){
		var pixBase = this.getPixelBase(x,y);
		if ( ! $.isArray(color) && $.isNumeric(color) ) color = {r:color,g:color,b:color};

		this.imgData.data[pixBase] = color.r;
		this.imgData.data[pixBase+1] = color.g;
		this.imgData.data[pixBase+2] = color.b;
		this.imgData.data[pixBase+3] = 255;
	};

	engine.Imagen.prototype.HexToRGB = function(hex){
		// Check if rgb
		if ( $.isArray(hex) ) return hex; // Ya es rgb

		var rgb = {};
		rgb.r = parseInt(hex.substr(1,2),16);
		rgb.g = parseInt(hex.substr(3,2),16);
		rgb.b = parseInt(hex.substr(5,2),16);

		return rgb;
	};

	engine.Imagen.prototype.RGBtoHex = function(rgb){
		// Check if hex
		if ( rgb.substr(0,1) == '#' ) return rgb; // Ya es hex

		var hex = '#';
		hex += rgb.r.toString(16);
		hex += rgb.g.toString(16);
		hex += rgb.b.toString(16);

		return hex;
	};

	engine.Imagen.prototype.on = function( event, callback ){
		this.onEvents[event] = callback;
	};

	engine.Imagen.prototype.trigger = function(event , param1, param2, param3){
		if ( this.onEvents[event] ) this.onEvents[event](param1,param2,param3);
	};

	// ************************************************
	//					Process
	// ************************************************

	engine.Process = function( source ){
		this.source = source;
		this.events = {};

		return this;
	};

	engine.Process.prototype.loop = function(callback){ // Loop parejo
		var self = this;

		setTimeout(function(){
			var pixels_source = self.source.imgData.data;

			self.source.loop(function(i,x,y,r,g,b){
				var rgb = callback(i,x,y);
				pixels_source[i] = rgb.r;
				pixels_source[i+1] = rgb.g; // Green
				pixels_source[i+2] = rgb.b; // Blue
				pixels_source[i+3] = 255; // Alpha
			});
			
			if ( self.events['end'] ) self.events['end']();
			return;
		},0);
	};

	engine.Process.prototype.on = function( trigger , callback ){
		// Eventos: end
		this.events[trigger] = callback;
	};

	engine.Process.prototype.render = function(){
		engine.MyCanvas.renderImg(this.source);
	};

	// ************************************************
	//					ProcessMulti
	// ************************************************

	engine.ProcessMulti = function( worker_url , source , workers_count , func ){
		this.worker_url = worker_url;
		this.source = source;
		this.events = {};
		this.workers_count = workers_count || 1;
		this.ready = 0;
		this.workers = [];

		this.array = [];
		this.func = func;

		this.workers_time = [];
		return this;
	};

	engine.ProcessMulti.prototype = new engine.Process();

	engine.ProcessMulti.prototype.loop = function(params,start,end,dimensions,paleta){
		var self = this;

		if ( !window.Worker ) this.workers_count=1;

		// Calcular inicio, fin y tipo de Fractal. No usar 'callback'
		var from = start.y,
			to = 0,
			chunks = Math.ceil(end.y / this.workers_count);

		if ( this.workers_count == 1) {
			if ( ! window.Worker ) console.log('No se utilizarán Web Workers (multi-threads)');

			// Procesa la funcion deseada
			this.array = [];
			this.array[0] = this.func(params,start,end,dimensions,paleta);

			this.endLoop();
			return;
		}
		
		var _paleta = {json:paleta.json,suav:paleta.suavizado};

		this.workers = [];
		var dim_chunk = (dimensions.y.e-dimensions.y.s) / this.workers_count,
			dim_from = dimensions.y.s,
			onMessageFun = function(e){ self.endWork(e); };
		
		for (var j = 0; j < this.workers_count ; j++) {
			to = Math.min(from+chunks,end.y);


			this.workers_time[j] = Date.now();

			var worker = new Worker(this.worker_url);
			worker.onmessage = onMessageFun;

			// Getting the picture
			var _start = {x:start.x,y:from},
				_end = {x:end.x,y:to},
				_dimensions = {
					x:dimensions.x,
					y: {
						s: ( dim_from + dim_chunk*j ) ,
						e: ( dim_from + dim_chunk*(j+1) )
					}
				};

			// Laburá!
			worker.postMessage( {
				params: params,
				start: _start,
				end: _end,
				dimensions: _dimensions,
				paleta: _paleta,
				index:j });

			from = to;
		}
	};

	engine.ProcessMulti.prototype.endWork = function(e){
		var i = e.data.worker;
		console.log('Terminado el worker ' + i + '. Tiempo total de: ' + ( Date.now() - this.workers_time[i] ) +'ms' );
		this.ready++;
		this.array[i] = e.data.arr;

		if ( this.ready >= this.workers_count)
			this.endLoop();
		return;
	};

	engine.ProcessMulti.prototype.endLoop = function(){
		console.log('Terminado el Loop Multi-Thread. Acomodando la imagen');
		
		
		var pixels_source = this.source.imgData.data;

		var punt = 0,
			tiempo = Date.now();

		var px = 0;
		for (var i = 0; i < this.array.length; i++)
			for (var j = 0; j < this.array[i].length; j++) {
				pixels_source[px] = this.array[i][j];
				px++;
			}

		console.log('Retardo en Dibujar: ' + (Date.now() - tiempo) + 'ms.');

		if (this.events['end']) this.events['end']();
		return;
	};

	// ************************************************
	//						Paleta
	// ************************************************	

	engine.Paleta = function(UI){
		this.loaded = false;
		this.name = '';
		this.json = null;
		this.suavizado = false;
		this.UI = UI;
	};
	
	engine.Paleta.prototype = {
		loadFile: function(evt){
			var f = evt.target.files[0];

			if (!f) return alert('Error al tratar de abrir el archivo');

			var r = new FileReader();

			this.name = f.name;

			r.onload = function(e) {
				this.json = JSON.parse(e.target.result);
				this.loaded = true;
				this.UI.paletaSelect(true);
				this.UI.$els.paleta.divs.current.children('small').html(this.name);
			};
			r.readAsText(f);
		},
		ajaxFetch: function(dir){
			var self = this;
			$.getJSON( './paletas/' + dir + '.json', function(d) {
					self.loaded = true;
					self.name = dir + '.json';
					self.json = d;
					self.UI.paletaSelect(true);
					self.UI.$els.paleta.divs.current.children('small').html(self.name);
			}).fail(function() {
					alert( 'Error al cargar esa paleta' );
			});
		},
		getColor: function(factor){
			var monte = this.getMontecarlo(factor);

			if ( this.suavizado && monte > 0 && this.json[monte][0] != factor ) {
				var orig = this.json[monte-1],
					dest = this.json[monte],
					c1 = orig[1],
					c2 = dest[1],
					dist = dest[0] - orig[0],
					fact = factor - orig[0];
				return this.getSuavizado(c1,c2,fact,dist);
			} else
				return this.json[monte][1];
		},
		getMontecarlo: function(factor){
			var j = 0;
			for (j = 0; j < this.json.length-1; j++)
				if ( factor <= this.json[j][0] ) return j;
			return j;
		},
		getSuavizado: function(c1,c2,factor,dist){
			var diff = {r: c2.r - c1.r , g: c2.g - c1.g , b: c2.b - c1.b};
			return {r: c1.r + factor * diff.r / dist ,
					g: c1.g + factor * diff.g / dist ,
					b: c1.b + factor * diff.b / dist };
		},
		clear: function(){
			this.loaded = false;
			this.name = '';
			this.json = null;
		}
	};

	// ************************************************
	//						Utiles
	// ************************************************	

	engine.rgbToHex = function(r,g,b) {
		return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
	};
	engine.hexToRGB = function(hex) {
		return {
			r: parseInt(hex.substr(1,2),16),
			g: parseInt(hex.substr(3,2),16),
			b: parseInt(hex.substr(5,2),16)
		};
	};
