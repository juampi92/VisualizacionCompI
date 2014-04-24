(function(){
	if ( !window.File || !window.FileReader || !window.FileList || !window.Blob)
		return alert('La API de Archivos no es compatible con tu navegador. Considera actualizarlo.');

	var HGT = {
		loaded: false,
		array: null,
		file: null,
		properties: {},
		calculateProp: function(){
			if ( !HGT.loaded ) return;
			HGT.properties.w = HGT.properties.h = Math.sqrt(HGT.array.length);
			HGT.properties.max = 0;
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
			if ( !HGT.loaded ) return;

			if ( HGT.paleta.loaded ) {
			// Usar paleta
				// Crear imagen
				var img = new engine.Imagen();
					process = new engine.Process(img);

				img.create( HGT.properties.w , HGT.properties.h );
				var it = 0;
				process.loop(function(i,x,y){

					var altura = HGT.array[it];
					it++;
					// "Montecarlo"
					var j = 0;
					for (j = 0; j < HGT.paleta.json.length-1; j++)
						if ( altura < HGT.paleta.json[j][0] ) return HGT.paleta.json[j][1];

					return HGT.paleta.json[j][1];
				});

			} else {
			// Dinamica
				// Crear imagen
				var img = new engine.Imagen();
					process = new engine.Process(img);

				img.create( HGT.properties.w , HGT.properties.h );

				// Buscar el maximo:
				var max = 0;
				for (var ite = 0; ite < HGT.array.length; ite++)
					max = Math.max(HGT.array[ite],max);

				HGT.properties.max = max;

				var it = 0;
				process.loop(function(i,x,y){

					var altura = HGT.array[it],
						color = 255 * (altura / max);

					it++;
					
					return {r:color,g:color,b:color};
				});
			}

			process.render();
		},
		paleta: {
			loaded: false,
			name: "",
			json: null,
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
		}
	};

	UI.init();

})();