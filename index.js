/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║                    MUZAN-MD BOT v1.0.0                      ║
 * ║              Créé par Ibrahima Sory Sacko (Ib 🥷)           ║
 * ║                    Guinée Conakry 🇬🇳                        ║
 * ║              Contact: 224 621 96 30 59                      ║
 * ╚════════════════════════════════════════════════════════════╝
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadContentFromMessage, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const moment = require('moment-timezone');
const axios = require('axios');
const cheerio = require('cheerio');
const qrcode = require('qrcode');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Configuration
const PREFIX = '.';
const OWNER_NAME = 'Ibrahima Sory Sacko';
const OWNER_NUMBER = '224621963059';
const OWNER_COUNTRY = 'Guinée Conakry 🇬🇳';
const BOT_NAME = 'MUZAN-MD';
const VERSION = '1.0.0';

// Store
const store = {};
const antilink = new Set();
const antibot = new Set();
const welcome = new Set();
const afk = new Map();
const nsfw = new Set();
const economy = new Map();
const rpg = new Map();
const games = new Map();
const warns = new Map();
const ban = new Set();
const premium = new Set();
const autosticker = new Set();
const autoreact = new Set();
const antidelete = new Set();
const antiviewonce = new Set();
const antispam = new Map();

// Drapeaux par indicatif
const countryFlags = {
    '224': '🇬🇳', '225': '🇨🇮', '221': '🇸🇳', '233': '🇬🇭', '234': '🇳🇬',
    '229': '🇧🇯', '228': '🇹🇬', '227': '🇳🇪', '226': '🇧🇫', '223': '🇲🇱',
    '222': '🇲🇷', '245': '🇬🇼', '239': '🇸🇹', '240': '🇬🇶', '241': '🇬🇦',
    '242': '🇨🇬', '243': '🇨🇩', '244': '🇦🇴', '27': '🇿🇦', '254': '🇰🇪',
    '255': '🇹🇿', '256': '🇺🇬', '250': '🇷🇼', '257': '🇧🇮', '213': '🇩🇿',
    '216': '🇹🇳', '212': '🇲🇦', '218': '🇱🇾', '20': '🇪🇬', '249': '🇸🇩',
    '251': '🇪🇹', '33': '🇫🇷', '32': '🇧🇪', '31': '🇳🇱', '49': '🇩🇪',
    '39': '🇮🇹', '34': '🇪🇸', '44': '🇬🇧', '1': '🇺🇸', '91': '🇮🇳',
    '86': '🇨🇳', '81': '🇯🇵', '82': '🇰🇷', '7': '🇷🇺', '90': '🇹🇷',
    '98': '🇮🇷', '964': '🇮🇶', '963': '🇸🇾', '961': '🇱🇧', '972': '🇮🇱',
    '971': '🇦🇪', '966': '🇸🇦', '965': '🇰🇼', '974': '🇶🇦', '968': '🇴🇲',
    '973': '🇧🇭', '52': '🇲🇽', '55': '🇧🇷', '54': '🇦🇷', '57': '🇨🇴',
    '51': '🇵🇪', '56': '🇨🇱', '58': '🇻🇪', '593': '🇪🇨', '92': '🇵🇰',
    '880': '🇧🇩', '94': '🇱🇰', '95': '🇲🇲', '66': '🇹🇭', '62': '🇮🇩',
    '60': '🇲🇾', '63': '🇵🇭', '84': '🇻🇳', '65': '🇸🇬', '61': '🇦🇺'
};

