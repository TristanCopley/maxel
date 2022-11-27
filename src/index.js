// Socket.io
const socket = io();

// Intialize the canvasses
const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const toolbar = document.getElementById('toolbar');
const colorWheel = document.getElementById('colorWheel');
const paintTool = document.getElementById('paintTool');
const moveTool = document.getElementById('moveTool');
const colorPalette = document.getElementById('color-palette');
const colorPaletteMouse = document.getElementById('color-palette-mouse');
const colorPaletteColor = document.getElementById('color-palette-color');

const brightnessPalette = document.getElementById('brightness-palette');
const brightnessPaletteMouse = document.getElementById('brightness-palette-mouse');
const brightnessPaletteColor = document.getElementById('brightness-palette-color');

const colorContainer = document.getElementById('colorContainer');
const colorIcon = document.getElementById('colorIcon');

// Spawn the worker
let worker = new Worker("worker.js");

let ww = {

    free: false

}

// Default values
let rawImageBitmap = null;
let map = null;
let mapOffset = null;
let canvasOffset = null;

// User
let usr = {

    scale: 40,
    scroll: 1,
    x: 0,
    y: 0,
    selected: null,
    state: 0,

    mouse: {

        x: 0,
        y: 0,
        down: false

    },

    colorOver: false,
    colorPos: 360,
    interactCanvas: true,
    dragging: false,
    brightOver: false,
    brightPos: 180,

    lastMX: 0,
    lastMY: 0,
    lastX: 0,
    lastY: 0

};

// Listen for canvas update from worker
worker.addEventListener("message", event => {

    rawImageBitmap = event.data;
    ww.free = true;

});

let lastTime = 0;
let dt = 0;

// Check if map has updated and then dispatch webworker (needs to be done) !!!!!

function render(time = 0) {

    if (ww.free) {

        ww.free = false;
        worker.postMessage({map: map, scale: usr.scale});

    }

    if (rawImageBitmap === null) { 

        return requestAnimationFrame(render); 

    }


    if (usr.colorOver && usr.mouse.down && usr.state === 2) {

        let dat = colorPaletteColor.getBoundingClientRect();
        let posX = clamp(usr.mouse.x - dat.left - 24, 0, 304.2);
        usr.colorPos = Math.floor(clamp(posX * 1.19343195266, 0, 360));
        colorPaletteMouse.style.left = posX + 'px';
        colorPaletteMouse.style.backgroundColor = 'hsl(' + usr.colorPos + ', 100%, 50%)';
        colorPaletteMouse.innerHTML = `<span>${Math.floor(usr.colorPos / 3.6)}</span>`;

        let int = rgbToHex(...hslToRgb(Math.floor(usr.colorPos / 360 * 100)/100, 1, Math.floor(usr.brightPos / 360 * 100)/100));
        colorIcon.style.backgroundColor = '#' + int;
        colorIcon.innerHTML = `<span>#${int}</span>`;

    }

    if (usr.brightOver && usr.mouse.down && usr.state === 2) {

        let dat = brightnessPaletteColor.getBoundingClientRect();
        let posX = clamp(usr.mouse.x - dat.left - 24, 0, 304.2);
        usr.brightPos = Math.floor(clamp(posX * 1.19343195266, 0, 360));
        brightnessPaletteMouse.style.left = posX + 'px';
        brightnessPaletteMouse.style.backgroundColor = 'hsl('+ Math.floor(usr.brightPos / 3.6) +', 0%,'+ Math.floor(usr.brightPos / 3.6) +'%)';
        brightnessPaletteMouse.innerHTML = `<span>${Math.floor(usr.brightPos / 3.6)}</span>`;

        let int = rgbToHex(...hslToRgb(Math.floor(usr.colorPos / 360 * 100)/100, 1, Math.floor(usr.brightPos / 360 * 100)/100));
        colorIcon.style.backgroundColor = '#' + int;
        colorIcon.innerHTML = `<span>#${int}</span>`;

    }

    if (usr.mouse.down && usr.state === 0 && (usr.interactCanvas || usr.dragging)) {

        usr.x = usr.lastX + (usr.mouse.x - usr.lastMX) / usr.scale;
        usr.y = usr.lastY + (usr.mouse.y - usr.lastMY) / usr.scale;

        toolbar.classList.add('softreveal');
        toolbar.style.pointerEvents = 'none';

        usr.dragging = true;

    } else {

        toolbar.classList.remove('softreveal');
        toolbar.style.pointerEvents = 'auto';

        usr.dragging = false;

    }

    dt = time - lastTime;
    lastTime = time;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    usr.scroll = clamp(usr.scroll, 0, 4100);
    usr.scale = 2 ** (usr.scroll / 1000);
    usr.x = clamp(usr.x, -0.5 * map.size * usr.scale, 0.5 * map.size * usr.scale);
    usr.y = clamp(usr.y, -0.5 * map.size * usr.scale, 0.5 * map.size * usr.scale);
    
    mapOffset = {

        x: (map.size * usr.scale / -2 + usr.scale * usr.x), 
        y: (map.size * usr.scale / -2 + usr.scale * usr.y)

    };

    canvasOffset = {

        x: canvas.width / 2,
        y: canvas.height / 2

    };

    ctx.drawImage(rawImageBitmap, canvasOffset.x + mapOffset.x, canvasOffset.y + mapOffset.y, usr.scale * map.size, usr.scale * map.size);

    // Update selced tile
    let x = Math.floor((usr.mouse.x - canvasOffset.x) / usr.scale + map.size / 2 - usr.x);
    let y = Math.floor((usr.mouse.y - canvasOffset.y) / usr.scale + map.size / 2 - usr.y);

    if (x >= 0 && x < map.size && y >= 0 && y < map.size) {

        usr.selected = {x: x, y: y};

    } else {

        usr.selected = null;

    }

    if (usr.selected !== null && usr.mouse.down && usr.state === 1 && usr.interactCanvas && map.data[usr.selected.y][usr.selected.x] !== usr.colorPos) {
        let int = rgbToHex(...hslToRgb(Math.floor(usr.colorPos / 360 * 100)/100, 1, Math.floor(usr.brightPos / 360 * 100)/100));
        socket.emit('paint', {...usr.selected, color: parseInt(int, 16)});
    }

    requestAnimationFrame( render );

}

