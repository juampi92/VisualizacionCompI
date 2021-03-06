(function(){
	if ( !window.File || !window.FileReader || !window.FileList || !window.Blob)
		return alert('La API de Archivos no es compatible con tu navegador. Considera actualizarlo.');

	var UI,HGT;

	HGT = {
		loaded: false,
		array: null,
		file: null,
		busy: false,
		properties: {},
		calculateProp: function(){
			if ( !HGT.loaded ) return;
			HGT.properties.w = HGT.properties.h = Math.sqrt(HGT.array.length);

			var max = 0;
			for (var i = 0; i < HGT.array.length; i++)
					max = Math.max(HGT.array[i],max);
			HGT.properties.max = max;

			// Render this
			UI.setHGTprop(HGT.properties.w , HGT.properties.max);
		},
		iniciate: function(arrayBuffer){
			HGT.array = new Uint16Array(arrayBuffer); // Ancho de palabra de 16 bits sin signo
			HGT.loaded = true;
			HGT.calculateProp();
		},
		loadFile: function(evt){
			var f = evt.target.files[0];

			if (!f) return alert("Error al tratar de abrir el archivo");

			var r = new FileReader();

			HGT.file = f;

			r.onload = function(e) {
				HGT.iniciate(e.target.result);
				UI.fileSelect(true);
				UI.$els.HGT.fileName.children('small').html(HGT.file.name);
			};
			r.readAsArrayBuffer(f);
		},
		clear: function(){
			HGT.loaded = false;
			HGT.array = null;
			HGT.file = null;
			HGT.properties = {};
		},
		render: function(){
			if ( !HGT.loaded || HGT.busy ) return alert("El HGT está ocupado");
			HGT.busy = true;
			
			var img = new engine.Imagen();
				process = new engine.Process(img);

			// Al terminar de procesar:
			process.on("end",function(){
				HGT.busy = false;
				process.render();
			});

			img.create( HGT.properties.w , HGT.properties.h );

			if ( HGT.paleta.loaded ) {
			// Usar paleta
				
				var it = 0,
					factor_max = HGT.paleta.json[HGT.paleta.json.length-1][0];

				process.loop(function(i,x,y){

					var altura = HGT.array[it],
						factor = factor_max * (altura / HGT.properties.max );
					it++;

					return HGT.paleta.getColor(factor);					
				});

			} else {
			// Dinamica
				var it = 0;
				process.loop(function(i,x,y){

					var altura = HGT.array[it],
						color = 255 * (altura / HGT.properties.max);

					it++;
					
					return {r:color,g:color,b:color};
				});
			}
		},
		paleta: null
	};

	engine.MyCanvas.init();

	UI = {
		$els: {},
		init: function(){
			this.$els.HGT = {};
			this.$els.HGT.fileInput = $('#HGTfileInput');
			this.$els.HGT.fetchFile = $("#HGTfetchFile");
			this.$els.HGT.settings = $("#HGTsettings");
			this.$els.HGT.fileName = this.$els.HGT.settings.children('a:first');

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

			this.$els.HGT.suave = this.$els.HGT.settings.find('input#softTransition');
			this.$els.HGT.renderButton = this.$els.HGT.settings.find('button[name="render"]');

			this.setEventos();
		},
		setEventos: function(){
			this.$els.HGT.fileName.click(function(e){
				HGT.clear();
				UI.fileSelect(false);
			});
			this.$els.paleta.divs.current.click(function(e){
				HGT.paleta.clear();
				UI.paletaSelect(false);
			});
			this.$els.paleta.forms.selectLoad.click(function(e){
				HGT.paleta.ajaxFetch( UI.$els.paleta.forms.select.val() );
			});
			this.$els.HGT.renderButton.click(function(e){
				HGT.render();
			});

			this.$els.HGT.suave.on('change',function(e){
				HGT.paleta.suavizado = e.currentTarget.checked;
			});
			HGT.paleta.suavizado = this.$els.HGT.suave.checked;

			this.$els.paleta.slide.button.click(UI.paletaSlide);

			this.$els.HGT.fileInput.on('change',HGT.loadFile);
			this.$els.paleta.forms.input.on('change',HGT.paleta.loadFile);
		},
		fileSelect: function(activate){
			if ( ( activate == undefined ) || activate ){
				this.$els.HGT.fetchFile.hide();
				this.$els.HGT.settings.show();
			} else {
				this.$els.HGT.settings.hide();
				this.$els.HGT.fetchFile.show();
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
		setHGTprop: function(w,max){
			var $lis = this.$els.HGT.settings.find('ul#datos li');
			$lis.eq(0).find('span').html(w+"x"+w);
			$lis.eq(1).find('span').html(max);
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
			for (var i = 0; i < HGT.paleta.json.length; i++) {
				var row = HGT.paleta.json[i];
				$lista.append( $('<li></li>').html('<span class="color" style="background-color:rgb('+
					row[1].r+','+row[1].g+','+row[1].b+');"></span> ' + row[0]) );
			};
		}
	};

	HGT.paleta = new engine.Paleta(UI);
	UI.init();

})();