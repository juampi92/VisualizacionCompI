var engine = {};

	// ************************
	// 		Canvas
	// ************************

	engine.MyCanvas = {
		el: document.getElementById('canvas'),
		context: null,
		init: function(){
			this.context = this.el.getContext('2d');

			// Inicializar canvas
			var $parent = $(this.el).parent();
			/*this.el.width = $parent.innerWidth() - 30;
			this.el.height = $parent.innerHeight() - 50;*/
		},
		reset: function(){
			this.el.width = this.el.width;
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
		}
	};

	// ************************************************
	// 						Imagen
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
			self.trigger("load");
		};
		
		if ( ! remote ) {
			this.img.src = this.src;
		} else {
			// Fetch base64 of remote Image
			$.getImageData({
				url: self.src,
				server: "./getImage.php",
				success: function(image){
					image.onload = self.img.onload;
					self.img = image;
					self.img.onload();
					self.trigger("remote");
				},
				error: function(xhr, text_status){
				  // Handle your error here
				  self.trigger("error",xhr,text_status);
				}
			});
		};
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
		if ( rgb.substr(0,1) == "#" ) return rgb; // Ya es hex

		var hex = "#";
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
	// 						PDI
	// ************************************************

	engine.Process = function( source ){
		this.source = source;
		this.events = {};

		return this;
	};

	engine.Process.prototype.loop = function(callback){ // Loop parejo
		var self = this;

		setTimeout(function(){
			var pixels_source = self.source.imgData.data,
	    		numPixels = self.source.width * self.source.height;

	    	self.source.loop(function(i,x,y,r,g,b){
	    		var rgb = callback(i,x,y);
			    pixels_source[i] = rgb.r;
			    pixels_source[i+1] = rgb.g; // Green
			    pixels_source[i+2] = rgb.b; // Blue
			    pixels_source[i+3] = 255; // Alpha
	    	});
	    	
			if ( self.events["end"] ) self.events["end"]();
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