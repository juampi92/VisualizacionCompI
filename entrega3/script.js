(function(){
	if ( !window.File || !window.FileReader || !window.FileList || !window.Blob)
		return alert('La API de Archivos no es compatible con tu navegador. Considera actualizarlo.');

	var Model = {
		loaded: false,
		imagen: null,
		file: null,
		busy: false,
		lastTime: 0,
		properties: {
			width:800,
			height:800
		},
		iniciate: function( fileBuffer ){
			Model.loaded = true;
			UI.setModelprop();
		},
		clear: function(){
			Model.loaded = false;
			Model.imagen = null;
		},
		loadFile: function(evt){
			var f = evt.target.files[0];

			if (!f) return alert("Error al tratar de abrir el archivo");

			var r = new FileReader();

			Model.file = f;

			r.onload = function(e) {
				UI.fileSelect(true);
				console.log(e.target.result);
				/*HGT.iniciate(e.target.result);
				UI.$els.HGT.fileName.children('small').html(HGT.file.name);*/
			};
			r.readAsText(f);
		},
		render: function(){
			var self = this;

			if ( !Model.loaded || Model.busy ) return alert("El Modelo está ocupado");
			Model.busy = true;
			
			setTimeout(function(){
				Model.lastTime = Date.now();

			},100);
		},
		calcularZoom: function(pos,medidas){
		},
		calcularDesplazo: function(x,y){
		}
	};

	engine.MyCanvas.init();

	var UI = {
		$els: {},
		init: function(){
			this.$els.Model = {};
			this.$els.Model.fetchFile = $('#ModelfetchFile');
			this.$els.Model.settings = $("#ModelSettings");
			this.$els.Model.fileInput = this.$els.Model.fetchFile.children('input[type="file"]');
			this.$els.Model.fileName = this.$els.Model.settings.children('a:first');

			this.$els.Model.renderButton = this.$els.Model.settings.find('button[name="render"]');
			this.$els.Model.renderButton.removeAttr("disabled");

			this.setEventos();
		},
		setEventos: function(){
			this.$els.Model.fileName.click(function(e){
				Model.clear();
				UI.fileSelect(false);
			});
			this.$els.Model.renderButton.click(function(e){
				Model.render();
			});

			this.$els.Model.fileInput.on('change',Model.loadFile);

			// Dispararse en la primera dibujada
			$(engine.MyCanvas.el).on('mousedown',UI.mouse.down);
			$(engine.MyCanvas.el).on('mouseup',UI.mouse.up);
			$(engine.MyCanvas.el).on('mousemove',UI.mouse.move);
		},
		fileSelect: function(activate){
			if ( ( activate == undefined ) || activate ){
				this.$els.Model.fetchFile.hide();
				this.$els.Model.settings.show();
			} else {
				this.$els.Model.fetchFile.show();
				this.$els.Model.settings.hide();
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
			},
			move: function(e){
				if ( !UI.mouse.pressed ) return;
			}
		},
		setModelprop: function(){
			var $lis = this.$els.Model.settings.find('ul#datos li');
			$lis.eq(0).find('span').html(Model.properties.width+"x"+Model.properties.height);
			var $time = $lis.eq(1).children('b');
			$time.children('span').remove();
			var $span = $('<span></span>');
			$span.html(Model.lastTime + "ms").addClass("animate new");
			$time.append( $span );
			$span.focus().removeClass("new");
		},
		rendering: function(){
			UI.$els.Model.renderButton.html("... rendering ...").attr("disabled","");
			$('body').addClass("cargando");
		},
		rendered: function(){
			UI.$els.Model.renderButton.html("Render").removeAttr("disabled");
			$('body').removeClass('cargando');
		}
	};
	
	UI.init();

})();