const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const ws = new WebSocket('ws://localhost:8080');

const pixelSize = 30; // Taille d'un pixel
let username = '';
let pageId;
let userColor = ''; // Couleur unique pour chaque client
const localPixels = {}; // Stocke les pixels localement
let selectedPixel = null; // Contient le pixel actuellement sélectionné

// Création du formulaire contextuel
const pixelForm = document.createElement('div');
setupPixelForm(pixelForm);
document.body.appendChild(pixelForm);

// Récupération des boutons du formulaire
const deleteButton = document.getElementById('deletePixel');
const cancelButton = document.getElementById('cancelPixel');

// Génération d'une couleur unique
function generateRandomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
}

// Fonction pour aligner les clics sur une grille
function alignToGrid(value, gridSize) {
    return Math.floor(value / gridSize) * gridSize;
}

// Envoi de messages au serveur
function sendMessage(action, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action, ...data }));
    } else {
        console.error('WebSocket is not open:', ws.readyState);
    }
}

// Affiche ou masque le formulaire contextuel
function togglePixelForm(show, x, y, pixel = null) {
    if (show && pixel) {
        document.getElementById('pixelInfo').textContent = `Pixel à (${pixel.x}, ${pixel.y})`;
        pixelForm.style.left = `${x}px`;
        pixelForm.style.top = `${y}px`;
        pixelForm.style.display = 'block';
        selectedPixel = pixel;
    } else {
        pixelForm.style.display = 'none';
        selectedPixel = null;
    }
}

// Dessine un pixel sur le canvas
function drawPixel({ x, y, color }) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, pixelSize, pixelSize);
}

// Efface un pixel du canvas
function clearPixel({ x, y }) {
    ctx.clearRect(x, y, pixelSize, pixelSize);
}

// Ajoute un message au chat
function addChatMessage(username, message) {
    const chatMessages = document.getElementById('chatMessages');
    const newMessage = document.createElement('div');
    newMessage.textContent = `${username}: ${message}`;
    chatMessages.appendChild(newMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Scrolling automatique
}

// Connexion
document.getElementById('connectButton').addEventListener('click', () => {
    username = document.getElementById('username').value.trim();
    if (username) {
        userColor = generateRandomColor(); // Attribuer une couleur unique
        console.log(`Connexion avec le pseudo : ${username}, couleur : ${userColor}`);
        document.getElementById('login').style.display = 'none';
        document.getElementById('game').style.display = 'block';
        sendMessage('join', { username, color: userColor });
    } else {
        alert('Veuillez entrer un pseudo.');
    }
});

// Gestion des clics sur le canvas
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = alignToGrid(event.clientX - rect.left, pixelSize); // Aligner sur la grille
    const y = alignToGrid(event.clientY - rect.top, pixelSize); // Aligner sur la grille
    const id = `${x},${y}`;

    if (localPixels[id]) {
        // Si un pixel existe, afficher le formulaire
        togglePixelForm(true, event.pageX, event.pageY, { id, x, y });
    } else {
        // Sinon, dessiner un nouveau pixel
        sendMessage('draw', { data: { id, x, y, color: userColor }, id: pageId });
    }
});

// Gestion du bouton "Supprimer"
deleteButton.addEventListener('click', () => {
    if (selectedPixel) {
        sendMessage('erase', { data: selectedPixel });
        togglePixelForm(false);
    }
});

// Gestion du bouton "Annuler"
cancelButton.addEventListener('click', () => {
    togglePixelForm(false);
});

// Envoi d'un message de chat
document.getElementById('sendButton').addEventListener('click', () => {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (message) {
        sendMessage('chat', { username, message });
        messageInput.value = ''; // Réinitialiser le champ
    }
});

// Gestion des messages reçus via WebSocket
ws.onmessage = (event) => {
    const { action, data } = JSON.parse(event.data);

    const actions = {
        draw: () => {
            drawPixel(data);
            localPixels[data.id] = data; // Stocker localement le pixel dessiné
        },
        erase: () => {
            clearPixel(data);
            delete localPixels[data.id]; // Supprime le pixel localement
        },
        init: () => {
            Object.values(data).forEach((p) => {
                drawPixel(p);
                localPixels[p.id] = p; // Stocke localement les pixels
            });
        },
        chat: () => {
            addChatMessage(data.username, data.message);
        },
    };

    if (actions[action]) actions[action]();
};

// Configuration initiale du formulaire contextuel
function setupPixelForm(form) {
    form.style.position = 'absolute';
    form.style.display = 'none';
    form.style.backgroundColor = 'white';
    form.style.border = '1px solid black';
    form.style.padding = '10px';
    form.innerHTML = `
        <p id="pixelInfo"></p>
        <button id="deletePixel">Supprimer</button>
        <button id="cancelPixel">Annuler</button>
    `;
}