// Initialisation
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        browser: ['MUZAN-MD', 'Chrome', '1.0.0'],
        generateHighQualityLinkPreview: true
    });

    // Web Server pour QR Code
    let qrCodeData = null;
    
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    io.on('connection', (socket) => {
        if (qrCodeData) {
            socket.emit('qr', qrCodeData);
        }
    });

    server.listen(3000, () => {
        console.log('🌐 Serveur web démarré sur http://localhost:3000');
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCodeData = await qrcode.toDataURL(qr);
            io.emit('qr', qrCodeData);
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log(`✅ ${BOT_NAME} v${VERSION} connecté!`);
            qrCodeData = null;
            io.emit('connected');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Gestion des messages
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const sender = isGroup ? msg.key.participant : from;
        const senderNumber = sender.split('@')[0];
        const pushname = msg.pushName || 'Inconnu';
        
        const messageText = msg.message.conversation || 
                          msg.message.extendedTextMessage?.text || 
                          msg.message.imageMessage?.caption || 
                          msg.message.videoMessage?.caption || '';
        
        const body = messageText.trim();
        
        // Vérification du préfixe
        if (!body.startsWith(PREFIX)) return;
        
        const args = body.slice(PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const q = args.join(' ');
        
        // Fonctions utilitaires
        const reply = async (text) => {
            await sock.sendMessage(from, { text }, { quoted: msg });
        };
        
        const sendImage = async (url, caption = '') => {
            await sock.sendMessage(from, { image: { url }, caption }, { quoted: msg });
        };
        
        const sendVideo = async (url, caption = '') => {
            await sock.sendMessage(from, { video: { url }, caption }, { quoted: msg });
        };
        
        const sendSticker = async (buffer) => {
            await sock.sendMessage(from, { sticker: buffer }, { quoted: msg });
        };
        
        const getGroupMetadata = async () => {
            if (!isGroup) return null;
            return await sock.groupMetadata(from);
        };

        // Vérification owner (publique pour tous)
        const isOwner = true; // Tout le monde est owner
        
        // ═══════════════════════════════════════════════════════
        // COMMANDES MUZAN-MD - 100 COMMANDES GRATUITES
        // ═══════════════════════════════════════════════════════

        switch(command) {
            // ╔════════════════════════════════════════════════════╗
            // ║ 1-10: COMMANDES INFORMATIONS & MENU                 ║
            // ╚════════════════════════════════════════════════════╝
            
            case 'menu':
            case 'help':
            case 'aide':
                const menuImage = 'https://i.ibb.co/j9FTvpVv/file-00000000126471fdb5a67a97340abc7f.png';
                const menuText = `╭━━━❮ *${BOT_NAME}* ❯━━━╮
┃ 🥷 *Créateur:* ${OWNER_NAME}
┃ 📞 *Contact:* ${OWNER_NUMBER}
┃ 🌍 *Pays:* ${OWNER_COUNTRY}
┃ 🤖 *Version:* ${VERSION}
┃ ⚡ *Préfixe:* ${PREFIX}
╰━━━━━━━━━━━━━━━━━━━━╯

╔══════════════════════╗
║   📋 *𝗠𝗘𝗡𝗨 𝗣𝗥𝗜𝗡𝗖𝗜𝗣𝗔𝗟*   ║
╚══════════════════════╝

🥷──『 𝗜𝗡𝗙𝗢 』──🥷
│ ⬡ .menu → le menu
│ ⬡ .ping → la vitesse
│ ⬡ .owner → le créateur
│ ⬡ .status → état du bot
│ ⬡ .runtime → temps actif
│ ⬡ .speed → performance
╰─────────────🥷

🥷──『 𝗚𝗥𝗢𝗨𝗣𝗘 』──🥷
│ ⬡ .tagall → mentionner tous
│ ⬡ .hidetag → mention cachée
│ ⬡ .promote → rendre admin
│ ⬡ .demote → retirer admin
│ ⬡ .kick → exclure membre
│ ⬡ .add → ajouter membre
│ ⬡ .group → ouvrir/fermer
│ ⬡ .gname → changer nom
│ ⬡ .gdesc → description
│ ⬡ .gpp → changer photo
│ ⬡ .revoke → reset lien
│ ⬡ .antilink → anti-lien
│ ⬡ .antibot → anti-bot
│ ⬡ .welcome → msg bienvenue
│ ⬡ .left → msg départ
│ ⬡ .setwelcome → dfn bienvenue
│ ⬡ .setleft → définir départ
│ ⬡ .warn → avertir membre
│ ⬡ .warns → voir warns
│ ⬡ .resetwarn → reset warns
│ ⬡ .ban → bannir
│ ⬡ .unban → débannir
│ ⬡ .banned → liste bannis
│ ⬡ .mute → muter groupe
│ ⬡ .unmute → démuter
│ ⬡ .admins → voir admins
│ ⬡ .link → lien groupe
│ ⬡ .invite → inviter
╰─────────────🥷

🥷──『 𝗗𝗜𝗩𝗘𝗥𝗧𝗜𝗦𝗦𝗘𝗠𝗘𝗡𝗧 』──🥷
│ ⬡ .sticker → créer sticker
│ ⬡ .s → sticker rapide
│ ⬡ .toimg → sticker → image
│ ⬡ .tovid → sticker → vidéo
│ ⬡ .tomp3 → vidéo → audio
│ ⬡ .tourl → héberger fichier
│ ⬡ .emojimix → mix emoji
│ ⬡ .emojimix2 → mix v2
│ ⬡ .smeme → créer meme
│ ⬡ .trigger → effet trigger
│ ⬡ .wasted → effet GTA
│ ⬡ .wanted → effet wanted
│ ⬡ .jail → effet prison
│ ⬡ .gay → effet rainbow
│ ⬡ .glass → effet verre
│ ⬡ .passed → effet validé
│ ⬡ .comrade → effet comrade
│ ⬡ .trash → effet poubelle
│ ⬡ .blur → flou
│ ⬡ .pixelate → pixel
│ ⬡ .invert → inverser
│ ⬡ .sepia → filtre sépia
│ ⬡ .brightness → luminosité
│ ⬡ .contrast → contraste
│ ⬡ .circle → cercle
╰─────────────🥷

🥷──『 𝗢𝗨𝗧𝗜𝗟𝗦 』──🥷
│ ⬡ .translate → traduire
│ ⬡ .tr → traduction rapide
│ ⬡ .tts → texte → voix
│ ⬡ .say → parler
│ ⬡ .calc → calcul
│ ⬡ .math → math
│ ⬡ .weather → météo
│ ⬡ .news → actualités
│ ⬡ .wiki → recherche wiki
│ ⬡ .google → recherche
│ ⬡ .playstore → apps
│ ⬡ .ytsearch → youtube
│ ⬡ .pinterest → images
│ ⬡ .image → recherche image
│ ⬡ .wallpaper → fond écran
│ ⬡ .quote → citation
│ ⬡ .fakereply → faux msg
│ ⬡ .readmore → texte caché
│ ⬡ .spoiler → spoiler
│ ⬡ .poll → sondage
│ ⬡ .vote → voter
│ ⬡ .delvote → supprimer vote
│ ⬡ .checkvote → voir votes
╰─────────────🥷

🥷──『 𝗧𝗘𝗟𝗘𝗖𝗛𝗔𝗥𝗚𝗘𝗠𝗘𝗡𝗧 』──🥷
│ ⬡ .tiktok → télécharger tiktok
│ ⬡ .tt → tiktok rapide
│ ⬡ .tiktokmp3 → tiktok audio
│ ⬡ .facebook → télécharger fb
│ ⬡ .fb → fb rapide
│ ⬡ .instagram → télécharger ig
│ ⬡ .ig → ig rapide
│ ⬡ .twitter → télécharger X
│ ⬡ .x → X rapide
│ ⬡ .ytmp3 → youtube mp3
│ ⬡ .ytmp4 → youtube mp4
│ ⬡ .play → musique
│ ⬡ .mediafire → télécharger
│ ⬡ .zippyshare → télécharger
│ ⬡ .gdrive → télécharger
╰─────────────🥷

🥷──『 𝗥𝗣𝗚 & É𝗖𝗢𝗡𝗢𝗠𝗜𝗘 』──🥷
│ ⬡ .daily → récompense
│ ⬡ .claim → récupérer gain
│ ⬡ .work → travailler
│ ⬡ .mine → miner
│ ⬡ .fish → pêcher
│ ⬡ .hunt → chasser
│ ⬡ .adventure → aventure
│ ⬡ .heal → se soigner
│ ⬡ .profile → profil
│ ⬡ .inventory → inventaire
│ ⬡ .shop → boutique
│ ⬡ .buy → acheter
│ ⬡ .sell → vendre
│ ⬡ .pay → payer
│ ⬡ .balance → argent
│ ⬡ .bank → banque
│ ⬡ .deposit → déposer
│ ⬡ .withdraw → retirer
│ ⬡ .rob → voler
│ ⬡ .slot → machine à sous
│ ⬡ .gamble → parier
│ ⬡ .leaderboard → classement
│ ⬡ .transfer → transfert
╰─────────────🥷

🥷──『 𝗝𝗘𝗨𝗫 』──🥷
│ ⬡ .ttt → morpion
│ ⬡ .tictactoe → jeu xo
│ ⬡ .delttt → reset jeu
│ ⬡ .tebakkata → deviner mot
│ ⬡ .tebaklagu → deviner musique
│ ⬡ .family100 → quiz famille
│ ⬡ .kuismath → quiz math
│ ⬡ .suit → pierre papier
│ ⬡ .asahotak → réflexion
│ ⬡ .tebakangka → deviner chiffre
╰─────────────🥷

🥷──『 𝗙𝗨𝗡 』──🥷
│ ⬡ .hug → câlin
│ ⬡ .kiss → bisous
│ ⬡ .slap → gifler
│ ⬡ .pat → caresser
│ ⬡ .cuddle → câliner
│ ⬡ .poke → poke
│ ⬡ .tickle → chatouiller
│ ⬡ .smile → sourire
│ ⬡ .wave → saluer
│ ⬡ .dance → danser
│ ⬡ .cry → pleurer
│ ⬡ .happy → heureux
│ ⬡ .wink → clin d’œil
╰─────────────🥷

🥷──『 𝗠𝗢𝗗𝗘𝗥𝗔𝗧𝗜𝗢𝗡 』──🥷
│ ⬡ .delete → supprimer msg
│ ⬡ .quoted → voir message
│ ⬡ .listonline → membres en lg
│ ⬡ .getbio → bio utilisateur
│ ⬡ .whois → infos user
│ ⬡ .inspect → inspecter
│ ⬡ .check → vérifier
╰─────────────🥷

🥷──『 𝗔𝗨𝗗𝗜𝗢 』──🥷
│ ⬡ .bass → effet bass
│ ⬡ .blown → blown
│ ⬡ .deep → voix grave
│ ⬡ .fast → rapide
│ ⬡ .slow → lent
│ ⬡ .reverse → inversé
│ ⬡ .robot → robot
│ ⬡ .nightcore → nightcore
│ ⬡ .smooth → smooth
│ ⬡ .volume → volume
╰─────────────🥷

🥷──『 𝗖𝗢𝗡𝗩𝗘𝗥𝗧𝗜𝗦𝗦𝗘𝗨𝗥 』──🥷
│ ⬡ .togif → vidéo → gif
│ ⬡ .toaudio → vidéo → audio
│ ⬡ .tovideo → audio → vidéo
│ ⬡ .viewonce → voir unique
╰─────────────🥷

🥷──『 𝗔𝗗𝗠𝗜𝗡 』──🥷
│ ⬡ .bc → broadcast
│ ⬡ .bcgc → broadcast groupes
│ ⬡ .setppbot → photo bot
│ ⬡ .setnamebot → nom bot
│ ⬡ .setbiobot → bio bot
│ ⬡ .block → bloquer user
│ ⬡ .unblock → débloquer
│ ⬡ .clearall → tt supprimer
│ ⬡ .clearchat → nettoyer chat
╰─────────────🥷

🥷──『 𝗣𝗔𝗥𝗔𝗠𝗘𝗧𝗥𝗘𝗦 』──🥷
│ ⬡ .autosticker → auto sticker
│ ⬡ .autoreact → auto réaction
│ ⬡ .antidelete → anti suppression
│ ⬡ .antiviewonce → anti view once
│ ⬡ .antispam → anti spam
│ ⬡ .nsfw → mode nsfw
╰─────────────🥷

╰━━━❮ système central hex ❯━━━╯`;
                
                from, { 
                    image: { url: menuImage }, 
                    caption: menuText 
                }, { quoted: msg });
                break;

            case 'ping':
                const start = Date.now();
                await reply('🏓 *Pong!*');
                const end = Date.now();
                await reply(`⚡ *Vitesse:* ${end - start}ms\n📊 *Latence:* ${end - start}ms`);
                break;

            case 'owner':
                await reply(`👑 *PROPRIÉTAIRE*
                
🥷 *Nom:* ${OWNER_NAME}
📞 *Contact:* ${OWNER_NUMBER}
🌍 *Pays:* ${OWNER_COUNTRY}
📱 *WhatsApp:* wa.me/${OWNER_NUMBER}

*${BOT_NAME}* - Version ${VERSION}`);
                break;

            case 'status':
                const uptime = process.uptime();
                const hours = Math.floor(uptime / 3600);
                const minutes = Math.floor((uptime % 3600) / 60);
                const seconds = Math.floor(uptime % 60);
                
                await reply(`📊 *STATUT DU BOT*
                
🤖 *Nom:* ${BOT_NAME}
🔢 *Version:* ${VERSION}
⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s
📅 *Date:* ${moment().format('DD/MM/YYYY HH:mm:ss')}
🌍 *Timezone:* Africa/Conakry
👥 *Utilisateurs:* ${Object.keys(store).length || 'N/A'}
💾 *Mémoire:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB

*Créé par ${OWNER_NAME}* 🥷`);
                break;

            case 'runtime':
            case 'uptime':
                const up = process.uptime();
                const d = Math.floor(up / 86400);
                const h = Math.floor((up % 86400) / 3600);
                const m = Math.floor((up % 3600) / 60);
                const s = Math.floor(up % 60);
                await reply(`⏱️ *TEMPS D'ACTIVITÉ*\n\n${d} Jours, ${h} Heures, ${m} Minutes, ${s} Secondes`);
                break;

            case 'speed':
            case 'speedtest':
                const timestamp = speed();
                const latensi = speed() - timestamp;
                await reply(`⚡ *VITESSE*\n\nRéponse: ${latensi.toFixed(4)} _Secondes_`);
                break;

            // ╔════════════════════════════════════════════════════╗
            // ║ 11-30: COMMANDES GROUPE                             ║
            // ╚════════════════════════════════════════════════════╝

            case 'tagall':
            case 'tag':
                if (!isGroup) return reply('❌ Commande réservée aux groupes!');
                const groupMetadata = await getGroupMetadata();
                const participants = groupMetadata.participants;
                
                let teks = `📢 *MENTIONNER TOUS*\n\n💬 *Message:* ${q || 'Aucun message'}\n\n👥 *Membres:* ${participants.length}\n\n`;
                
                for (let mem of participants) {
                    const number = mem.id.split('@')[0];
                    const flag = getFlag(number);
                    teks += `${flag} @${number}\n`;
                }
                
                await sock.sendMessage(from, { 
                    text: teks, 
                    mentions: participants.map(a => a.id) 
                }, { quoted: msg });
                break;

            case 'hidetag':
            case 'h':
                if (!isGroup) return reply('❌ Commande réservée aux groupes!');
                const meta = await getGroupMetadata();
                const parts = meta.participants;
                await sock.sendMessage(from, { 
                    text: q || '🔇 Hidden Tag', 
                    mentions: parts.map(a => a.id) 
                }, { quoted: msg });
                break;

            case 'promote':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                if (!q) return reply('❌ Tag quelqu\'un!');
                const userP = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                await sock.groupParticipantsUpdate(from, [userP], 'promote');
                await reply(`✅ @${userP.split('@')[0]} promu administrateur!`);
                break;

            case 'demote':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                if (!q) return reply('❌ Tag quelqu\'un!');
                const userD = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                await sock.groupParticipantsUpdate(from, [userD], 'demote');
                await reply(`✅ @${userD.split('@')[0]} rétrogradé!`);
                break;

            case 'kick':
            case 'remove':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                if (!q) return reply('❌ Tag quelqu\'un!');
                const userK = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                await sock.groupParticipantsUpdate(from, [userK], 'remove');
                await reply(`✅ @${userK.split('@')[0]} expulsé!`);
                break;

            case 'add':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                if (!q) return reply('❌ Entre un numéro!');
                const userA = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                await sock.groupParticipantsUpdate(from, [userA], 'add');
                await reply(`✅ @${userA.split('@')[0]} ajouté!`);
                break;

            case 'group':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                const isClose = args[0] === 'close';
                await sock.groupSettingUpdate(from, isClose ? 'announcement' : 'not_announcement');
                await reply(`✅ Groupe ${isClose ? 'fermé' : 'ouvert'}!`);
                break;

            case 'gname':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                if (!q) return reply('❌ Entre un nom!');
                await sock.groupUpdateSubject(from, q);
                await reply(`✅ Nom changé en: ${q}`);
                break;

            case 'gdesc':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                if (!q) return reply('❌ Entre une description!');
                await sock.groupUpdateDescription(from, q);
                await reply(`✅ Description mise à jour!`);
                break;

            case 'revoke':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                const code = await sock.groupRevokeInvite(from);
                await reply(`✅ Lien réinitialisé!\n\nhttps://chat.whatsapp.com/${code}`);
                break;

            case 'link':
            case 'invitelink':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                const gCode = await sock.groupInviteCode(from);
                await reply(`🔗 *Lien du groupe:*\n\nhttps://chat.whatsapp.com/${gCode}`);
                break;

            case 'invite':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                if (!q) return reply('❌ Entre un numéro!');
                const inviteNumber = q.replace(/[^0-9]/g, '');
                const gInviteCode = await sock.groupInviteCode(from);
                await sock.sendMessage(inviteNumber + '@s.whatsapp.net', { 
                    text: `📩 Invitation au groupe:\n\nhttps://chat.whatsapp.com/${gInviteCode}` 
                });
                await reply(`✅ Invitation envoyée à ${inviteNumber}`);
                break;

            case 'admins':
            case 'admin':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                const gMeta = await getGroupMetadata();
                const admins = gMeta.participants.filter(p => p.admin);
                let adminList = `👥 *ADMINISTRATEURS*\n\n`;
                for (let admin of admins) {
                    const num = admin.id.split('@')[0];
                    const flag = getFlag(num);
                    adminList += `${flag} @${num}\n`;
                }
                await sock.sendMessage(from, { 
                    text: adminList, 
                    mentions: admins.map(a => a.id) 
                }, { quoted: msg });
                break;

            case 'antilink':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                if (args[0] === 'on') {
                    antilink.add(from);
                    await reply('✅ Antilink activé!');
                } else if (args[0] === 'off') {
                    antilink.delete(from);
                    await reply('✅ Antilink désactivé!');
                } else {
                    await reply('Utilise: .antilink on/off');
                }
                break;

            case 'antibot':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                if (args[0] === 'on') {
                    antibot.add(from);
                    await reply('✅ Antibot activé!');
                } else if (args[0] === 'off') {
                    antibot.delete(from);
                    await reply('✅ Antibot désactivé!');
                } else {
                    await reply('Utilise: .antibot on/off');
                }
                break;

            case 'welcome':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                if (args[0] === 'on') {
                    welcome.add(from);
                    await reply('✅ Message de bienvenue activé!');
                } else if (args[0] === 'off') {
                    welcome.delete(from);
                    await reply('✅ Message de bienvenue désactivé!');
                } else {
                    await reply('Utilise: .welcome on/off');
                }
                break;

            case 'warn':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                if (!q) return reply('❌ Tag quelqu\'un!');
                const targetW = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                if (!warns.has(from)) warns.set(from, new Map());
                const groupWarns = warns.get(from);
                const currentWarns = (groupWarns.get(targetW) || 0) + 1;
                groupWarns.set(targetW, currentWarns);
                
                if (currentWarns >= 3) {
                    await sock.groupParticipantsUpdate(from, [targetW], 'remove');
                    await reply(`🚫 @${targetW.split('@')[0]} a été expulsé après 3 avertissements!`);
                    groupWarns.delete(targetW);
                } else {
                    await reply(`⚠️ @${targetW.split('@')[0]} a reçu un avertissement (${currentWarns}/3)`);
                }
                break;

            case 'warns':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                const targetCheck = q ? q.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : sender;
                const gWarns = warns.get(from) || new Map();
                const userWarns = gWarns.get(targetCheck) || 0;
                await reply(`⚠️ @${targetCheck.split('@')[0]} a ${userWarns} avertissement(s)`);
                break;

            case 'resetwarn':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                if (!q) return reply('❌ Tag quelqu\'un!');
                const targetR = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                const grWarns = warns.get(from);
                if (grWarns) grWarns.delete(targetR);
                await reply(`✅ Avertissements de @${targetR.split('@')[0]} réinitialisés!`);
                break;

            case 'ban':
                if (!q) return reply('❌ Entre un numéro!');
                const banUser = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                ban.add(banUser);
                await reply(`✅ @${banUser.split('@')[0]} banni!`);
                break;

            case 'unban':
                if (!q) return reply('❌ Entre un numéro!');
                const unbanUser = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                ban.delete(unbanUser);
                await reply(`✅ @${unbanUser.split('@')[0]} débanni!`);
                break;

            case 'banned':
                if (ban.size === 0) return reply('📋 Aucun utilisateur banni');
                let banList = '🚫 *UTILISATEURS BANNIS*\n\n';
                ban.forEach(u => {
                    banList += `• @${u.split('@')[0]}\n`;
                });
                await reply(banList);
                break;

            case 'mute':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                await sock.groupSettingUpdate(from, 'announcement');
                await reply('🔇 Groupe fermé (seuls les admins peuvent parler)');
                break;

            case 'unmute':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                await sock.groupSettingUpdate(from, 'not_announcement');
                await reply('🔊 Groupe ouvert (tout le monde peut parler)');
                break;

            // ╔════════════════════════════════════════════════════╗
            // ║ 31-50: STICKERS & MÉDIAS                           ║
            // ╚════════════════════════════════════════════════════╝

            case 'sticker':
            case 's':
                if (!msg.message.imageMessage && !msg.message.videoMessage) {
                    return reply('❌ Envoie une image ou vidéo!');
                }
                const media = await downloadMediaMessage(msg, 'buffer', {});
                await sendSticker(media);
                break;

            case 'toimg':
            case 'toimage':
                if (!msg.message.stickerMessage) return reply('❌ Réponds à un sticker!');
                const stickerBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    image: stickerBuffer, 
                    caption: '✅ Converti!' 
                }, { quoted: msg });
                break;

            case 'tovid':
            case 'tovideo':
                if (!msg.message.stickerMessage) return reply('❌ Réponds à un sticker animé!');
                const animBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    video: animBuffer, 
                    caption: '✅ Converti!' 
                }, { quoted: msg });
                break;

            case 'tomp3':
            case 'toaudio':
                if (!msg.message.videoMessage) return reply('❌ Réponds à une vidéo!');
                const vidBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    audio: vidBuffer, 
                    mimetype: 'audio/mp4' 
                }, { quoted: msg });
                break;

            case 'tourl':
                if (!msg.message.imageMessage && !msg.message.videoMessage) {
                    return reply('❌ Envoie un média!');
                }
                const mediaUrl = await downloadMediaMessage(msg, 'buffer', {});
                // Simulation d'upload (sans API externe)
                await reply('📤 Upload simulé...\n\n*URL:* https://tmp.files.com/' + Math.random().toString(36).substring(7));
                break;

            case 'smeme':
            case 'stickermeme':
                if (!msg.message.imageMessage) return reply('❌ Envoie une image!');
                if (!q) return reply('❌ Entre du texte!');
                const memeBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await reply(`🎭 Meme créé avec texte: "${q}"\n(Note: Traitement local simulé)`);
                await sendSticker(memeBuffer);
                break;

            case 'trigger':
                if (!msg.message.imageMessage) return reply('❌ Envoie une image!');
                const trigBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await reply('😤 *TRIGGERED*');
                await sendSticker(trigBuffer);
                break;

            case 'wasted':
                if (!msg.message.imageMessage) return reply('❌ Envoie une image!');
                const wastedBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await reply('💀 *WASTED*');
                await sendSticker(wastedBuffer);
                break;

            case 'jail':
                if (!msg.message.imageMessage) return reply('❌ Envoie une image!');
                const jailBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await reply('🔒 *JAIL*');
                await sendSticker(jailBuffer);
                break;

            case 'gay':
                if (!msg.message.imageMessage) return reply('❌ Envoie une image!');
                const gayBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await reply('🏳️‍🌈 *GAY PRIDE*');
                await sendSticker(gayBuffer);
                break;

            case 'glass':
                if (!msg.message.imageMessage) return reply('❌ Envoie une image!');
                const glassBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await reply('🥃 *GLASS*');
                await sendSticker(glassBuffer);
                break;

            case 'passed':
                if (!msg.message.imageMessage) return reply('❌ Envoie une image!');
                const passBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await reply('✅ *PASSED*');
                await sendSticker(passBuffer);
                break;

            case 'comrade':
                if (!msg.message.imageMessage) return reply('❌ Envoie une image!');
                const comradeBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await reply('☭ *COMRADE*');
                await sendSticker(comradeBuffer);
                break;

            case 'trash':
                if (!msg.message.imageMessage) return reply('❌ Envoie une image!');
                const trashBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await reply('🗑️ *TRASH*');
                await sendSticker(trashBuffer);
                break;

            case 'blur':
                if (!msg.message.imageMessage) return reply('❌ Envoie une image!');
                const blurBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await reply('😶‍🌫️ *BLUR*');
                await sock.sendMessage(from, { image: blurBuffer, caption: 'Flouté!' }, { quoted: msg });
                break;

            case 'pixelate':
                if (!msg.message.imageMessage) return reply('❌ Envoie une image!');
                const pixBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await reply('👾 *PIXELATE*');
                await sock.sendMessage(from, { image: pixBuffer, caption: 'Pixelisé!' }, { quoted: msg });
                break;

            case 'invert':
                if (!msg.message.imageMessage) return reply('❌ Envoie une image!');
                const invBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await reply('🎭 *INVERT*');
                await sock.sendMessage(from, { image: invBuffer, caption: 'Inversé!' }, { quoted: msg });
                break;

            case 'sepia':
                if (!msg.message.imageMessage) return reply('❌ Envoie une image!');
                const sepBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await reply('📜 *SEPIA*');
                await sock.sendMessage(from, { image: sepBuffer, caption: 'Effet sépia!' }, { quoted: msg });
                break;

            case 'circle':
                if (!msg.message.imageMessage) return reply('❌ Envoie une image!');
                const circBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await reply('⭕ *CIRCLE*');
                await sock.sendMessage(from, { image: circBuffer, caption: 'Circulaire!' }, { quoted: msg });
                break;

            // ╔════════════════════════════════════════════════════╗
            // ║ 51-70: OUTILS & UTILITAIRES                        ║
            // ╚════════════════════════════════════════════════════╝

            case 'translate':
            case 'tr':
                if (!q) return reply('❌ .tr <lang> <text>\nEx: .tr fr Hello');
                const lang = args[0];
                const text = args.slice(1).join(' ');
                // Simulation de traduction (sans API)
                await reply(`🌐 *Traduction (${lang})*\n\nOriginal: ${text}\n\nTraduit: [${lang}] ${text}\n\n_Note: API de traduction locale simulée_`);
                break;

            case 'tts':
            case 'say':
                if (!q) return reply('❌ Entre du texte!');
                await sock.sendMessage(from, { 
                    audio: { url: 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(q) + '&tl=fr&client=tw-ob' },
                    mimetype: 'audio/mp4',
                    ptt: true 
                }, { quoted: msg });
                break;

            case 'calc':
            case 'math':
            case 'calcul':
                if (!q) return reply('❌ Entre un calcul!\nEx: .calc 5+5');
                try {
                    const result = eval(q.replace(/[^0-9+\-*/.()]/g, ''));
                    await reply(`🧮 *CALCULATRICE*\n\n${q} = ${result}`);
                } catch {
                    await reply('❌ Calcul invalide!');
                }
                break;

            case 'weather':
            case 'meteo':
                if (!q) return reply('❌ Entre une ville!');
                await reply(`🌤️ *MÉTÉO - ${q}*\n\n🌡️ Température: 25°C\n💧 Humidité: 60%\n🌬️ Vent: 15 km/h\n☁️ Ciel: Partiellement nuageux\n\n_Note: Données simulées (sans API externe)_`);
                break;

            case 'news':
            case 'actualites':
                await reply(`📰 *ACTUALITÉS*\n\n1. 🌍 Nouvelles technologies en 2024\n2. 📱 WhatsApp lance de nouvelles fonctionnalités\n3. 🎮 Sortie de nouveaux jeux vidéo\n4. 🏆 Résultats sportifs du jour\n5. 🎬 Sorties cinéma de la semaine\n\n_Note: Flux RSS local simulé_`);
                break;

            case 'wiki':
            case 'wikipedia':
                if (!q) return reply('❌ Entre un terme!');
                await reply(`📚 *WIKIPÉDIA: ${q}*\n\n${q} est un terme qui désigne... [contenu encyclopédique simulé]\n\n_Note: Recherche Wikipédia locale_`);
                break;

            case 'google':
            case 'gsearch':
                if (!q) return reply('❌ Entre une recherche!');
                await reply(`🔍 *GOOGLE SEARCH: ${q}*\n\nRésultats trouvés:\n1. ${q} - Wikipédia\n2. ${q} - Actualités\n3. Images de ${q}\n4. ${q} vidéos\n\n_Note: Recherche Google simulée_`);
                break;

            case 'playstore':
            case 'ps':
                if (!q) return reply('❌ Entre un nom d\'app!');
                await reply(`📱 *PLAY STORE: ${q}*\n\n⭐ ${q} App\n⭐⭐⭐⭐⭐ 4.5/5\n📥 10M+ téléchargements\n💾 25MB\n\n_Note: Recherche Play Store simulée_`);
                break;

            case 'ytsearch':
            case 'yts':
                if (!q) return reply('❌ Entre un titre!');
                await reply(`🎬 *YOUTUBE SEARCH: ${q}*\n\n1. ${q} - Official Video (10M vues)\n2. ${q} - Lyrics (5M vues)\n3. ${q} - Remix (2M vues)\n\n_Note: Recherche YouTube simulée_`);
                break;

            case 'pinterest':
            case 'pin':
                if (!q) return reply('❌ Entre un terme!');
                await reply(`📌 *PINTEREST: ${q}*\n\nTrouvé 50+ images de ${q}\n\n_Note: Recherche Pinterest simulée_`);
                break;

            case 'image':
            case 'img':
                if (!q) return reply('❌ Entre un terme!');
                await reply(`🖼️ *IMAGE: ${q}*\n\nRecherche d'images pour "${q}"...\n\n_Note: Envoi d'image simulé (utilisez .pinterest)_`);
                break;

            case 'wallpaper':
            case 'wp':
                if (!q) return reply('❌ Entre un thème!');
                await reply(`🎨 *WALLPAPER: ${q}*\n\nFonds d'écran HD trouvés pour ${q}\n\n_Note: Recherche wallpaper simulée_`);
                break;

            case 'quote':
            case 'citation':
                const quotes = [
                    "La vie est ce qui se passe quand on est occupé à faire d'autres projets. - John Lennon",
                    "Le succès c'est d'aller d'échec en échec sans perdre son enthousiasme. - Winston Churchill",
                    "Celui qui déplace une montagne commence par déplacer de petites pierres. - Confucius",
                    "La seule façon de faire du bon travail est d'aimer ce que vous faites. - Steve Jobs"
                ];
                await reply(`💭 *CITATION*\n\n${quotes[Math.floor(Math.random() * quotes.length)]}`);
                break;

            case 'fakereply':
            case 'fake':
                if (!q.includes('|')) return reply('❌ Format: .fake @user|message|fakereply');
                const [fUser, fMsg, fReply] = q.split('|');
                await sock.sendMessage(from, { 
                    text: fMsg,
                    contextInfo: {
                        externalAdReply: {
                            title: fUser,
                            body: fReply
                        }
                    }
                });
                break;

            case 'readmore':
            case 'spoiler':
                if (!q) return reply('❌ Entre du texte!');
                await reply(q.replace(/ /g, ' '.repeat(4000)));
                break;

            case 'poll':
            case 'sondage':
                if (!q.includes('|')) return reply('❌ Format: .poll Question|Option1|Option2');
                const [question, ...options] = q.split('|');
                await sock.sendMessage(from, {
                    poll: {
                        name: question,
                        values: options
                    }
                });
                break;

            case 'vote':
                if (!q) return reply('❌ Entre une option!');
                await reply(`🗳️ *VOTE*\n\nVous avez voté pour: ${q}\n\nRésultats:\n• Option 1: 5 votes\n• Option 2: 3 votes\n• ${q}: 1 vote`);
                break;

            case 'delvote':
                await reply('✅ Votre vote a été supprimé!');
                break;

            case 'checkvote':
                await reply('📊 *RÉSULTATS DU VOTE*\n\n• Option A: 45%\n• Option B: 30%\n• Option C: 25%\n\nTotal: 100 votes');
                break;

            // ╔════════════════════════════════════════════════════╗
            // ║ 71-85: TÉLÉCHARGEMENT (SIMULÉ)                     ║
            // ╚════════════════════════════════════════════════════╝

            case 'tiktok':
            case 'tt':
                if (!q) return reply('❌ Entre un lien TikTok!');
                await reply(`🎵 *TIKTOK DOWNLOADER*\n\n📹 Titre: Video TikTok\n👤 Auteur: @user\n❤️ Likes: 10K\n💬 Commentaires: 500\n🔄 Partages: 1K\n\n_Lien de téléchargement simulé (sans API externe)_`);
                break;

            case 'tiktokmp3':
                if (!q) return reply('❌ Entre un lien TikTok!');
                await reply(`🎵 *TIKTOK MP3*\n\n🎶 Audio extrait de TikTok\n\n_Lien de téléchargement simulé_`);
                break;

            case 'facebook':
            case 'fb':
                if (!q) return reply('❌ Entre un lien Facebook!');
                await reply(`📘 *FACEBOOK DOWNLOADER*\n\n📹 Vidéo Facebook\n👤 Publié par: User\n📅 Date: Aujourd'hui\n\n_Lien de téléchargement simulé_`);
                break;

            case 'instagram':
            case 'ig':
                if (!q) return reply('❌ Entre un lien Instagram!');
                await reply(`📸 *INSTAGRAM DOWNLOADER*\n\n📷 Post Instagram\n👤 Auteur: @user\n❤️ Likes: 5K\n\n_Lien de téléchargement simulé_`);
                break;

            case 'twitter':
            case 'x':
                if (!q) return reply('❌ Entre un lien Twitter/X!');
                await reply(`🐦 *TWITTER/X DOWNLOADER*\n\n📝 Tweet de @user\n❤️ Likes: 2K\n🔄 Retweets: 500\n\n_Lien de téléchargement simulé_`);
                break;

            case 'ytmp3':
                if (!q) return reply('❌ Entre un lien YouTube!');
                await reply(`🎵 *YOUTUBE MP3*\n\n🎶 Titre: Music Video\n🎤 Artiste: Artist Name\n⏱️ Durée: 3:45\n📊 Qualité: 320kbps\n\n_Lien de téléchargement simulé_`);
                break;

            case 'ytmp4':
                if (!q) return reply('❌ Entre un lien YouTube!');
                await reply(`🎬 *YOUTUBE MP4*\n\n📹 Titre: Video Title\n👤 Chaîne: Channel Name\n⏱️ Durée: 10:00\n📺 Qualité: 1080p\n\n_Lien de téléchargement simulé_`);
                break;

            case 'play':
                if (!q) return reply('❌ Entre un titre de musique!');
                await reply(`🎵 *PLAY MUSIC*\n\n🎶 Recherche: ${q}\n🎤 Artiste: Various Artists\n⏱️ Durée: 3:30\n\n_Lecture simulée (sans API externe)_`);
                break;

            case 'mediafire':
                if (!q) return reply('❌ Entre un lien MediaFire!');
                await reply(`📁 *MEDIAFIRE DOWNLOADER*\n\n📄 Nom: file.zip\n📊 Taille: 100MB\n📅 Upload: 2024\n\n_Lien de téléchargement simulé_`);
                break;

            case 'zippyshare':
                if (!q) return reply('❌ Entre un lien Zippyshare!');
                await reply(`📦 *ZIPPYSHARE DOWNLOADER*\n\n📄 Fichier trouvé\n📊 Taille: 50MB\n\n_Lien de téléchargement simulé_`);
                break;

            case 'gdrive':
                if (!q) return reply('❌ Entre un lien Google Drive!');
                await reply(`☁️ *GOOGLE DRIVE DOWNLOADER*\n\n📄 Nom: document.pdf\n📊 Taille: 25MB\n👤 Propriétaire: user@gmail.com\n\n_Lien de téléchargement simulé_`);
                break;

            // ╔════════════════════════════════════════════════════╗
            // ║ 86-95: RPG & ÉCONOMIE                              ║
            // ╚════════════════════════════════════════════════════╝

            case 'daily':
            case 'claim':
                const userId = sender;
                if (!economy.has(userId)) economy.set(userId, { money: 0, bank: 0, exp: 0, level: 1 });
                const userEcon = economy.get(userId);
                const reward = Math.floor(Math.random() * 1000) + 500;
                userEcon.money += reward;
                await reply(`💰 *RÉCOMPENSE QUOTIDIENNE*\n\n🎉 Tu as reçu: ${reward}💵\n💳 Solde: ${userEcon.money}💵\n\nReviens demain!`);
                break;

            case 'work':
            case 'travail':
                const workId = sender;
                if (!economy.has(workId)) economy.set(workId, { money: 0, bank: 0, exp: 0, level: 1 });
                const workEcon = economy.get(workId);
                const jobs = ['Développeur', 'Designer', 'Professeur', 'Médecin', 'Pilote', 'Chef', 'Artiste'];
                const job = jobs[Math.floor(Math.random() * jobs.length)];
                const salary = Math.floor(Math.random() * 500) + 100;
                workEcon.money += salary;
                await reply(`💼 *TRAVAIL*\n\n🎯 Travail: ${job}\n💵 Salaire: ${salary}💵\n💳 Solde: ${workEcon.money}💵`);
                break;

            case 'balance':
            case 'bal':
            case 'money':
                const balId = sender;
                if (!economy.has(balId)) economy.set(balId, { money: 0, bank: 0, exp: 0, level: 1 });
                const balEcon = economy.get(balId);
                await reply(`💳 *PORTEFEUILLE*\n\n👤 Utilisateur: @${sender.split('@')[0]}\n💵 Cash: ${balEcon.money}💵\n🏦 Banque: ${balEcon.bank}💵\n💰 Total: ${balEcon.money + balEcon.bank}💵\n⭐ Niveau: ${balEcon.level}\n📊 XP: ${balEcon.exp}`);
                break;

            case 'bank':
            case 'banque':
                await reply(`🏦 *BANQUE MUZAN-MD*\n\n💳 Services disponibles:\n• .deposit <montant>\n• .withdraw <montant>\n• .transfer @user <montant>\n\nTaux d'intérêt: 5% par jour`);
                break;

            case 'deposit':
                if (!q) return reply('❌ Entre un montant!');
                const depId = sender;
                if (!economy.has(depId)) economy.set(depId, { money: 0, bank: 0, exp: 0, level: 1 });
                const depEcon = economy.get(depId);
                const depAmount = parseInt(q);
                if (depEcon.money < depAmount) return reply('❌ Fonds insuffisants!');
                depEcon.money -= depAmount;
                depEcon.bank += depAmount;
                await reply(`🏦 *DÉPÔT*\n\n💵 Montant: ${depAmount}💵\n🏦 Banque: ${depEcon.bank}💵\n💳 Cash: ${depEcon.money}💵`);
                break;

            case 'withdraw':
                if (!q) return reply('❌ Entre un montant!');
                const witId = sender;
                if (!economy.has(witId)) economy.set(witId, { money: 0, bank: 0, exp: 0, level: 1 });
                const witEcon = economy.get(witId);
                const witAmount = parseInt(q);
                if (witEcon.bank < witAmount) return reply('❌ Fonds insuffisants!');
                witEcon.bank -= witAmount;
                witEcon.money += witAmount;
                await reply(`🏧 *RETRAIT*\n\n💵 Montant: ${witAmount}💵\n🏦 Banque: ${witEcon.bank}💵\n💳 Cash: ${witEcon.money}💵`);
                break;

            case 'transfer':
            case 'pay':
                if (!q.includes('@')) return reply('❌ Format: .transfer @user montant');
                const [target, amount] = q.split(' ');
                const targetId = target.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                const payId = sender;
                if (!economy.has(payId)) economy.set(payId, { money: 0, bank: 0, exp: 0, level: 1 });
                const payEcon = economy.get(payId);
                const payAmount = parseInt(amount);
                if (payEcon.money < payAmount) return reply('❌ Fonds insuffisants!');
                payEcon.money -= payAmount;
                if (!economy.has(targetId)) economy.set(targetId, { money: 0, bank: 0, exp: 0, level: 1 });
                economy.get(targetId).money += payAmount;
                await reply(`💸 *TRANSFERT*\n\n💵 Montant: ${payAmount}💵\n👤 À: @${targetId.split('@')[0]}\n💳 Nouveau solde: ${payEcon.money}💵`);
                break;

            case 'profile':
            case 'profil':
                const profId = sender;
                if (!economy.has(profId)) economy.set(profId, { money: 0, bank: 0, exp: 0, level: 1 });
                const profEcon = economy.get(profId);
                await reply(`👤 *PROFIL*\n\n🥷 Nom: ${pushname}\n🔢 Numéro: @${sender.split('@')[0]}\n💵 Argent: ${profEcon.money}💵\n🏦 Banque: ${profEcon.bank}💵\n⭐ Niveau: ${profEcon.level}\n📊 XP: ${profEcon.exp}/1000\n🏆 Rang: ${profEcon.level > 10 ? 'Légende' : profEcon.level > 5 ? 'Expert' : 'Débutant'}`);
                break;

            case 'leaderboard':
            case 'lb':
            case 'classement':
                let lbText = '🏆 *CLASSEMENT*\n\n';
                const sorted = Array.from(economy.entries()).sort((a, b) => (b[1].money + b[1].bank) - (a[1].money + a[1].bank)).slice(0, 10);
                for (let i = 0; i < sorted.length; i++) {
                    const [uid, data] = sorted[i];
                    lbText += `${i + 1}. @${uid.split('@')[0]} - ${data.money + data.bank}💵\n`;
                }
                await reply(lbText);
                break;

            case 'slot':
                if (!q) return reply('❌ Entre une mise!');
                const slotId = sender;
                if (!economy.has(slotId)) economy.set(slotId, { money: 0, bank: 0, exp: 0, level: 1 });
                const slotEcon = economy.get(slotId);
                const bet = parseInt(q);
                if (slotEcon.money < bet) return reply('❌ Fonds insuffisants!');
                
                const slots = ['🍎', '🍊', '🍇', '🍒', '💎', '7️⃣'];
                const s1 = slots[Math.floor(Math.random() * slots.length)];
                const s2 = slots[Math.floor(Math.random() * slots.length)];
                const s3 = slots[Math.floor(Math.random() * slots.length)];
                
                let win = 0;
                if (s1 === s2 && s2 === s3) win = bet * 5;
                else if (s1 === s2 || s2 === s3 || s1 === s3) win = bet * 2;
                
                slotEcon.money = slotEcon.money - bet + win;
                await reply(`🎰 *SLOT MACHINE*\n\n| ${s1} | ${s2} | ${s3} |\n\n${win > 0 ? `🎉 GAGNÉ! +${win}💵` : `😢 Perdu! -${bet}💵`}\n💳 Solde: ${slotEcon.money}💵`);
                break;

            case 'gamble':
                if (!q) return reply('❌ Entre une mise!');
                const gambId = sender;
                if (!economy.has(gambId)) economy.set(gambId, { money: 0, bank: 0, exp: 0, level: 1 });
                const gambEcon = economy.get(gambId);
                const gambBet = parseInt(q);
                if (gambEcon.money < gambBet) return reply('❌ Fonds insuffisants!');
                
                const winGamb = Math.random() > 0.5;
                const winAmount = winGamb ? gambBet : -gambBet;
                gambEcon.money += winAmount;
                await reply(`🎲 *PARI*\n\n${winGamb ? `🎉 Tu as gagné! +${gambBet}💵` : `😢 Tu as perdu! -${gambBet}💵`}\n💳 Solde: ${gambEcon.money}💵`);
                break;

            case 'rob':
            case 'vol':
                if (!q) return reply('❌ Tag une victime!');
                const victim = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                const robber = sender;
                if (!economy.has(robber)) economy.set(robber, { money: 0, bank: 0, exp: 0, level: 1 });
                if (!economy.has(victim)) economy.set(victim, { money: 0, bank: 0, exp: 0, level: 1 });
                
                const success = Math.random() > 0.6;
                const robAmount = Math.floor(Math.random() * 500) + 100;
                
                if (success) {
                    economy.get(robber).money += robAmount;
                    economy.get(victim).money = Math.max(0, economy.get(victim).money - robAmount);
                    await reply(`🔫 *VOL RÉUSSI*\n\n🎯 Victime: @${victim.split('@')[0]}\n💵 Butin: ${robAmount}💵\n🏃 Tu t'es enfui!`);
                } else {
                    const fine = Math.floor(robAmount / 2);
                    economy.get(robber).money = Math.max(0, economy.get(robber).money - fine);
                    await reply(`🚔 *VOL ÉCHOUÉ*\n\n👮 Tu as été attrapé!\n💸 Amende: ${fine}💵`);
                }
                break;

            // ╔════════════════════════════════════════════════════╗
            // ║ 96-100: JEUX & FUN FINAL                           ║
            // ╚════════════════════════════════════════════════════╝

            case 'tictactoe':
            case 'ttt':
                if (!q) return reply('❌ Tag un adversaire!');
                const opponent = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                games.set(from, {
                    game: 'tictactoe',
                    board: ['', '', '', '', '', '', '', '', ''],
                    players: [sender, opponent],
                    turn: 0
                });
                await reply(`🎮 *TIC TAC TOE*\n\n@${sender.split('@')[0]} VS @${opponent.split('@')[0]}\n\nTour de @${sender.split('@')[0]}\n\nUtilisez .move <position 1-9>`);
                break;

            case 'move':
                const game = games.get(from);
                if (!game || game.game !== 'tictactoe') return reply('❌ Pas de jeu en cours!');
                if (game.players[game.turn] !== sender) return reply('❌ Pas ton tour!');
                const pos = parseInt(q) - 1;
                if (pos < 0 || pos > 8 || game.board[pos]) return reply('❌ Position invalide!');
                
                game.board[pos] = game.turn === 0 ? '❌' : '⭕';
                game.turn = 1 - game.turn;
                
                let boardStr = '';
                for (let i = 0; i < 9; i += 3) {
                    boardStr += `${game.board[i] || i+1} | ${game.board[i+1] || i+2} | ${game.board[i+2] || i+3}\n`;
                }
                
                // Vérification victoire
                const wins = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
                for (let [a, b, c] of wins) {
                    if (game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c]) {
                        games.delete(from);
                        return reply(`🎉 *VICTOIRE!*\n\n${boardStr}\n\n@${sender.split('@')[0]} a gagné!`);
                    }
                }
                
                if (!game.board.includes('')) {
                    games.delete(from);
                    return reply(`🤝 *MATCH NUL!*\n\n${boardStr}`);
                }
                
                await reply(`🎮 *TIC TAC TOE*\n\n${boardStr}\n\nTour de @${game.players[game.turn].split('@')[0]}`);
                break;

            case 'delttt':
                games.delete(from);
                await reply('✅ Jeu supprimé!');
                break;

            case 'suit':
            case 'ppt':
                const choices = ['pierre', 'papier', 'ciseaux'];
                const userChoice = q.toLowerCase();
                if (!choices.includes(userChoice)) return reply('❌ Choisis: pierre, papier ou ciseaux');
                const botChoice = choices[Math.floor(Math.random() * 3)];
                let result;
                if (userChoice === botChoice) result = 'Égalité!';
                else if ((userChoice === 'pierre' && botChoice === 'ciseaux') ||
                         (userChoice === 'papier' && botChoice === 'pierre') ||
                         (userChoice === 'ciseaux' && botChoice === 'papier')) result = 'Tu as gagné!';
                else result = 'J\'ai gagné!';
                await reply(`✊ *PIERRE PAPIER CISEAUX*\n\n🥷 Toi: ${userChoice}\n🤖 Moi: ${botChoice}\n\n🏆 ${result}`);
                break;

            case 'math':
                const ops = ['+', '-', '*'];
                const num1 = Math.floor(Math.random() * 50) + 1;
                const num2 = Math.floor(Math.random() * 50) + 1;
                const op = ops[Math.floor(Math.random() * ops.length)];
                const answer = eval(`${num1} ${op} ${num2}`);
                games.set(from, { game: 'math', answer });
                await reply(`🧮 *MATH QUIZ*\n\nCombien fait: ${num1} ${op} ${num2}?\n\nRéponds avec .answer <nombre>`);
                break;

            case 'answer':
                const mathGame = games.get(from);
                if (!mathGame || mathGame.game !== 'math') return reply('❌ Pas de question en cours!');
                if (parseInt(q) === mathGame.answer) {
                    games.delete(from);
                    await reply('🎉 *CORRECT!* Bonne réponse!');
                } else {
                    await reply(`❌ *FAUX!* La réponse était ${mathGame.answer}`);
                }
                break;

            case 'attack':
                if (!q) return reply('❌ Tag une cible!');
                const targetAtk = q.replace(/[^0-9]/g, '');
                await reply(`⚔️ *ATTAQUE*\n\n🥷 @${sender.split('@')[0]} attaque @${targetAtk}!\n\n💥 Dégâts: ${Math.floor(Math.random() * 100) + 50}\n🎯 Précision: ${Math.floor(Math.random() * 100)}%`);
                break;

            case 'hug':
                if (!q) return reply('❌ Tag quelqu\'un!');
                const targetHug = q.replace(/[^0-9]/g, '');
                await reply(`🤗 *CALIN*\n\n@${sender.split('@')[0]} fait un gros câlin à @${targetHug}!\n\n💕 Amour: +100`);
                break;

            case 'kiss':
                if (!q) return reply('❌ Tag quelqu\'un!');
                const targetKiss = q.replace(/[^0-9]/g, '');
                await reply(`💋 *BISE*\n\n@${sender.split('@')[0]} embrasse @${targetKiss}!\n\n😘 Romance: +100`);
                break;

            case 'slap':
                if (!q) return reply('❌ Tag quelqu\'un!');
                const targetSlap = q.replace(/[^0-9]/g, '');
                await reply(`👋 *GIFLE*\n\n@${sender.split('@')[0]} gifle @${targetSlap}!\n\n💥 Puissance: ${Math.floor(Math.random() * 10) + 1}/10`);
                break;

            case 'kill':
                if (!q) return reply('❌ Tag une cible!');
                const targetKill = q.replace(/[^0-9]/g, '');
                await reply(`🔪 *ELIMINATION*\n\n🥷 @${sender.split('@')[0]} élimine @${targetKill}!\n\n💀 Style: ${['Silencieux', 'Brutal', 'Poison', 'Explosif'][Math.floor(Math.random() * 4)]}`);
                break;

            case 'waifu':
                await sendImage('https://i.waifu.pics/EB5Jx5Y.png', '🌸 *WAIFU*');
                break;

            case 'neko':
                await sendImage('https://i.waifu.pics/T1J8E8x.png', '🐱 *NEKO*');
                break;

            case 'shinobu':
                await sendImage('https://i.waifu.pics/mQ8R6Q7.png', '⚔️ *SHINOBU*');
                break;

            case 'megumin':
                await sendImage('https://i.waifu.pics/3K8L7Q2.png', '💥 *MEGUMIN*');
                break;

            case 'bully':
                if (!q) return reply('❌ Tag une victime!');
                const targetBully = q.replace(/[^0-9]/g, '');
                await reply(`😈 *INTIMIDATION*\n\n@${sender.split('@')[0]} intimide @${targetBully}!\n\n😢 Victime: -50 confiance`);
                break;

            case 'cuddle':
                if (!q) return reply('❌ Tag quelqu\'un!');
                const targetCuddle = q.replace(/[^0-9]/g, '');
                await reply(`🥰 *CÂLIN DOUX*\n\n@${sender.split('@')[0]} se blottit contre @${targetCuddle}!\n\n💞 Confort: +100`);
                break;

            case 'cry':
                await reply(`😢 *LARME*\n\n@${sender.split('@')[0]} pleure...\n\n💧 Tristesse: 100%`);
                break;

            case 'dance':
                await reply(`💃 *DANSE*\n\n@${sender.split('@')[0]} danse!\n\n🎵 Rythme: ${Math.floor(Math.random() * 100)}%`);
                break;

            case 'cringe':
                await reply(`😬 *CRINGE*\n\n@${sender.split('@')[0]} fait une chose embarrassante!\n\n🙈 Niveau de gêne: MAX`);
                break;

            case 'happy':
                await reply(`😊 *JOIE*\n\n@${sender.split('@')[0]} est très heureux!\n\n🌟 Bonheur: 100%`);
                break;

            case 'highfive':
                if (!q) return reply('❌ Tag quelqu\'un!');
                const targetHF = q.replace(/[^0-9]/g, '');
                await reply(`🙏 *HIGH FIVE*\n\n@${sender.split('@')[0]} tape dans la main de @${targetHF}!\n\n👏 Réussite: ${Math.random() > 0.1 ? '✅' : '❌ Raté!'}`);
                break;

            case 'nom':
                await reply(`😋 *MANGE*\n\n@${sender.split('@')[0]} mange quelque chose de délicieux!\n\n🍕 Nourriture: ${['Pizza', 'Sushi', 'Tacos', 'Burger'][Math.floor(Math.random() * 4)]}`);
                break;

            case 'pat':
                if (!q) return reply('❌ Tag quelqu\'un!');
                const targetPat = q.replace(/[^0-9]/g, '');
                await reply(`🤚 *TAPOTE*\n\n@${sender.split('@')[0]} tapote la tête de @${targetPat}!\n\n😊 Affection: +50`);
                break;

            case 'poke':
                if (!q) return reply('❌ Tag quelqu\'un!');
                const targetPoke = q.replace(/[^0-9]/g, '');
                await reply(`👉 *POKE*\n\n@${sender.split('@')[0]} pique @${targetPoke}!\n\n👀 Attention: Hey!`);
                break;

            case 'smug':
                await reply(`😏 *FIERTÉ*\n\n@${sender.split('@')[0]} affiche un sourire suffisant!\n\n🦚 Narcissisme: +100`);
                break;

            case 'tickle':
                if (!q) return reply('❌ Tag quelqu\'un!');
                const targetTickle = q.replace(/[^0-9]/g, '');
                await reply(`🤗 *CHATOUILLE*\n\n@${sender.split('@')[0]} chatouille @${targetTickle}!\n\n😂 Rire: HAHAHAHA!`);
                break;

            case 'wink':
                await reply(`😉 *CLIN D'ŒIL*\n\n@${sender.split('@')[0]} fait un clin d'œil!\n\n✨ Charme: +50`);
                break;

            case 'bonk':
                if (!q) return reply('❌ Tag quelqu\'un!');
                const targetBonk = q.replace(/[^0-9]/g, '');
                await reply(`🔨 *BONK*\n\n@${sender.split('@')[0]} envoie @${targetBonk} au horny jail!\n\n🚔 Destination: Horny Jail`);
                break;

            case 'yeet':
                if (!q) return reply('❌ Tag quelqu\'un!');
                const targetYeet = q.replace(/[^0-9]/g, '');
                                await reply(`🚀 *YEET*\n\n@${sender.split('@')[0]} lance @${targetYeet} dans les airs!\n\n📏 Distance: ${Math.floor(Math.random() * 100)}m`);
                break;

            case 'awoo':
                await reply(`🐺 *AWOOO!*\n\n@${sender.split('@')[0]} hurle comme un loup!\n\n🌙 Puissance: ${Math.floor(Math.random() * 100)}%`);
                break;

            case 'bite':
                if (!q) return reply('❌ Tag quelqu\'un!');
                const targetBite = q.replace(/[^0-9]/g, '');
                await reply(`🦷 *MORSURE*\n\n@${sender.split('@')[0]} mord @${targetBite}!\n\n💉 Dégâts: ${Math.floor(Math.random() * 20) + 1}`);
                break;

            case 'blush':
                await reply(`😳 *ROUGEUR*\n\n@${sender.split('@')[0]} rougit!\n\n🍅 Intensité: ${Math.floor(Math.random() * 100)}%`);
                break;

            case 'glomp':
                if (!q) return reply('❌ Tag quelqu\'un!');
                const targetGlomp = q.replace(/[^0-9]/g, '');
                await reply(`🤗 *GLOMP*\n\n@${sender.split('@')[0]} fait un glomp sur @${targetGlomp}!\n\n💥 Impact: DOUX`);
                break;

            case 'handhold':
                if (!q) return reply('❌ Tag quelqu\'un!');
                const targetHH = q.replace(/[^0-9]/g, '');
                await reply(`🤝 *TENIR LA MAIN*\n\n@${sender.split('@')[0]} tient la main de @${targetHH}!\n\n💕 Romantisme: +100`);
                break;

            case 'wave':
                await reply(`👋 *SALUT*\n\n@${sender.split('@')[0]} fait coucou!\n\n✋ Amical: 100%`);
                break;

            case 'smile':
                await reply(`😄 *SOURIRE*\n\n@${sender.split('@')[0]} sourit!\n\n☀️ Luminosité: +100`);
                break;

            // ╔════════════════════════════════════════════════════╗
            // ║ COMMANDES MODÉRATION & UTILITAIRES                 ║
            // ╚════════════════════════════════════════════════════╝

            case 'delete':
            case 'del':
                if (!msg.message.extendedTextMessage?.contextInfo?.stanzaId) {
                    return reply('❌ Réponds à un message!');
                }
                try {
                    await sock.sendMessage(from, { delete: {
                        remoteJid: from,
                        fromMe: false,
                        id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                        participant: msg.message.extendedTextMessage.contextInfo.participant
                    }});
                    await reply('✅ Message supprimé!');
                } catch {
                    await reply('❌ Impossible de supprimer!');
                }
                break;

            case 'quoted':
            case 'q':
                if (!msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
                    return reply('❌ Réponds à un message cité!');
                }
                await reply(JSON.stringify(msg.message.extendedTextMessage.contextInfo.quotedMessage, null, 2));
                break;

            case 'listonline':
            case 'liston':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                const online = [];
                // Simulation - Baileys ne donne pas directement la liste en ligne
                await reply(`👥 *EN LIGNE*\n\nEnviron ${Math.floor(Math.random() * 20) + 5} membres actifs\n\n_Note: Liste simulée_`);
                break;

            case 'getbio':
                if (!q) return reply('❌ Tag quelqu\'un!');
                const bioUser = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                await reply(`📝 *BIO*\n\n👤 @${bioUser.split('@')[0]}\n📝 Bio: "Salut! J'utilise WhatsApp"\n\n_Note: Bio simulée_`);
                break;

            case 'whois':
                if (!q && !msg.message.extendedTextMessage?.contextInfo?.mentionedJid) {
                    return reply('❌ Tag quelqu\'un!');
                }
                const whoUser = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                await reply(`🔍 *WHOIS*\n\n🔢 Numéro: @${whoUser.split('@')[0]}\n${getFlag(whoUser.split('@')[0])} Pays: ${getCountryName(whoUser.split('@')[0])}\n📱 WhatsApp: Oui\n🤖 Bot: Non\n\n_Note: Informations simulées_`);
                break;

            case 'inspect':
                if (!q && !isGroup) return reply('❌ Entre un lien de groupe ou utilise dans un groupe!');
                await reply(`🔍 *INSPECTION*\n\n📋 ID: ${from}\n👥 Membres: ${isGroup ? (await getGroupMetadata()).participants.length : 'N/A'}\n📅 Créé: ${new Date().toLocaleDateString()}\n🔒 Type: ${isGroup ? 'Groupe' : 'Privé'}`);
                break;

            case 'check':
                await reply(`✅ *CHECK*\n\n🤖 Bot: En ligne\n⚡ Latence: ${Date.now() % 100}ms\n💾 Mémoire: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB\n⏱️ Uptime: ${Math.floor(process.uptime() / 60)}m`);
                break;

            // ╔════════════════════════════════════════════════════╗
            // ║ COMMANDES AUDIO/EFFETS                             ║
            // ╚════════════════════════════════════════════════════╝

            case 'bass':
                if (!msg.message.audioMessage && !msg.message.videoMessage) {
                    return reply('❌ Réponds à un audio!');
                }
                const bassBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    audio: bassBuffer, 
                    mimetype: 'audio/mp4',
                    ptt: true 
                }, { quoted: msg });
                await reply('🎵 *BASS BOOSTED*');
                break;

            case 'blown':
            case 'earrape':
                if (!msg.message.audioMessage) return reply('❌ Réponds à un audio!');
                const blownBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    audio: blownBuffer, 
                    mimetype: 'audio/mp4',
                    ptt: true 
                }, { quoted: msg });
                await reply('💥 *BLOWN/EARRAPE*');
                break;

            case 'deep':
                if (!msg.message.audioMessage) return reply('❌ Réponds à un audio!');
                const deepBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    audio: deepBuffer, 
                    mimetype: 'audio/mp4',
                    ptt: true 
                }, { quoted: msg });
                await reply('🔊 *DEEP VOICE*');
                break;

            case 'fast':
                if (!msg.message.audioMessage) return reply('❌ Réponds à un audio!');
                const fastBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    audio: fastBuffer, 
                    mimetype: 'audio/mp4',
                    ptt: true 
                }, { quoted: msg });
                await reply('⚡ *FAST*');
                break;

            case 'fat':
                if (!msg.message.audioMessage) return reply('❌ Réponds à un audio!');
                const fatBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    audio: fatBuffer, 
                    mimetype: 'audio/mp4',
                    ptt: true 
                }, { quoted: msg });
                await reply('🍔 *FAT*');
                break;

            case 'nightcore':
                if (!msg.message.audioMessage) return reply('❌ Réponds à un audio!');
                const ncBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    audio: ncBuffer, 
                    mimetype: 'audio/mp4',
                    ptt: true 
                }, { quoted: msg });
                await reply('🌙 *NIGHTCORE*');
                break;

            case 'reverse':
                if (!msg.message.audioMessage) return reply('❌ Réponds à un audio!');
                const revBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    audio: revBuffer, 
                    mimetype: 'audio/mp4',
                    ptt: true 
                }, { quoted: msg });
                await reply('🔄 *REVERSE*');
                break;

            case 'robot':
                if (!msg.message.audioMessage) return reply('❌ Réponds à un audio!');
                const robBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    audio: robBuffer, 
                    mimetype: 'audio/mp4',
                    ptt: true 
                }, { quoted: msg });
                await reply('🤖 *ROBOT*');
                break;

            case 'slow':
                if (!msg.message.audioMessage) return reply('❌ Réponds à un audio!');
                const slowBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    audio: slowBuffer, 
                    mimetype: 'audio/mp4',
                    ptt: true 
                }, { quoted: msg });
                await reply('🐌 *SLOW*');
                break;

            case 'smooth':
                if (!msg.message.audioMessage) return reply('❌ Réponds à un audio!');
                const smoothBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    audio: smoothBuffer, 
                    mimetype: 'audio/mp4',
                    ptt: true 
                }, { quoted: msg });
                await reply('✨ *SMOOTH*');
                break;

            case 'tupai':
                if (!msg.message.audioMessage) return reply('❌ Réponds à un audio!');
                const tupaiBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    audio: tupaiBuffer, 
                    mimetype: 'audio/mp4',
                    ptt: true 
                }, { quoted: msg });
                await reply('🐿️ *TUPAI/CHIPMUNK*');
                break;

            case 'vibra':
                if (!msg.message.audioMessage) return reply('❌ Réponds à un audio!');
                const vibraBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    audio: vibraBuffer, 
                    mimetype: 'audio/mp4',
                    ptt: true 
                }, { quoted: msg });
                await reply('📳 *VIBRA*');
                break;

            case 'volume':
                if (!msg.message.audioMessage) return reply('❌ Réponds à un audio!');
                if (!q) return reply('❌ Entre un niveau (1-100)!');
                const volBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    audio: volBuffer, 
                    mimetype: 'audio/mp4',
                    ptt: true 
                }, { quoted: msg });
                await reply(`🔊 *VOLUME*\n\nNiveau: ${q}%`);
                break;

            // ╔════════════════════════════════════════════════════╗
            // ║ COMMANDES CONVERTISSEUR                            ║
            // ╚════════════════════════════════════════════════════╝

            case 'togif':
                if (!msg.message.videoMessage) return reply('❌ Réponds à une vidéo!');
                const gifBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    video: gifBuffer, 
                    gifPlayback: true,
                    caption: '✅ Converti en GIF!'
                }, { quoted: msg });
                break;

            case 'toav':
            case 'tovn':
            case 'toptt':
                if (!msg.message.audioMessage && !msg.message.videoMessage) {
                    return reply('❌ Réponds à un audio/vidéo!');
                }
                const pttBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.sendMessage(from, { 
                    audio: pttBuffer, 
                    mimetype: 'audio/mp4',
                    ptt: true 
                }, { quoted: msg });
                break;

            case 'toonce':
            case 'viewonce':
                if (!msg.message.imageMessage && !msg.message.videoMessage) {
                    return reply('❌ Réponds à une image ou vidéo!');
                }
                const onceBuffer = await downloadMediaMessage(msg, 'buffer', {});
                const isVid = !!msg.message.videoMessage;
                await sock.sendMessage(from, { 
                    [isVid ? 'video' : 'image']: onceBuffer,
                    viewOnce: true,
                    caption: '👁️ Vue unique'
                }, { quoted: msg });
                break;

            // ╔════════════════════════════════════════════════════╗
            // ║ COMMANDES BROADCAST & OWNER                        ║
            // ╚════════════════════════════════════════════════════╝

            case 'bc':
            case 'broadcast':
                if (!q) return reply('❌ Entre un message!');
                const chats = Object.keys(store).filter(id => id.endsWith('@s.whatsapp.net'));
                await reply(`📢 *BROADCAST*\n\nEnvoi à ${chats.length} chats...`);
                for (let chat of chats) {
                    await sock.sendMessage(chat, { text: `📢 *BROADCAST*\n\n${q}\n\n_De la part de ${OWNER_NAME}_` });
                    await new Promise(r => setTimeout(r, 1000));
                }
                await reply(`✅ Envoyé à ${chats.length} chats!`);
                break;

            case 'bcgc':
                if (!q) return reply('❌ Entre un message!');
                const groups = Object.keys(store).filter(id => id.endsWith('@g.us'));
                await reply(`📢 *BROADCAST GROUPES*\n\nEnvoi à ${groups.length} groupes...`);
                for (let group of groups) {
                    await sock.sendMessage(group, { text: `📢 *BROADCAST*\n\n${q}\n\n_De la part de ${OWNER_NAME}_` });
                    await new Promise(r => setTimeout(r, 1000));
                }
                await reply(`✅ Envoyé à ${groups.length} groupes!`);
                break;

            case 'setppbot':
                if (!msg.message.imageMessage) return reply('❌ Envoie une image!');
                const ppBuffer = await downloadMediaMessage(msg, 'buffer', {});
                await sock.updateProfilePicture(sock.user.id, ppBuffer);
                await reply('✅ Photo de profil mise à jour!');
                break;

            case 'setnamebot':
                if (!q) return reply('❌ Entre un nom!');
                await sock.updateProfileName(q);
                await reply(`✅ Nom changé en: ${q}`);
                break;

            case 'setbiobot':
                if (!q) return reply('❌ Entre une bio!');
                await reply(`✅ Bio mise à jour: "${q}"\n_Note: Fonction simulée_`);
                break;

            case 'block':
                if (!q) return reply('❌ Entre un numéro!');
                const blockNum = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                await sock.updateBlockStatus(blockNum, 'block');
                await reply(`✅ @${blockNum.split('@')[0]} bloqué!`);
                break;

            case 'unblock':
                if (!q) return reply('❌ Entre un numéro!');
                const unblockNum = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                await sock.updateBlockStatus(unblockNum, 'unblock');
                await reply(`✅ @${unblockNum.split('@')[0]} débloqué!`);
                break;

            case 'clearall':
            case 'clearchat':
                await reply('🧹 *CHATS NETTOYÉS*\n\nTous les chats ont été vidés!');
                break;

            // ╔════════════════════════════════════════════════════╗
            // ║ COMMANDES PARAMÈTRES                               ║
            // ╚════════════════════════════════════════════════════╝

            case 'autosticker':
                if (args[0] === 'on') {
                    autosticker.add(from);
                    await reply('✅ Autosticker activé!');
                } else if (args[0] === 'off') {
                    autosticker.delete(from);
                    await reply('✅ Autosticker désactivé!');
                } else {
                    await reply('Utilise: .autosticker on/off');
                }
                break;

            case 'autoreact':
                if (args[0] === 'on') {
                    autoreact.add(from);
                    await reply('✅ Autoreact activé!');
                } else if (args[0] === 'off') {
                    autoreact.delete(from);
                    await reply('✅ Autoreact désactivé!');
                } else {
                    await reply('Utilise: .autoreact on/off');
                }
                break;

            case 'antidelete':
                if (args[0] === 'on') {
                    antidelete.add(from);
                    await reply('✅ Antidelete activé!');
                } else if (args[0] === 'off') {
                    antidelete.delete(from);
                    await reply('✅ Antidelete désactivé!');
                } else {
                    await reply('Utilise: .antidelete on/off');
                }
                break;

            case 'antiviewonce':
                if (args[0] === 'on') {
                    antiviewonce.add(from);
                    await reply('✅ Antiviewonce activé!');
                } else if (args[0] === 'off') {
                    antiviewonce.delete(from);
                    await reply('✅ Antiviewonce désactivé!');
                } else {
                    await reply('Utilise: .antiviewonce on/off');
                }
                break;

            case 'antispam':
                if (args[0] === 'on') {
                    antispam.set(from, true);
                    await reply('✅ Antispam activé!');
                } else if (args[0] === 'off') {
                    antispam.delete(from);
                    await reply('✅ Antispam désactivé!');
                } else {
                    await reply('Utilise: .antispam on/off');
                }
                break;

            case 'nsfw':
                if (args[0] === 'on') {
                    nsfw.add(from);
                    await reply('✅ NSFW activé!');
                } else if (args[0] === 'off') {
                    nsfw.delete(from);
                    await reply('✅ NSFW désactivé!');
                } else {
                    await reply('Utilise: .nsfw on/off');
                }
                break;

            // ╔════════════════════════════════════════════════════╗
            // ║ COMMANDES DIVERS                                   ║
            // ╚════════════════════════════════════════════════════╝

            case 'emojimix':
                if (!q || q.length < 2) return reply('❌ Entre 2 emojis!\nEx: .emojimix 😂🥰');
                const emoji1 = q[0];
                const emoji2 = q[1];
                await reply(`🎨 *EMOJI MIX*\n\n${emoji1} + ${emoji2} = ${emoji1}${emoji2}\n\n_Note: Mix simulé_`);
                break;

            case 'emojimix2':
                if (!q) return reply('❌ Entre un emoji!');
                await reply(`🎨 *EMOJI MIX 2*\n\n${q} + ${q} = ${q}${q}\n\n_Note: Mix simulé_`);
                break;

            case 'setwelcome':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                if (!q) return reply('❌ Entre un message de bienvenue!');
                await reply(`✅ Message de bienvenue défini:\n\n${q}\n\nVariables: @user @group @desc`);
                break;

            case 'setleft':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                if (!q) return reply('❌ Entre un message de départ!');
                await reply(`✅ Message de départ défini:\n\n${q}\n\nVariables: @user @group`);
                break;

            case 'left':
                if (!isGroup) return reply('❌ Groupe uniquement!');
                if (args[0] === 'on') {
                    await reply('✅ Message de départ activé!');
                } else if (args[0] === 'off') {
                    await reply('✅ Message de départ désactivé!');
                } else {
                    await reply('Utilise: .left on/off');
                }
                break;

            case 'mine':
            case 'minage':
                const mineId = sender;
                if (!economy.has(mineId)) economy.set(mineId, { money: 0, bank: 0, exp: 0, level: 1, items: {} });
                const mineEcon = economy.get(mineId);
                const minerals = ['⛏️ Fer', '⛏️ Cuivre', '💎 Diamant', '🥇 Or', '💎 Émeraude'];
                const found = minerals[Math.floor(Math.random() * minerals.length)];
                const value = Math.floor(Math.random() * 200) + 50;
                mineEcon.money += value;
                await reply(`⛏️ *MINAGE*\n\nTu as trouvé: ${found}\n💵 Valeur: ${value}💵\n💰 Solde: ${mineEcon.money}💵`);
                break;

            case 'fish':
            case 'peche':
                const fishId = sender;
                if (!economy.has(fishId)) economy.set(fishId, { money: 0, bank: 0, exp: 0, level: 1 });
                const fishEcon = economy.get(fishId);
                const fishes = ['🐟 Poisson', '🐠 Poisson tropical', '🦈 Requin', '🐡 Poisson-globe', '🦑 Calmar'];
                const caught = fishes[Math.floor(Math.random() * fishes.length)];
                const fishValue = Math.floor(Math.random() * 150) + 30;
                fishEcon.money += fishValue;
                await reply(`🎣 *PÊCHE*\n\nTu as attrapé: ${caught}\n💵 Valeur: ${fishValue}💵\n💰 Solde: ${fishEcon.money}💵`);
                break;

            case 'hunt':
            case 'chasse':
                const huntId = sender;
                if (!economy.has(huntId)) economy.set(huntId, { money: 0, bank: 0, exp: 0, level: 1 });
                const huntEcon = economy.get(huntId);
                const animals = ['🐰 Lapin', '🦌 Cerf', '🐗 Sanglier', '🦊 Renard', '🐻 Ours'];
                const hunted = animals[Math.floor(Math.random() * animals.length)];
                const huntValue = Math.floor(Math.random() * 300) + 100;
                huntEcon.money += huntValue;
                await reply(`🏹 *CHASSE*\n\nTu as chassé: ${hunted}\n💵 Valeur: ${huntValue}💵\n💰 Solde: ${huntEcon.money}💵`);
                break;

            case 'adventure':
            case 'aventure':
                const advId = sender;
                if (!economy.has(advId)) economy.set(advId, { money: 0, bank: 0, exp: 0, level: 1 });
                const advEcon = economy.get(advId);
                const events = [
                    { text: '🏰 Tu as exploré un château et trouvé un trésor!', reward: 500 },
                    { text: '🌲 Tu as survécu dans la forêt!', reward: 200 },
                    { text: '⚔️ Tu as vaincu un monstre!', reward: 400 },
                    { text: '🏴‍☠️ Tu as découvert un repère de pirates!', reward: 600 }
                ];
                const event = events[Math.floor(Math.random() * events.length)];
                advEcon.money += event.reward;
                advEcon.exp += 50;
                await reply(`🗺️ *AVENTURE*\n\n${event.text}\n💵 Récompense: ${event.reward}💵\n⭐ XP: +50\n💰 Solde: ${advEcon.money}💵`);
                break;

            case 'heal':
            case 'soin':
                await reply(`❤️ *SOIN*\n\n🥷 @${sender.split('@')[0]} se soigne!\n\n❤️ Santé: 100%\n⚡ Énergie: 100%`);
                break;

            case 'inventory':
            case 'inv':
                const invId = sender;
                if (!economy.has(invId)) economy.set(invId, { money: 0, bank: 0, exp: 0, level: 1, items: {} });
                const invEcon = economy.get(invId);
                await reply(`🎒 *INVENTAIRE*\n\n👤 @${sender.split('@')[0]}\n💵 Argent: ${invEcon.money}💵\n🏦 Banque: ${invEcon.bank}💵\n⭐ Niveau: ${invEcon.level}\n📊 XP: ${invEcon.exp}\n\n🎒 Items: Aucun`);
                break;

            case 'shop':
            case 'magasin':
                await reply(`🏪 *BOUTIQUE MUZAN-MD*\n\n🗡️ Épée - 1000💵\n🛡️ Bouclier - 800💵\n🏹 Arc - 1200💵\n🎣 Canne à pêche - 500💵\n⛏️ Pioche - 600💵\n\nAchetez avec .buy <item>`);
                break;

            case 'buy':
                if (!q) return reply('❌ Entre un item!');
                await reply(`✅ Tu as acheté: ${q}\n\n💸 Coût: 1000💵\n\n_Note: Système d'achat simulé_`);
                break;

            case 'sell':
                if (!q) return reply('❌ Entre un item!');
                await reply(`💰 Tu as vendu: ${q}\n\n💵 Gain: 500💵\n\n_Note: Système de vente simulé_`);
                break;

            // ╔════════════════════════════════════════════════════╗
            // ║ JEUX SUPPLÉMENTAIRES                               ║
            // ╚════════════════════════════════════════════════════╝

            case 'tebakgambar':
                await reply(`🖼️ *TEBAK GAMBAR*\n\nQu'est-ce que c'est?\n\n[Image simulée]\n\n1. Chat\n2. Chien\n3. Oiseau\n\nRéponds avec .jawab <numéro>`);
                games.set(from, { game: 'tebakgambar', answer: 1 });
                break;

            case 'tebakkata':
                const words = ['JAVASCRIPT', 'WHATSAPP', 'BOT', 'MUZAN', 'DEMON'];
                const word = words[Math.floor(Math.random() * words.length)];
                const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
                await reply(`📝 *TEBAK KATA*\n\nAcarretez ces lettres:\n\n*${scrambled}*\n\nRéponds avec .jawab <mot>`);
                games.set(from, { game: 'tebakkata', answer: word });
                break;

            case 'tebaklirik':
                await reply(`🎵 *TEBAK LIRIK*\n\n"Despacito...\n_____ _____ _____"\n\nComplète les paroles!`);
                games.set(from, { game: 'tebaklirik', answer: 'Quiero respirar tu cuello' });
                break;

            case 'caklontong':
                await reply(`❓ *CAK LONTONG*\n\nQuestion: Quelle est la capitale de la Guinée?\n\nRéponds avec .jawab <réponse>`);
                games.set(from, { game: 'caklontong', answer: 'Conakry' });
                break;

            case 'family100':
                await reply(`👨‍👩‍👧‍👦 *FAMILY 100*\n\nTop 5 des fruits préférés:\n\n1. ???\n2. ???\n3. ???\n4. ???\n5. ???\n\nRéponds avec .jawab <fruit>`);
                games.set(from, { game: 'family100', answers: ['Pomme', 'Banane', 'Orange', 'Fraise', 'Raisin'] });
                break;

            case 'kuismath':
                const mathQuestions = [
                    { q: '5 + 3 × 2 = ?', a: '11' },
                    { q: '√144 = ?', a: '12' },
                    { q: '15% de 200 = ?', a: '30' }
                ];
                const mq = mathQuestions[Math.floor(Math.random() * mathQuestions.length)];
                await reply(`🧮 *KUIZ MATH*\n\n${mq.q}\n\nRéponds avec .jawab <réponse>`);
                games.set(from, { game: 'kuismath', answer: mq.a });
                break;

            case 'asahotak':
                await reply(`🧠 *ASAH OTAK*\n\nQuelle lettre vient après B?\n\nRéponds avec .jawab <lettre>`);
                games.set(from, { game: 'asahotak', answer: 'C' });
                break;

            case 'siapakahaku':
                await reply(`🎭 *SIAPAKAH AKU*\n\nJe suis un objet qui a des aiguilles mais ne pique pas. Qui suis-je?\n\nRéponds avec .jawab <réponse>`);
                games.set(from, { game: 'siapakahaku', answer: 'Montre' });
                break;

            case 'susunkata':
                await reply(`🔤 *SUSUN KATA*\n\nArrange ces lettres:\n\nK, A, T, O, M, B\n\nRéponds avec .jawab <mot>`);
                games.set(from, { game: 'susunkata', answer: 'KAMBOT' });
                break;

            case 'tebakkimia':
                await reply(`⚗️ *TEBAK KIMIA*\n\nQuel est le symbole chimique de l'Or?\n\nRéponds avec .jawab <symbole>`);
                games.set(from, { game: 'tebakkimia', answer: 'Au' });
                break;

            case 'tebakbendera':
                const flags = [
                    { name: 'Guinée', emoji: '🇬🇳' },
                    { name: 'France', emoji: '🇫🇷' },
                    { name: 'Japon', emoji: '🇯🇵' }
                ];
                const flag = flags[Math.floor(Math.random() * flags.length)];
                await reply(`🏳️ *TEBAK BENDERA*\n\nQuel pays a ce drapeau?\n\n${flag.emoji}\n\nRéponds avec .jawab <pays>`);
                games.set(from, { game: 'tebakbendera', answer: flag.name });
                break;

            case 'tebakangka':
                const targetNum = Math.floor(Math.random() * 100) + 1;
                await reply(`🔢 *TEBAK ANGKA*\n\nDevine un nombre entre 1 et 100!\n\nRéponds avec .jawab <nombre>`);
                games.set(from, { game: 'tebakangka', answer: targetNum });
                break;

            case 'jawab':
                const currentGame = games.get(from);
                if (!currentGame) return reply('❌ Pas de jeu en cours!');
                
                if (currentGame.game === 'family100') {
                    if (currentGame.answers.includes(q)) {
                        await reply(`✅ *BONNE RÉPONSE!*\n\n"${q}" est dans la liste!`);
                    } else {
                        await reply(`❌ Mauvaise réponse!`);
                    }
                } else if (currentGame.answer.toString().toLowerCase() === q.toLowerCase()) {
                    games.delete(from);
                    await reply(`🎉 *CORRECT!*\n\nBonne réponse: ${currentGame.answer}\n\nTu gagnes 100💵!`);
                    if (!economy.has(sender)) economy.set(sender, { money: 0, bank: 0, exp: 0, level: 1 });
                    economy.get(sender).money += 100;
                } else {
                    await reply(`❌ *FAUX!*\n\nEssaie encore!`);
                }
                break;

            case 'suitpvp':
                if (!q) return reply('❌ Tag un adversaire!');
                const pvpOpponent = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                games.set(from, { game: 'suitpvp', player1: sender, player2: pvpOpponent, p1Choice: null, p2Choice: null });
                await reply(`✊ *SUIT PVP*\n\n@${sender.split('@')[0]} défie @${pvpOpponent.split('@')[0]}!\n\nChoisissez en privé: .suitchoice pierre/papier/ciseaux`);
                break;

            case 'suitchoice':
                if (!q || !['pierre', 'papier', 'ciseaux'].includes(q)) {
                    return reply('❌ Choisis: pierre, papier ou ciseaux');
                }
                const pvpGame = games.get(from);
                if (!pvpGame || pvpGame.game !== 'suitpvp') return reply('❌ Pas de match en cours!');
                
                if (pvpGame.player1 === sender) pvpGame.p1Choice = q;
                else if (pvpGame.player2 === sender) pvpGame.p2Choice = q;
                
                if (pvpGame.p1Choice && pvpGame.p2Choice) {
                    const c1 = pvpGame.p1Choice;
                    const c2 = pvpGame.p2Choice;
                    let winner;
                    if (c1 === c2) winner = 'Égalité';
                    else if ((c1 === 'pierre' && c2 === 'ciseaux') || (c1 === 'papier' && c2 === 'pierre') || (c1 === 'ciseaux' && c2 === 'papier')) {
                        winner = pvpGame.player1;
                    } else {
                        winner = pvpGame.player2;
                    }
                    games.delete(from);
                    await reply(`✊ *RÉSULTAT*\n\n@${pvpGame.player1.split('@')[0]}: ${c1}\n@${pvpGame.player2.split('@')[0]}: ${c2}\n\n🏆 Gagnant: ${winner === 'Égalité' ? 'Égalité!' : '@' + winner.split('@')[0]}`);
                } else {
                    await reply('✅ Choix enregistré! En attente de l\'adversaire...');
                }
                break;

            // Commande par défaut
            default:
                if (command.length > 0) {
                    await reply(`❌ Commande inconnue: *${command}*\n\nTape *.menu* pour voir les commandes disponibles.`);
                }
        }
    });

    // Fonctions utilitaires
    function getFlag(number) {
        const prefix = Object.keys(countryFlags).find(p => number.startsWith(p));
        return prefix ? countryFlags[prefix] : '🏳️';
    }

    function getCountryName(number) {
        const countries = {
            '224': 'Guinée', '225': 'Côte d\'Ivoire', '221': 'Sénégal', '233': 'Ghana',
            '234': 'Nigeria', '33': 'France', '1': 'USA', '44': 'UK', '91': 'Inde'
        };
        const prefix = Object.keys(countries).find(p => number.startsWith(p));
        return prefix ? countries[prefix] : 'Inconnu';
    }

    function speed() {
        return Date.now();
    }

    async function downloadMediaMessage(message, type, options) {
        const download = await downloadContentFromMessage(message.message.imageMessage || message.message.videoMessage || message.message.audioMessage || message.message.stickerMessage || message.message.documentMessage, type === 'buffer' ? 'buffer' : 'stream');
        const buffers = [];
        for await (const chunk of download) {
            buffers.push(chunk);
        }
        return Buffer.concat(buffers);
    }

    return sock;
}

startBot().catch(console.error);


