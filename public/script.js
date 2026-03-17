const socket = io();

const qrContainer = document.getElementById('qr-container');
const qrCode = document.getElementById('qr-code');
const connected = document.getElementById('connected');
const loading = document.querySelector('.loading');

// Génération des particules
function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 10 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
        container.appendChild(particle);
    }
}

createParticles();

// Réception du QR Code
socket.on('qr', (qrData) => {
    loading.classList.add('hidden');
    qrCode.src = qrData;
    qrCode.classList.remove('hidden');
    
    // Animation de scan
    qrContainer.style.borderColor = '#05d9e8';
    setTimeout(() => {
        qrContainer.style.borderColor = 'rgba(255, 42, 109, 0.2)';
    }, 500);
});

// Connexion réussie
socket.on('connected', () => {
    qrContainer.classList.add('hidden');
    connected.classList.remove('hidden');
    
    // Confetti effect
    createConfetti();
});

// Création d'effet confetti
function createConfetti() {
    const colors = ['#ff2a6d', '#05d9e8', '#f9c80e', '#00ff9f'];
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.borderRadius = '50%';
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '9999';
        confetti.style.animation = `fall ${Math.random() * 3 + 2}s linear forwards`;
        document.body.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 5000);
    }
}

// Ajout de l'animation CSS pour les confettis
const style = document.createElement('style');
style.textContent = `
    @keyframes fall {
        to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Effet de survol sur le QR Code
qrCode.addEventListener('mouseenter', () => {
    qrCode.style.transform = 'scale(1.05)';
    qrCode.style.transition = 'transform 0.3s ease';
});

qrCode.addEventListener('mouseleave', () => {
    qrCode.style.transform = 'scale(1)';
});

// Console art
console.log('%c MUZAN-MD ', 'background: linear-gradient(45deg, #ff2a6d, #05d9e8); color: white; font-size: 24px; font-weight: bold; padding: 10px; border-radius: 5px;');
console.log('%c Bot WhatsApp Multi-Device par Ibrahima Sory Sacko ', 'color: #ff2a6d; font-size: 14px;');
console.log('%c 📞 Contact: 224 621 96 30 59 | 🇬🇳 Guinée Conakry ', 'color: #05d9e8; font-size: 12px;');

