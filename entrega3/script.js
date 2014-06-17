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

  Vertex.prototype.transformar = function(matriz){
    var ret = [0,0,0,0],
      vertx = [this.x,this.y,this.z,1],
      M = matriz.matrix;

    for (var i = 0 ; i < 4 ; i++) {
      for (var j = 0 ; j < 4 ; j++) {
        ret[i] += M[i][j] * vertx[j];
      }
    }
    return new Vertex( ret[0] , ret[1] , ret[2] );
  };

  Vertex.prototype.versor = function(){
    var modulo = Math.sqrt( this.x*this.x + this.y*this.y + this.z*this.z );
    return new Vertex(this.x/modulo,this.y/modulo,this.z/modulo);
  };

  Vertex.resta = function(vtx1,vtx2){
    return new Vertex(vtx1.x - vtx2.x , vtx1.y - vtx2.y , vtx1.z - vtx2.z );
  };

  Vertex.producto = function(v1,v2){
    return new Vertex(v1.y * v2.z - v1.z * v2.y, v1.z * v2.x - v1.x * v2.z, v1.x * v2.y - v1.y * v2.x);
  };

  Vertex.productoEscalar = function(v1,v2){
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
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

  Polygon.prototype.draw = function(vertices){
    // Calcular vector normal

    var vs = [ vertices[this.vertices[0]] , vertices[this.vertices[1]] , vertices[this.vertices[2]] ],
      vNormal = Vertex.producto(
        Vertex.resta( vs[0], vs[1] ),
        Vertex.resta( vs[1], vs[2] )
      );

    // Está de espaldas. No se dibuja
    if ( vNormal.z <= 0 ) return;

    var fuenteLuz = new Vertex(0, 1, 0),
      luz = {r:200,g:200,b:100},
      ambiente = {r:40,g:40,b:50},
      objeto = {r:255,g:0,b:0},

      intensidadLuz = Math.max(0,Vertex.productoEscalar(fuenteLuz,vNormal.versor())),

      r,g,b,color;

    r = (Math.max(0, intensidadLuz * (255 - ambiente.r)) + ambiente.r) >> 0;
    g = (Math.max(0, intensidadLuz * (255 - ambiente.g)) + ambiente.g) >> 0;
    b = (Math.max(0, intensidadLuz * (255 - ambiente.b)) + ambiente.b) >> 0;
    
    color = engine.rgbToHex(r,g,b);

    // Dibujar poligono resultante
    engine.MyCanvas.drawTriangle( vs[0] , vs[1] , vs[2] , color );
  };

  Polygon.prototype.getCenter = function(){
    var cant = this.vertices.length,
      z = 0;
    for (var i = 0; i < cant; i++) z += Render.vertices[this.vertices[i]].z;
    return z / cant;
  };
  Polygon.compare = function(a,b){
    return b.getCenter() - a.getCenter();
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

  /************
      Matriz
  ************/

  function Matriz( matrix ){
    this.matrix = (matrix || Matriz.identidad());
  }
  Matriz.prototype.prod = function(matriz){
    var MatrizAux = new Matriz(Matriz.vacia());

    for ( var k = 0; k < 4; k++){
      for ( var j = 0; j < 4; j++){
        for ( var i = 0; i < 4; i++ ){
          MatrizAux.matrix[k][j] += this.matrix[k][i] * matriz.matrix[i][j];
        }
      }
    }

    return MatrizAux;
  };
  Matriz.prototype.suma = function(matriz){
    var MatrizAux = new Matriz(Matriz.vacia()),
      j,i;
    for ( j = 0; j < 4; j++){
      for ( i = 0; i < 4; i++ ){
        MatrizAux.matrix[j][i] = this.matrix[j][i] + matriz.matrix[j][i];
      }
    }
    return MatrizAux;
  };
  Matriz.prototype.get = function(){
    return this.matrix;
  };
  Matriz.getRotX = function(ang){
    return new Matriz([
      [Math.cos(ang),0,Math.sin(ang),0],
      [0,1,0,0],
      [-Math.sin(ang),0,Math.cos(ang),0],
      [0,0,0,1]
    ]);
  };
  Matriz.getRotY = function(ang){
    return new Matriz([
      [1,0,0,0],
      [0,Math.cos(ang),-Math.sin(ang),0],
      [0,Math.sin(ang),Math.cos(ang),0],
      [0,0,0,1]
    ]);
  };
  Matriz.getScale = function(zoom){
    return new Matriz([
      [zoom,0,0,0],
      [0,zoom,0,0],
      [0,0,zoom,0],
      [0,0,0,1]
    ]);
  };
  Matriz.getPerspectiva = function(d){
    return new Matriz([
      [1,0,0,0],
      [0,1,0,0],
      [0,0,1,0],
      [0,0,1/d,1]
    ]);
  };
  Matriz.getTras = function(x,y,z){
    return new Matriz([
      [0,0,0,x],
      [0,0,0,y],
      [0,0,0,z],
      [0,0,0,0]
    ]);
  };
  Matriz.identidad = function(){ return [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];};
  Matriz.vacia = function(){ return [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];};

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
    macum: new Matriz(),
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
    acumulate: function(matrix){
      this.macum = matrix.prod(this.macum);
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
          Render.modelos.push(model);
        }
      }

      console.log(Render.modelos);
		},
		render: function(auto){
			var self = this;

			//if ( !Render.loaded || Render.busy ) return alert("El Modelo está ocupado");
			Render.busy = true;

      if ( !auto ) Render.macum = new Matriz(UI.getMatrix());

      //engine.MyCanvas.reset();
			
			setTimeout(function(){
				Render.lastTime = Date.now();

        // Hacer algo con los vertices
        var vertices = [],
          w = engine.MyCanvas.el.width/2,
          h = engine.MyCanvas.el.height/2,
          i;

        for (var v = 0, max_v = Render.vertices.length; v < max_v; v++) {
          vertices[v] = Render.vertices[v].transformar(Render.macum);
        }
        
        var polygs;
        for (var m = 0, max_m = Render.modelos.length; m < max_m; m++) {
          polygs = Render.modelos[m].polygons;
          Render.painter(polygs,vertices);
        }

        engine.MyCanvas.done();

        Render.busy = false;
        Render.lastTime = Date.now() - Render.lastTime;
        UI.setModelprop();

			},0);
		},
    painter: function(polygs,vertices){
      // ---- Algoritmo del Pintor

      // Ordenar los poligonos
      var poligonos = polygs.slice(0);
      poligonos.sort(Polygon.compare);

      // Dibujar todos los poligonos
      for (var i = 0, max_i = poligonos.length; i < max_i; i++) {
        poligonos[i].draw(vertices);
      }
    }
	};

	engine.MyCanvas.init();

	var UI = {
		$els: {},
    $macum: [[],[],[],[]],
		init: function(){
			this.$els = {};
			this.$els.fetchFile = $('#ModelfetchFile');
			this.$els.settings = $("#ModelSettings");
			this.$els.fileInput = this.$els.fetchFile.children('input[type="file"]');
      this.$els.fileSelect = this.$els.fetchFile.children('select[type="file"]');
      this.$els.fileLoad = this.$els.fetchFile.children('button[action="load"]');
      this.$els.fileLoad.removeAttr("disabled");

			this.$els.fileName = this.$els.settings.children('a:first');

			this.$els.renderButton = this.$els.settings.find('button[name="render"]');
			this.$els.renderButton.removeAttr("disabled");

      this.$els.zoom = this.$els.settings.find(".btn-group.zoom");
      this.$els.rotate = this.$els.settings.find(".btn-group.rotate");

      this.$els.macum = $('table#macum');
      var filas = this.$els.macum.find('tr'),
        cols;

      for (var i = 0, max_i = filas.length; i < max_i; i++) {
        cols = $(filas[i]).find('td');
        for (var j = 0, max_j = cols.length; j < max_j; j++) {
          this.$macum[i][j] = $($(cols[j]).children('output')[0]);
        }
      }

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

      this.$els.fileLoad.on('click',function(){
        var folder = "modelos/",
          ext = ".sur",
          select = UI.$els.fileSelect.val();

        UI.$els.fileLoad.attr("disabled","");
        $.ajax( {
          url:folder+select+ext,
          dataType:"text"
        })
          .done(function(d){
          
            UI.fileSelect(true);
            Render.loadString(d);
            UI.$els.fileName.children('small').html(select+ext);
            Render.iniciate();

        })
          .fail(function(e,s,a){
            console.log("Error",s,a);
        })
          .always(function(){
            UI.$els.fileLoad.removeAttr("disabled");
        });

      });

      this.$els.zoom.on('click','button',function(e){
        var $this = $(this);

        if ( $this.html() == "+" )
          UI.zoom(true);
        else
          UI.zoom(false);
      });

      this.$els.rotate.on('click','button',function(e){
        var $this = $(this);
        UI.rotate( $this.val() );
      });

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
				
        UI.mouse.pressed = e.which;
				UI.mouse.startPos = UI.mouse.getCoords(e);
			},
			up: function(e){
				if ( !UI.mouse.pressed ) return;

				UI.mouse.pressed = 0;
				UI.mouse.endPos = UI.mouse.getCoords(e);

        return;
			},
			move: function(e){
				if ( !UI.mouse.pressed ) return;
        
        UI.mouse.endPos = UI.mouse.getCoords(e);

        var x,y;
        if ( UI.mouse.pressed == 1 ) {
          // Trasladas
          x = UI.mouse.endPos.x-UI.mouse.startPos.x;
          y = UI.mouse.endPos.y-UI.mouse.startPos.y;

          Render.macum = Render.macum.suma(Matriz.getTras(x,-y,0));
          UI.setMatrix();
          Render.render(true);
        }
        UI.mouse.startPos = UI.mouse.endPos;
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
		},
    zoom: function(zoomin){
      var zoom = (zoomin) ? 1.2 : 0.8;
      Render.macum = Matriz.getScale(zoom).prod(Render.macum);
      UI.setMatrix();
      Render.render(true);
    },
    rotate: function(dir){
      var cant = 5;
      switch(dir){
        case "up":
          Render.acumulate(Matriz.getRotY(cant* Math.PI / 180));
        break;
        case "down":
          Render.acumulate(Matriz.getRotY(-cant* Math.PI / 180));
        break;
        case "left":
          Render.acumulate(Matriz.getRotX(-cant* Math.PI / 180));
        break;
        case "right":
          Render.acumulate(Matriz.getRotX(cant* Math.PI / 180));
        break;
        default:
          console.log("Rotacion invalida");
      }
      UI.setMatrix();
      Render.render(true);
    },
    setMatrix: function(){
      var matrix = Render.macum.matrix;

      for (var i = 0, max_i = matrix.length; i < max_i; i++)
        for (var j = 0, max_j = matrix[i].length; j < max_j; j++)
          this.$macum[i][j].html(matrix[i][j]);
    },
    getMatrix: function(){
      var matrix = [[],[],[],[]];

      for (var i = 0, max_i = 4; i < max_i; i++)
        for (var j = 0, max_j = 4; j < max_j; j++)
          matrix[i][j] = parseFloat( this.$macum[i][j].html(),10);

      return matrix;
    }
	};
	
	UI.init();
  UI.setMatrix();

})();