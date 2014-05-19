importScripts("fractales.js");

self.onmessage = function (e) {
    var index = e.data.index;
    
    Paleta.init(e.data.paleta.json,e.data.paleta.suav);

    var time = Date.now();
    var arr = FractalProcessing( e.data.params , e.data.start, e.data.end , e.data.dimensions , Paleta );
    console.log("Retardo del Worker " + index + ": " + (Date.now() - time));

    self.postMessage({ arr: arr, worker: index });
};