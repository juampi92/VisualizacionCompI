(function(){
	if ( !window.File || !window.FileReader || !window.FileList || !window.Blob)
		return alert('La API de Archivos no es compatible con tu navegador. Considera actualizarlo.');

	var Fractal = {
		loaded: false,
		imagen: null,
		tipo: "mandelbrot",
		busy: false,
		mode: 0,
		lastTime: 0,
		properties: {
			width:500,
			height:500
		},
		dimensions: {
			x:{s:0,e:0},
			y:{s:0,e:0}
		},
		iniciate: function(){
			Fractal.loaded = true;
			Fractal.resetDimentions();
			UI.setFractalprop();
		},
		clear: function(){
			Fractal.loaded = false;
			Fractal.imagen = null;
		},
		resetDimentions: function(){
			var d = fractal[Fractal.tipo].prototype.dim;
			Fractal.dimensions = {
				x:{s:d.x.s,e:d.x.e},
				y:{s:d.y.s,e:d.y.e}
			};
			UI.setDimensions();
		},
		render: function(){
			var self = this;

			Fractal.dimensions = UI.getDimensions();

			if ( !Fractal.loaded || Fractal.busy ) return alert("El Fractal está ocupado");
			if ( ! Fractal.paleta.loaded ) return alert("Cargar una paleta");
			Fractal.busy = true;
			UI.rendering();

			setTimeout(function(){
				Fractal.lastTime = Date.now();

				Fractal.imagen = new engine.Imagen();
				var process = new engine.ProcessMulti(
					"fractal.worker.js",
					Fractal.imagen,
					UI.getWorkers(),
					FractalProcessing);

				// Asignar paleta
				//process.on("paint",function(f){return self.paleta.getColor(f);});

				// Al terminar de procesar:
				process.on("end",function(){
					Fractal.busy = false;
					Fractal.lastTime = Date.now() - Fractal.lastTime;
					
					process.render();
					console.log("Tiempo: " + Fractal.lastTime);
					UI.setFractalprop();

					// Guardar imagen del fractal
					Fractal.imagen = process.source;				
					UI.rendered();
				});

				console.log(Fractal.properties);

				Fractal.imagen.create( Fractal.properties.width , Fractal.properties.height );

				//if ( Fractal.paleta.loaded ) {
				// Usar paleta		
					process.loop({ fractal_nom: Fractal.tipo },
						{x:0,y:0},
						{x:Fractal.properties.width,y:Fractal.properties.height},
						Fractal.dimensions,
						Fractal.paleta
					);
				//} else return alert("La paleta no está cargada");
			},100);
		},
		calcularZoom: function(pos,medidas){
			var offset_x = - Fractal.dimensions.x.s,
				offset_y = - Fractal.dimensions.y.s,
				w = Fractal.dimensions.x.e - Fractal.dimensions.x.s,
				h = Fractal.dimensions.y.e - Fractal.dimensions.y.s;

			Fractal.dimensions.x.s = ( pos.x / Fractal.properties.width ) * w - offset_x;
			Fractal.dimensions.y.s = ( pos.y / Fractal.properties.height ) * h - offset_y;
			Fractal.dimensions.x.e = ( ( pos.x + medidas ) / Fractal.properties.width ) * w - offset_x;
			Fractal.dimensions.y.e = ( ( pos.y + medidas ) / Fractal.properties.height ) * h - offset_y;

			UI.setDimensions();
		},
		calcularDesplazo: function(x,y){
			var offset_x = - Fractal.dimensions.x.s,
				offset_y = - Fractal.dimensions.y.s,
				w = Fractal.dimensions.x.e - Fractal.dimensions.x.s,
				h = Fractal.dimensions.y.e - Fractal.dimensions.y.s,
				desplazo = {
					h: ( x / Fractal.properties.width ) * w - offset_x - Fractal.dimensions.x.s,
					v: ( y / Fractal.properties.height ) * h - offset_y - Fractal.dimensions.y.s
				};

			
			Fractal.dimensions.x.s += desplazo.h;
			Fractal.dimensions.y.s += desplazo.v;
			Fractal.dimensions.x.e += desplazo.h;
			Fractal.dimensions.y.e += desplazo.v;

			console.log({h:desplazo.h,v:desplazo.v},{x:x,y:y});

			UI.setDimensions();
		},
		paleta: null
	};

	engine.MyCanvas.init(Fractal.properties.width,Fractal.properties.height);

	var UI = {
		$els: {},
		init: function(){
			this.$els.Fractal = {};
			this.$els.Fractal.fetchType = $("#fractalType");
			this.$els.Fractal.fileName = this.$els.Fractal.fetchType.children('a:first');
			this.$els.Fractal.selectType = this.$els.Fractal.fetchType.children('select#tipoFractal');
			this.$els.Fractal.settings = $("#FractalSettings");
			this.$els.Fractal.complejos = this.$els.Fractal.settings.find('ul#complejos');
			this.$els.Fractal.dims = {
				s_x: this.$els.Fractal.complejos.find('output[name="s_x"]'),
				s_y: this.$els.Fractal.complejos.find('output[name="s_y"]'),
				e_x: this.$els.Fractal.complejos.find('output[name="e_x"]'),
				e_y: this.$els.Fractal.complejos.find('output[name="e_y"]')
			};
			this.$els.Fractal.modo = this.$els.Fractal.settings.find("#modes .btn-group");

			this.$els.Fractal.workers = this.$els.Fractal.settings.find('input[name="workers"]');

			this.$els.paleta = { 
				divs: {
					select: $("#paletaSelect"),
					selected: $("#paletaSelected"),
					current: $("a#paleta")
				},
				forms: {
					select: $('select#palletSelect'),
					input: $('input#paletteInput')
				},
				slide: {
					list: $('ul#paletaShow'),
					button: $('a#paletaSlide')
				}
			};
			this.$els.paleta.forms.selectLoad = this.$els.paleta.divs.select.find('button');

			this.$els.Fractal.suave = this.$els.Fractal.settings.find('input#softTransition');
			this.$els.Fractal.renderButton = this.$els.Fractal.settings.find('button[name="render"]');
			this.$els.Fractal.renderButton.removeAttr("disabled");

			this.setEventos();
		},
		setEventos: function(){
			this.$els.Fractal.fileName.click(function(e){
				Fractal.clear();
				UI.fileSelect(false);
			});
			this.$els.paleta.divs.current.click(function(e){
				Fractal.paleta.clear();
				UI.paletaSelect(false);
			});
			this.$els.paleta.forms.selectLoad.click(function(e){
				Fractal.paleta.ajaxFetch( UI.$els.paleta.forms.select.val() );
			});
			this.$els.Fractal.renderButton.click(function(e){
				Fractal.render();
			});

			this.$els.Fractal.suave.on('change',function(e){
				Fractal.paleta.suavizado = e.currentTarget.checked;
			});
			Fractal.paleta.suavizado = this.$els.Fractal.suave[0].checked;

			this.$els.paleta.slide.button.click(UI.paletaSlide);

			this.$els.Fractal.modo.on('click','label',function(e){
				var $this = $(this),
					selected = $this.children('input').val();

				UI.$els.Fractal.modo.find('label.active').removeClass('active');
				$this.addClass("active");

				if ( selected == "zoom" )
					Fractal.mode = 0;
				else
					Fractal.mode = 1;
			});

			this.$els.Fractal.settings.find('span#resetDim').click(function(){
				Fractal.resetDimentions();
			});

			this.$els.Fractal.selectType.on('change',UI.typeChange);
			this.$els.paleta.forms.input.on('change',Fractal.paleta.loadFile);

			// Dispararse en la primera dibujada
			$(engine.MyCanvas.el).on('mousedown',UI.mouse.down);
			$(engine.MyCanvas.el).on('mouseup',UI.mouse.up);
			$(engine.MyCanvas.el).on('mousemove',UI.mouse.move);
		},
		typeChange: function(e){
			var v = $(e.target).val();
			if ( v != "" ) {
				UI.fileSelect(true);
				UI.$els.Fractal.fileName.children('small').html(e.target.selectedOptions[0].innerHTML);
				Fractal.tipo = v;
				Fractal.iniciate();
			}
		},
		fileSelect: function(activate){
			if ( ( activate == undefined ) || activate ){
				this.$els.Fractal.fileName.show();
				this.$els.Fractal.selectType.hide();
			} else {
				this.$els.Fractal.selectType.show().val("Elige Fractal");
				this.$els.Fractal.fileName.hide();
			}
		},
		mouse: {
			pressed: false,
			startPos:{x:0,y:0},
			endPos:{x:0,y:0},
			getCoords: function(e){
				var rect = engine.MyCanvas.el.getBoundingClientRect();
			    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
			},
			down: function(e){
				if ( UI.mouse.pressed ) return UI.mouse.up(e);
				if ( e.which != 1 ) return;
				
				UI.mouse.pressed = true;
				UI.mouse.startPos = UI.mouse.getCoords(e);
			},
			up: function(e){
				if ( !UI.mouse.pressed || e.which != 1 ) return;

				UI.mouse.pressed = false;
				UI.mouse.endPos = UI.mouse.getCoords(e);
				
				if ( Fractal.mode == 0 ) {
					var pos = {
						x: Math.min(UI.mouse.startPos.x,UI.mouse.endPos.x),
						y: Math.min(UI.mouse.startPos.y,UI.mouse.endPos.y)
					},
					width = Math.max(UI.mouse.startPos.x,UI.mouse.endPos.x) - pos.x,
					height = Math.max(UI.mouse.startPos.y,UI.mouse.endPos.y) - pos.y;

					Fractal.calcularZoom(pos,Math.max(width,height));
				} else
					Fractal.calcularDesplazo(UI.mouse.endPos.x - UI.mouse.startPos.x ,
											 UI.mouse.endPos.y - UI.mouse.startPos.y);

				Fractal.render();
			},
			move: function(e){
				if ( !UI.mouse.pressed ) return;

				var endPos = UI.mouse.getCoords(e),
					startPos = UI.mouse.startPos;

				engine.MyCanvas.renderImg( Fractal.imagen );
				
				var context = engine.MyCanvas.context;
				context.beginPath();

				if ( Fractal.mode == 0 ) {
					var pos = {
						x: Math.min(startPos.x,endPos.x),
						y: Math.min(startPos.y,endPos.y)
					},
					width = Math.max(startPos.x,endPos.x) - pos.x,
					height = Math.max(startPos.y,endPos.y) - pos.y;

				    context.rect(pos.x,pos.y, width,height);				    
				} else {
					context.moveTo(startPos.x,startPos.y);
      				context.lineTo(endPos.x,endPos.y);
				}

				context.lineWidth = 2;
			    context.strokeStyle = 'red';
			    context.stroke();
			}
		},
		paletaSelect: function(activate){
			if ( ( activate == undefined ) || activate ){
				this.$els.paleta.divs.select.hide();
				this.$els.paleta.divs.selected.show();
				this.paletaDraw();
			} else {
				this.$els.paleta.divs.selected.hide();
				this.$els.paleta.divs.select.show();
			}
		},
		setFractalprop: function(){
			var $lis = this.$els.Fractal.settings.find('ul#datos li');
			$lis.eq(0).find('span').html(Fractal.properties.width+"x"+Fractal.properties.height);
			var $time = $lis.eq(1).children('b');
			$time.children('span').remove();
			var $span = $('<span></span>');
			$span.html(Fractal.lastTime + "ms").addClass("animate new");
			$time.append( $span );
			$span.focus().removeClass("new");
		},
		setDimensions: function(){
			this.$els.Fractal.dims.s_x.html(Fractal.dimensions.x.s);
			this.$els.Fractal.dims.s_y.html(Fractal.dimensions.y.s);
			this.$els.Fractal.dims.e_x.html(Fractal.dimensions.x.e);
			this.$els.Fractal.dims.e_y.html(Fractal.dimensions.y.e);
		},
		getDimensions: function(){
			var $dim = this.$els.Fractal.dims;
			return ret = {x: {
					s: parseFloat( $dim.s_x.html() ),
					e: parseFloat( $dim.e_x.html() )
				},y:{
					s: parseFloat( $dim.s_y.html() ),
					e: parseFloat( $dim.e_y.html() )
				}};
		},
		getWorkers: function(){
			var v = parseInt(this.$els.Fractal.workers.val());
			if ( v < 1 || v > 20 ) {
				v = 1;
				this.$els.Fractal.workers.val(v);
			}
			return v;
		},
		rendering: function(){
			UI.$els.Fractal.renderButton.html("... rendering ...").attr("disabled","");
			$('body').addClass("cargando");
		},
		rendered: function(){
			UI.$els.Fractal.renderButton.html("Render").removeAttr("disabled");
			$('body').removeClass('cargando');
			$('#modes').show();
		},
		paletaSlide: function(){
			var lista = UI.$els.paleta.slide.list,
				boton = UI.$els.paleta.slide.button;
			if ( boton.hasClass("active") ){
				boton.removeClass("active");
				boton.html("Mostrar Paleta");
				lista.slideUp("slow");
			} else {
				boton.addClass("active");
				lista.slideDown("slow");
				boton.html("Ocultar Paleta");
			}
		},
		paletaDraw: function(){
			var $lista = this.$els.paleta.slide.list;
			
			$lista.empty();
			for (var i = 0; i < Fractal.paleta.json.length; i++) {
				var row = Fractal.paleta.json[i];
				$lista.append( $('<li></li>').html('<span class="color" style="background-color:rgb('+
					row[1].r+','+row[1].g+','+row[1].b+');"></span> ' + row[0]) );
			};
		}
	};
	
	Fractal.paleta = new engine.Paleta(UI);
	UI.init();
	Fractal.iniciate();


	function randomColor() {
		return {
			r: Math.round(Math.random()*255),
			g: Math.round(Math.random()*255),
			b: Math.round(Math.random()*255)
		};
	}

	var print = "[";
	for (var i = 0; i <= 90; i+=4) {
		var color = randomColor();
		print = print + '\n\t["'+i+'",{"r":'+color.r+',"g":'+color.g+',"b":'+color.b+'}],';
	};
	print = print + "\n]";

	console.log(print);	

})();