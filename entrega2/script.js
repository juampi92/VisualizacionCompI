(function(){
	if ( !window.File || !window.FileReader || !window.FileList || !window.Blob)
		return alert('La API de Archivos no es compatible con tu navegador. Considera actualizarlo.');

	var Fractal = {
		loaded: false,
		imagen: null,
		tipo: "mandelbrot",
		busy: false,
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
			Fractal.dimensions = fractal[Fractal.tipo].prototype.dim;
			UI.setFractalprop();
			UI.setDimensions();
		},
		clear: function(){
			Fractal.loaded = false;
			Fractal.imagen = null;
			Fractal.file = null;
			Fractal.properties = {};
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
		change: function(){
			console.log("Cambio");
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

			this.$els.Fractal.selectType.on('change',Fractal.change);
			this.$els.paleta.forms.input.on('change',Fractal.paleta.loadFile);
		},
		fileSelect: function(activate){
			if ( ( activate == undefined ) || activate ){
				this.$els.Fractal.fileName.show();
				this.$els.Fractal.selectType.hide();
			} else {
				this.$els.Fractal.selectType.show();
				this.$els.Fractal.fileName.hide();
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

})();