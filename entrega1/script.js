(function(){
	if ( !window.File || !window.FileReader || !window.FileList || !window.Blob)
		return alert('La API de Archivos no es compatible con tu navegador. Considera actualizarlo.');

	var HGT = {
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
		paleta: {
			loaded: false,
			name: "",
			json: null,
			suavizado: false,
			loadFile: function(evt){
				var f = evt.target.files[0];

				if (!f) return alert("Error al tratar de abrir el archivo");

				var r = new FileReader();

				HGT.paleta.name = f.name;

				r.onload = function(e) {
					HGT.paleta.json = JSON.parse(e.target.result);
					HGT.paleta.loaded = true;
					UI.paletaSelect(true);
					UI.$els.paleta.divs.current.children('small').html(HGT.paleta.name);
				};
				r.readAsText(f);
			},
			ajaxFetch: function(dir){
				$.getJSON( "./paletas/" + dir + ".json", function(d) {
						HGT.paleta.loaded = true;
						HGT.paleta.name = dir + ".json";
						HGT.paleta.json = d;
						UI.paletaSelect(true);
						UI.$els.paleta.divs.current.children('small').html(HGT.paleta.name);

						console.log(HGT.paleta);
					})
					.fail(function() {
						alert( "Error al cargar esa paleta" );
				});
			},
			getColor: function(factor){
				var monte = HGT.paleta.getMontecarlo(factor);

				if ( this.suavizado && monte > 0 && HGT.paleta.json[monte][0] != factor ) {
					var orig = HGT.paleta.json[monte-1],
						dest = HGT.paleta.json[monte],
						c1 = orig[1],
						c2 = dest[1],
						dist = dest[0] - orig[0],
						fact = factor - orig[0];
					return HGT.paleta.getSuavizado(c1,c2,fact,dist);
				} else
					return HGT.paleta.json[monte][1];
			},
			getMontecarlo: function(factor){
				var j = 0;
				for (j = 0; j < HGT.paleta.json.length-1; j++)
					if ( factor <= HGT.paleta.json[j][0] ) return j;
				return j;
			},
			getSuavizado: function(c1,c2,factor,dist){
				var diff = {r: c2.r - c1.r , g: c2.g - c1.g , b: c2.b - c1.b};
				return {r: c1.r + factor * diff.r / dist ,
						g: c1.g + factor * diff.g / dist ,
						b: c1.b + factor * diff.b / dist };
			},
			clear: function(){
				HGT.paleta.loaded = false;
				HGT.paleta.name = "";
				HGT.paleta.json = null;
			}
		}
	};

	engine.MyCanvas.init();

	var UI = {
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
			} else {
				this.$els.paleta.divs.selected.hide();
				this.$els.paleta.divs.select.show();
			}
		},
		setHGTprop: function(w,max){
			var $lis = this.$els.HGT.settings.find('ul#datos li');
			$lis.eq(0).find('span').html(w+"x"+w);
			$lis.eq(1).find('span').html(max);
		}
	};

	UI.init();

})();