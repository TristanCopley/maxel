const env = require('dotenv').config();
const express = require('express');
const port = 3000;
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const path = require('path');
const io = new Server(server);

const firebaseConfig = {
    apiKey: env.parsed.APIKEY,
    authDomain: env.parsed.AUTHDOMAIN,
    databaseURL: env.parsed.DATABASEURL,
    projectId: env.parsed.PROJECTID,
    storageBucket: env.parsed.STORAGEBUCKET,
    messagingSenderId: env.parsed.MESSAGINGSENDERID,
    appId: env.parsed.APPID,
    measurementId: env.parsed.MEASUREMENTID
};

const firebase = require("firebase/app");
const firestore = require("firebase/firestore");
const fapp = firebase.initializeApp(firebaseConfig);
const db = firestore.getFirestore(fapp);

// fetchs map from firebase on server start
async function fetchDocument(document) {

    const docRef = firestore.doc(db, "map", `${document}`);
    const docSnap = await firestore.getDoc(docRef);

    if (!docSnap.exists()) { 

        console.log("Error fetching document");
        return {data: []};

    }

    return docSnap.data();

}

// Dev function to create a map
async function setMap(sz) {

    let size = sz;

    await firestore.setDoc(firestore.doc(db, "map", `size`), {

        size: size

    });

    for (let i = 0; i < size; i++) {

        let slice = [];

        for (let j = 0; j < size; j++) {

            slice.push(Math.floor(Math.random() * 16777215));
    
        }

        await firestore.setDoc(firestore.doc(db, "map", `${i}`), {
            data: slice
        });

    }

}

async function updateDatabase() {

    let size = map.size;

    for (let i = 0; i < size; i++) {

        let slice = [];

        for (let j = 0; j < size; j++) {

            slice.push(map.data[i][j]);
    
        }

        await firestore.setDoc(firestore.doc(db, "map", `${i}`), {
            data: slice
        });

    }

    console.log("Database updated");

}

// Builds map
async function buildMap() {

    let map = [];

    let size = await fetchDocument("size");

    for (let i = 0; i < size.size; i++) {

        map.push((await fetchDocument(i)).data);

    }

    return {data: map, size: size.size};

}

// Serve src files
app.use(express.static(path.join(__dirname,'src')));

// Default map values
let map = {data: [], size: -1};

// Fetch and build map from firebase
buildMap().then((data) => {

    map = data;
    console.log(map);

}).catch((error) => {console.log('Error fetching map: ', error)});

// Socket connections
io.on('connection', (socket) => {

    // Log connection
    console.log(`${socket.id}: Connected`);

    socket.emit('mapdata', map);

    socket.on('paint', (data) => {

        if (!(data && data.x >= 0 && data.x < map.size && data.y >= 0 && data.y < map.size && data.color >= 0 && data.color <= 16777215)) {

            console.log('Invalid paint data');
            return;

        }

        map.data[data.y][data.x] = data.color;

        io.emit('update', data);

    });

    socket.on('disconnect', () => {

        // Log disconnection
        console.log(`${socket.id}: Disconnected`);

    });

});

setInterval(() => {

    console.log("Updating database...");
    updateDatabase();

}, 3600000);

// Listening
server.listen(port, () => {

    console.log(`The Trials server listening on http://localhost:${port}\n---`);

});