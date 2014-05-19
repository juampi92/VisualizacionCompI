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
			console.log(Fractal.dimensions);

			if ( !Fractal.loaded || Fractal.busy ) return alert("El Fractal está ocupado");
			Fractal.busy = true;

			Fractal.lastTime = Date.now();

			Fractal.imagen = new engine.Imagen();
			var process = new engine.ProcessMulti("fractal.worker.js",Fractal.imagen,1,FractalProcessing);

			// Asignar paleta
			//process.on("paint",function(f){return self.paleta.getColor(f);});

			// Al terminar de procesar:
			process.on("end",function(){
				Fractal.busy = false;
				Fractal.lastTime = Date.now() - Fractal.lastTime;
				
				process.render();
				console.log("Tiempo: " + Fractal.lastTime);

				// Guardar imagen del fractal
				Fractal.imagen = process.source;				
				
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
			$lis.eq(1).find('span').html(Fractal.lastTime + "ms");
			var $dim = this.$els.Fractal.complejos;
			$dim.find('output[name="s_x"]').html(Fractal.dimensions.x.s);
			$dim.find('output[name="s_y"]').html(Fractal.dimensions.y.s);
			$dim.find('output[name="e_x"]').html(Fractal.dimensions.x.e);
			$dim.find('output[name="e_y"]').html(Fractal.dimensions.y.e);
		},
		getDimensions: function(){
			var $dim = this.$els.Fractal.complejos;
			return ret = {x: {
					s: parseFloat( $dim.find('output[name="s_x"]').html() ),
					e: parseFloat( $dim.find('output[name="e_x"]').html() )
				},y:{
					s: parseFloat( $dim.find('output[name="s_y"]').html() ),
					e: parseFloat( $dim.find('output[name="e_y"]').html() )
				}};
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