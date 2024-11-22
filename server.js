const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let pixels = {}; // Stocke les pixels dessinés
let users = new Map(); // Associe chaque WebSocket à un pseudonyme

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            const { action, data, username, message: chatMessage } = parsedMessage;

            if (action === 'join') {
                if (username) {
                    users.set(ws, username);
                    console.log(`${username} s'est connecté.`);
                } else {
                    console.error('Pseudo manquant lors de la connexion.');
                }
            } else if (action === 'draw') {
                if (data) {
                    pixels[data.id] = data; // Stocker le pixel dans la mémoire
                    broadcast({ action: 'draw', data }); // Diffuser le pixel dessiné
                }
            } else if (action === 'erase') {
                // Supprimer le pixel spécifique
                if (data.id && pixels[data.id]) {
                    delete pixels[data.id]; // Supprime le pixel de la mémoire
                    broadcast({ action: 'erase', data }); // Diffuse l'effacement
                    console.log(`Pixel effacé : ${data.id}`);
                }
            } else if (action === 'chat') {
                const user = users.get(ws) || 'Anonyme';
                if (chatMessage) {
                    console.log(`Message reçu de ${user} : ${chatMessage}`);
                    broadcast({ action: 'chat', data: { username: user, message: chatMessage } });
                } else {
                    console.error('Message de chat vide ou non valide.');
                }
            }
        } catch (err) {
            console.error('Erreur lors du traitement du message :', err);
        }
    });

    ws.on('close', () => {
        const username = users.get(ws);
        console.log(`${username || 'Un utilisateur'} s'est déconnecté.`);
        users.delete(ws);
    });

    // Envoie les pixels initiaux au client
    ws.send(JSON.stringify({ action: 'init', data: pixels }));
});

// Diffusion à tous les clients connectés
function broadcast(message) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

server.listen(8080, () => {
    console.log('Serveur en écoute sur le port 8080');
});
