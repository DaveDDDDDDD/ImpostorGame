const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// SERVEȘTE FIȘIERELE DIN PUBLIC
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server pornit pe portul " + PORT));

let players = [];
let impostorId = null;
let gameStarted = false;
let category = "";
let votes = {};

const categories = {
  Animale: ["pisică","câine","cal","elefant","urs","leu","tigru","iepure","girafă","vulpe"],
  Culori: ["roșu","albastru","verde","galben","negru","alb","mov","portocaliu","gri","maro"],
  Obiecte: ["scaun","masă","laptop","telefon","pix","carte","sticlă","geantă","oglindă","cheie"],
  Mâncare: ["pizza","burger","supă","paste","tort","înghețată","pește","omletă","salată","ciorbă"],
  Țări: ["România","Italia","Spania","Franța","Germania","Grecia","Portugalia","SUA","Canada","China"],
};

io.on("connection", socket => {
  console.log("Conectat:", socket.id);

  socket.on("setName", name => {
    if(gameStarted) return;
    if(players.some(p=>p.id===socket.id)) return;
    players.push({id: socket.id, name, word:"", voted:false, ready:false});
    console.log(`${name} s-a conectat.`);
  });

  socket.on("selectCategory", cat => {
    if(!gameStarted){
      category = cat;
      io.emit("categoryChosen", cat);
    }
  });

  socket.on("playerReady", () => {
    const player = players.find(p => p.id===socket.id);
    if(player) player.ready = true;

    if(players.length >= 3 && players.every(p=>p.ready)) {
      startGame();
    }
  });

  socket.on("chatMessage", msg => {
    const player = players.find(p => p.id===socket.id);
    if(player) io.emit("chatMessage", {name: player.name, msg});
  });

  socket.on("vote", votedId => {
    const voter = players.find(p=>p.id===socket.id);
    if(!voter || voter.voted) return;
    voter.voted = true;

    votes[votedId] = (votes[votedId]||0)+1;

    const votedPlayer = players.find(p=>p.id===votedId);
    if(votedPlayer) io.emit("chatMessage",{name:"Sistem", msg:`🗳️ ${voter.name} a votat pe ${votedPlayer.name}.`});

    if(players.every(p=>p.voted)) endVoting();
  });

  socket.on("resetGame", () => {
    if(gameStarted) return;
    players.forEach(p=>{p.word=""; p.voted=false; p.ready=false;});
    category=""; votes={}; impostorId=null;
    io.emit("chatMessage",{name:"Sistem", msg:"🔄 Jocul a fost resetat."});
    io.emit("gameEnded");
  });

  socket.on("disconnect", () => {
    players = players.filter(p=>p.id!==socket.id);
    console.log(`Jucător deconectat: ${socket.id}`);
  });
});

function startGame(){
  gameStarted=true; votes={}; players.forEach(p=>{p.voted=false;});
  impostorId = players[Math.floor(Math.random()*players.length)].id;

  const words = categories[category];
  let normalWord = words[Math.floor(Math.random()*words.length)];
  let impostorWord;
  do { impostorWord = words[Math.floor(Math.random()*words.length)]; } while(impostorWord===normalWord);

  players.forEach(p=>{ p.word = (p.id===impostorId)? impostorWord : normalWord; });

  io.emit("gameStarted",{
    category,
    players: players.map(p=>({id:p.id,name:p.name,word:p.word}))
  });

  io.emit("chatMessage",{name:"Sistem", msg:`🎮 Jocul a început! Categoria: ${category}`});
}

function endVoting(){
  let maxVotes=0, eliminatedId=null;

  for(const [id,count] of Object.entries(votes)){
    if(count>maxVotes){ maxVotes=count; eliminatedId=id; }
  }

  const eliminated = players.find(p=>p.id===eliminatedId);
  const impostor = players.find(p=>p.id===impostorId);

  if(eliminatedId === impostorId){
    io.emit("chatMessage",{name:"Sistem", msg:`✅ ${eliminated.name} era impostorul! Jucătorii au câștigat!`});
  } else {
    io.emit("chatMessage",{name:"Sistem", msg:`❌ ${eliminated ? eliminated.name : "nimeni"} a fost votat! Impostorul era ${impostor.name}!`});
  }

  io.emit("gameEnded");

  gameStarted=false; impostorId=null; votes={};
  players.forEach(p=>{p.word=""; p.voted=false; p.ready=false;});
}