// Socket.io events
socket.on('mapdata', (data) => {

    map = data;
    ww.free = true;
    requestAnimationFrame( render );

});

socket.on('connect', () => {

    console.log('Connected to server');

});

socket.on('update', (data) => {

    map.data[data.y][data.x] = data.color;

});

// Event listeners

// Resize the canvas when the window is resized
window.addEventListener('resize', () => {

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

});

// Update the user's position when the mouse is moved
window.addEventListener('mousemove', (e) => {

    usr.mouse.x = e.clientX;
    usr.mouse.y = e.clientY;

});

window.addEventListener('mousedown', () => {

    usr.mouse.down = true;
    usr.lastX = usr.x;
    usr.lastY = usr.y;
    usr.lastMX = usr.mouse.x;
    usr.lastMY = usr.mouse.y;

});

window.addEventListener('mouseup', () => {

    usr.mouse.down = false;

});

window.addEventListener('wheel', (e) => {

    usr.scroll -= 0.2 * e.deltaY * dt;

});

toolbar.addEventListener('mouseover', () => {

    usr.interactCanvas = false;

});

toolbar.addEventListener('mouseout', () => {

    usr.interactCanvas = true;

});

function clamp(num, min, max) {

    return num <= min ? min : num >= max ? max : num;

}

colorWheel.addEventListener('click', () => {
    colorPalette.classList.add('reveal');
    brightnessPalette.classList.add('reveal');
    colorWheel.classList.add('selected');
    paintTool.classList.remove('selected');
    moveTool.classList.remove('selected');
    colorContainer.classList.add('reveal');
    colorContainer.classList.add('colorContainerMove');
    usr.state = 2;
});
paintTool.addEventListener('click', () => {
    colorPalette.classList.remove('reveal');
    brightnessPalette.classList.remove('reveal');
    colorWheel.classList.remove('selected');
    paintTool.classList.add('selected');
    moveTool.classList.remove('selected');
    colorContainer.classList.add('reveal');
    colorContainer.classList.remove('colorContainerMove');
    usr.state = 1;
});
moveTool.addEventListener('click', () => {
    colorPalette.classList.remove('reveal');
    brightnessPalette.classList.remove('reveal');
    colorWheel.classList.remove('selected');
    paintTool.classList.remove('selected');
    moveTool.classList.add('selected');
    colorContainer.classList.remove('reveal');
    colorContainer.classList.remove('colorContainerMove');
    usr.state = 0;
});
colorPaletteColor.addEventListener('mouseover', (e) => {
    usr.colorOver = true;
});
colorPaletteColor.addEventListener('mouseleave', (e) => {
    usr.colorOver = false;
});
brightnessPaletteColor.addEventListener('mouseover', (e) => {
    usr.brightOver = true;
});
brightnessPaletteColor.addEventListener('mouseleave', (e) => {
    usr.brightOver = false;
});


function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function componentToHex(c) {
    let hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r, g, b) {
    return componentToHex(r) + componentToHex(g) + componentToHex(b);
}

// Run quick
colorPaletteMouse.style.backgroundColor = 'hsl(' + usr.colorPos + ', 100%, 50%)';
colorPaletteMouse.innerHTML = `<span>${Math.floor(usr.colorPos / 3.6)}</span>`;

let int = rgbToHex(...hslToRgb(Math.floor(usr.colorPos / 360 * 100)/100, 1, Math.floor(usr.brightPos / 360 * 100)/100));
colorIcon.style.backgroundColor = '#' + int;

brightnessPaletteMouse.style.backgroundColor = 'hsl('+ Math.floor(usr.brightPos / 3.6) +', 0%,'+ Math.floor(usr.brightPos / 3.6) +'%)';
brightnessPaletteMouse.innerHTML = `<span>${Math.floor(usr.brightPos / 3.6)}</span>`;

colorIcon.style.backgroundColor = '#' + int;
colorIcon.innerHTML = `<span>#${int}</span>`;