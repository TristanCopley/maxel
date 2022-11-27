let offscreen = new OffscreenCanvas(256, 256);
let offscreenCtx = offscreen.getContext('2d', { alpha: false, willReadFrequently: true });

onmessage = (evt) => {

    let map = evt.data.map;
    let scale = evt.data.scale;

    offscreen.height = map.size * scale;
    offscreen.width = map.size * scale;

    for(let i = 0; i < map.size; i++) {

        for (let j = 0; j < map.size; j++) {

            offscreenCtx.fillStyle = "#" + map.data[i][j].toString(16).padStart(6, "0");
            offscreenCtx.fillRect(j * scale, i * scale, scale, scale);

        }

    }

    postMessage(offscreen.transferToImageBitmap());

};