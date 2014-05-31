(function(){
	if ( !window.File || !window.FileReader || !window.FileList || !window.Blob)
		return alert('La API de Archivos no es compatible con tu navegador. Considera actualizarlo.');

  /************
      Vertex
  ************/
	function Vertex(x,y,z){
		this.x = (x || 0);
		this.y = (y || 0);
		this.z = (z || 0);
    return this;
	}

	Vertex.prototype.fromString = function(str){
		var string = str.trim(),
			coords = string.split(' ');

		this.x = parseFloat(coords[1]);
		this.y = parseFloat(coords[2]);
		this.z = parseFloat(coords[3]);
		return coords[0] >> 0;
	};

  Vertex.prototype.transformar = function(matrix){
    var ret = [0,0,0,0],
      vertx = [this.x,this.y,this.z,1];

    for (var i = 0 ; i < 4 ; i++) {
      for (var j = 0 ; j < 4 ; j++) {
        ret[i] += M[i][j] * vertx[j];
      }
    }

    return new Vertex( vertx[0] , vertx[1] , vertx[2] );
  };

  Vertex.resta = function(vtx1,vtx2){
    return new Vertex(vtx1.x - vtx2.x , vtx1.y - vtx2.y , vtx1.z - vtx2.z );
  };

  Vertex.producto = function(v1,v2){
    return new Vertex(v1.y * v2.z - v1.z * v2.y, v1.z * v2.x - v1.x * v2.z, v1.x * v2.y - v1.y * v2.x);
  };

  /************
      Polygon
  ************/

	function Polygon(vertices){
		this.vertices = (vertices || []);
    return this;
	}

	Polygon.prototype.fromString = function(str){
		var string = str.trim().replace(/  +/g,' '),
        vertices = string.split(' ');
		for (var i = 0, max = vertices.length ; i < max; i++) {
			this.vertices[i] = vertices[i] >> 0;
		}
    return this;
	};

  Polygon.prototype.getVertex = function(pos){
    return Render.vertices[this.vertices[pos]];
  };

  Polygon.prototype.draw = function(color){
    engine.MyCanvas.drawTriangle( this.getVertex(0) , this.getVertex(1) , this.getVertex(2) , color );
  };

  Polygon.prototype.getCenter = function(){
    var cant = this.vertices.length,
      z = 0;
    for (var i = 0; i < cant; i++) z += this.vertices[i].z;
    return z / cant;
  };

  /************
      Model
  ************/

	function Model(type){
		this.type = (type || "");
		this.polygons = [];
	}
	Model.prototype.init = function(polygs,polys_count){
    if ( polys_count )
      this.polygons = polygs.splice(0,polys_count);
    else
      this.polygons = polygs;
	};

	// -----------------------------------
	//			Render
	// -----------------------------------

  var Render = {
		loaded: false,
		imagen: null,
		file: null,
		busy: false,
		lastTime: 0,
		modelos: [],
		poligonos: [],
		vertices: [],
		iniciate: function( fileBuffer ){
			Render.loaded = true;
			UI.setModelprop();
		},
		clear: function(){
			Render.loaded = false;
			Render.imagen = null;
		},
    reset: function(){
      Render.modelos = [];
      Render.poligonos = [];
      Render.vertices = [];
    },
		loadFile: function(evt){
			var f = evt.target.files[0];

			if (!f) return alert("Error al tratar de abrir el archivo");

			var r = new FileReader();

			Render.file = f;

			r.onload = function(e) {
				UI.fileSelect(true);
				Render.loadString(e.target.result);
				UI.$els.fileName.children('small').html(Render.file.name);
				Render.iniciate();
			};
			r.readAsText(f);
		},
		loadString: function(str){
      Render.reset();

			var arr = str.split('*'),
          buffer_models = [];
			
      // First one is empty
      arr.shift();

      var sector,header;
			for (var i = 0, max = arr.length; i < max; i++) {
				sector = arr[i].split('\n');
        header = sector.shift().trim();
				switch(header){
        // Modelos
        case "ELEMENT GROUPS":
          buffer_models = sector;
          break;
        // Poligonos
        case "INCIDENCE":
          var polyg;
          for (var k = 0, maxk = sector.length; k < maxk; k++) {
            if ( sector[k] ) {
              polyg = new Polygon();
              polyg.fromString(sector[k]);
              Render.poligonos[k] = polyg;
            }
          }
          break;
        // Vertices
        case "COORDINATES":
          var vert,pos;
          for (var l = 0, maxl = sector.length; l < maxl; l++) {
            if ( sector[l] ) {
              vert = new Vertex();
              pos = vert.fromString(sector[l]);
              Render.vertices[pos] = vert;
            }
          }
          break;
        default:
          console.log(header + " -> Header default");
        }
			}

      var model,model_arr;
      for (var j = 0, maxj = buffer_models.length; j < maxj; j++) {
        model_arr = buffer_models[j].split(' ');
        if ( model_arr.length > 1 ) {
          model = new Model(model_arr[2]);
          model.init(Render.poligonos,model_arr[1]);
          Render.modelos[model_arr[0]] = model;
        }
      }

      console.log(Render.modelos);
		},
		createModels: function(){

    },
		render: function(){
			var self = this;

			//if ( !Render.loaded || Render.busy ) return alert("El Modelo está ocupado");
			Render.busy = true;

      engine.MyCanvas.reset();
			
			setTimeout(function(){
				Render.lastTime = Date.now();
        var polygs = Render.modelos[1].polygons;

        for (var i = 0, max_i = polygs.length; i < max_i; i++) {
          polygs[i].draw( Math.floor(Math.random()*16777215).toString(16) ); // El color se debería calcular dentro del polygono, pero bueno, desp se ve
        }

        Render.busy = false;

			},50);
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
			this.$els = {};
			this.$els.fetchFile = $('#ModelfetchFile');
			this.$els.settings = $("#ModelSettings");
			this.$els.fileInput = this.$els.fetchFile.children('input[type="file"]');
			this.$els.fileName = this.$els.settings.children('a:first');

			this.$els.renderButton = this.$els.settings.find('button[name="render"]');
			this.$els.renderButton.removeAttr("disabled");

			this.setEventos();
		},
		setEventos: function(){
			this.$els.fileName.click(function(e){
				Render.clear();
				UI.fileSelect(false);
			});
			this.$els.renderButton.click(function(e){
				Render.render();
			});

			this.$els.fileInput.on('change',Render.loadFile);

			// Dispararse en la primera dibujada
			$(engine.MyCanvas.el).on('mousedown',UI.mouse.down);
			$(engine.MyCanvas.el).on('mouseup',UI.mouse.up);
			$(engine.MyCanvas.el).on('mousemove',UI.mouse.move);
		},
		fileSelect: function(activate){
			if ( ( activate === undefined ) || activate ){
				this.$els.fetchFile.hide();
				this.$els.settings.show();
			} else {
				this.$els.fetchFile.show();
				this.$els.settings.hide();
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
			var $lis = this.$els.settings.find('ul#datos li');
			$lis.eq(0).find('span').html(engine.MyCanvas.el.width+"x"+engine.MyCanvas.el.height);
			var $time = $lis.eq(1).children('b');
			$time.children('span').remove();
			var $span = $('<span></span>');
			$span.html(Render.lastTime + "ms").addClass("animate new");
			$time.append( $span );
			$span.focus().removeClass("new");
		},
		rendering: function(){
			UI.$els.renderButton.html("... rendering ...").attr("disabled","");
			$('body').addClass("cargando");
		},
		rendered: function(){
			UI.$els.renderButton.html("Render").removeAttr("disabled");
			$('body').removeClass('cargando');
		}
	};
	
	UI.init();

})();