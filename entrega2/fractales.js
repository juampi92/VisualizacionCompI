// ------------------------------------------
// 				Procesamiento
// ------------------------------------------

function FractalProcessing( params, start, end , dim , paleta ){
	var arr = new Array(),
		fract = new fractal[params.fractal_nom](),
		width = (end.x-start.x),
		height = (end.y-start.y),
		rango_x = dim.x.e - dim.x.s,
		rango_y = dim.y.e - dim.y.s;

	console.log(start,end,dim);

	var i = 0;
	for (var y = end.y; y > start.y ; y--) {
		
		var _i = dim.y.s + (start.y + height - y) * rango_y / height;
		//console.log(y,_i);

		for (var x = start.x; x < end.x ; x++) {

			var _r = dim.x.s + x * rango_x / width;

			var it = fract.iterar(Complejo.nuevo(_r,_i));

			var rgb = paleta.getColor(it);
			arr[i] = rgb.r;
			arr[i+1] = rgb.g;
			arr[i+2] = rgb.b;
			arr[i+3] = 255;
			i+=4;
		};

		// Se pintó toda una fila
	};

	// Returns an array of iterations
	return arr;
};

// ------------------------------------------
// 			Tipos de Fractales
// ------------------------------------------

var fractal = {};

fractal.base = function(){};
fractal.base.prototype.MAX_IT = 90;
fractal.base.prototype.DIVERGE = 4;
fractal.base.prototype.getFirst = function(c){return 0;}
fractal.base.prototype.getNext = function(Zn,c){return 0;}
fractal.base.prototype.iterar = function(c){
	var Zn = this.getFirst(c);

	for(var i = 0; i < this.MAX_IT; i++){
		Zn = this.getNext(Zn, c);

		if (Complejo.modulo_sqrd(Zn) > this.DIVERGE)
			return i;
	};

	return this.MAX_IT;
};

// ------------------------------------------
// 			Fractales Específicos
// ------------------------------------------

fractal.mandelbrot = function(){};
fractal.mandelbrot.prototype = new fractal.base();

fractal.mandelbrot.prototype.dim = {x:{s:-2,e:1},y:{s:-1.5,e:1.5}};
fractal.mandelbrot.prototype.DIVERGE = 4; // Diverge al cuadrado
fractal.mandelbrot.prototype.exp = 2;

fractal.mandelbrot.prototype.getFirst = function(c){return Complejo.nuevo();}
fractal.mandelbrot.prototype.getNext = function(Zn,c) {
	return	Complejo.suma( Complejo.potencia(Zn, this.exp ) , c);
};


// ------------------------------------------
// 					Complejos
// ------------------------------------------


var Complejo = {
	nuevo: function(real,img){
		if ( real == undefined )
			return {r:0,i:0};
		else
			return {r:real,i:img};
	},
	getReal: function(c) { return c.r; },
	getImag: function(c) { return c.i; },
	conjugado: function(c){ return {r: c.r, i: -c.i}; },
	opuesto: function(c){ return {r: -c.r, i: -c.i}; },
	modulo: function(c){ return Math.sqrt(c.r*c.r + c.i*c.i); },
	modulo_sqrd: function(c){ return (c.r*c.r + c.i*c.i); },
	argumento: function(c){
		var angulo = Math.atan2(c.i,c.r);     //devuelve el angulo entre -PI y +PI
		if (angulo < 0){
			angulo = 2 * Math.PI + angulo;
		}
		return angulo*180/Math.PI;
	},
	suma: function(c1,c2){
		return {r: ( c1.r + c2.r ), 
				i: ( c1.i + c2.i ) };
	},
	producto_c: function(c1,c2){
		return { r: ( c1.r * c2.r - c1.i * c2.i ),
				 i: ( c1.r * c2.i + c1.i * c2.r ) };
	},
	producto_r: function(c,d){
		return {r: c.r * d,
				i: c.i * d };
	},
	cociente_c: function(c1,c2){
		var aux1, aux2, aux3;
		
		if(Complejo.modulo_sqrd(c2) == 0 )
			throw "Divide por cero";
			
		aux1 = c2.r * c2.r + c2.i * c2.i;
		aux2 = c1.r * c2.r;
		aux3 = c1.i * c2.i;
		
		return { r: (aux2 + aux3) / aux1,
				 i: (aux2 - aux3) / aux1 };
	},
	cociente_r: function(c,d){
		if(d == 0 ) throw "Divide por cero";
		return { r: c.r/d, 
				 i: c.i/d };
	},
	exponencial: function(c){
		var exp = Math.exp(c.r);
		return { r: exp * Math.cos(c.i), 
				 i: exp * Math.sin(c.i) };
	},
	csqrt: function(d){
		if( d >= 0)
			return {r:Math.sqrt(d), i:0};
		return {r:0, i:Math.sqrt(-d)};
	},
	potencia_r: function(base,exponente){
		var resultado=1.0;
		
		for(var i=0; i<exponente; i++)
			resultado *= base;
		
		return resultado;
	},
	combinatorio: function(m,n){
		var num = 1,
			den = 1;
		
		for(var i=m; i>m-n; i--)
			num *= i;
		
		for(var i=2; i<=n; i++)
			den *= i;
		
		return num/den;
	},
	potencia: function(c,exp){
		var x = 0,
			y = 0,
			signo;
		
		for(var i = 0; i <= exp; i++){
			
			signo = ( i % 2 == 0 ) ? +1 : -1;
			
			//parte real
			x += Complejo.combinatorio(exp, 2*i) * Complejo.potencia_r(c.r, exp-2*i)
				 * Complejo.potencia_r(c.i, 2*i) * signo;
			
			if(exp == 2*i)
				break;
			
			//parte imaginaria
			y += Complejo.combinatorio(exp, 2*i+1) * Complejo.potencia_r(c.r, exp-(2*i+1)) 
				 * Complejo.potencia_r(c.i, 2*i+1) * signo;
		}
		
		return {r:x,i:y};
	},
	equals: function(c1,c2) {
		return ( c1.r == c2.r && c1.i == c2.i);
	}	
}


// ------------------------------------------
// 			Paleta Fija
// ------------------------------------------

var Paleta = {
	json: null,
	suavizado: true,
	init: function(json,suav){
		Paleta.json = json;
		Paleta.suavizado = suav;
	},
	getColor: function(factor){
		var monte = Paleta.getMontecarlo(factor);

		if ( Paleta.suavizado && monte > 0 && Paleta.json[monte][0] != factor ) {
			var orig = Paleta.json[monte-1],
				dest = Paleta.json[monte],
				c1 = orig[1],
				c2 = dest[1],
				dist = dest[0] - orig[0],
				fact = factor - orig[0];
			return Paleta.getSuavizado(c1,c2,fact,dist);
		} else
			return Paleta.json[monte][1];
	},
	getMontecarlo: function(factor){
		var j = 0;
		for (j = 0; j < Paleta.json.length-1; j++)
			if ( factor <= Paleta.json[j][0] ) return j;
		return j;
	},
	getSuavizado: function(c1,c2,factor,dist){
		var diff = {r: c2.r - c1.r , g: c2.g - c1.g , b: c2.b - c1.b};
		return {r: c1.r + factor * diff.r / dist ,
				g: c1.g + factor * diff.g / dist ,
				b: c1.b + factor * diff.b / dist };
	}
}