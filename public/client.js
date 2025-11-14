document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  // PAGINI
  const namePage = document.getElementById("name-page");
  const categoryPage = document.getElementById("category-page");
  const gamePage = document.getElementById("game-page");

  // ELEMENTE
  const nameInput = document.getElementById("name-input");
  const nameButton = document.getElementById("name-button");

  const categoryList = document.getElementById("category-list");
  const readyButton = document.getElementById("ready-button");

  const categoryName = document.getElementById("category-name");
  const playerWord = document.getElementById("player-word");

  const chatBox = document.getElementById("chat-box");
  const chatInput = document.getElementById("chat-input");
  const chatSend = document.getElementById("chat-send");

  const voteButtons = document.getElementById("vote-buttons");
  const resetButton = document.getElementById("reset-button");

  // PAGINI
  function showPage(p) {
    namePage.classList.remove("active");
    categoryPage.classList.remove("active");
    gamePage.classList.remove("active");
    p.classList.add("active");
  }

  // CONFIRM NUME
  nameButton.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) return alert("Introdu un nume!");
    socket.emit("setName", name);
    showPage(categoryPage);
  });

  // CATEGORII
  const categories = ["Animale", "Culori", "Obiecte", "Mâncare", "Țări"];

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      socket.emit("selectCategory", cat);
      readyButton.classList.remove("hidden");
    });
    categoryList.appendChild(btn);
  });

  // READY
  readyButton.addEventListener("click", () => {
    readyButton.disabled = true;
    socket.emit("playerReady");
  });

  // CHAT
  chatSend.addEventListener("click", () => {
    const msg = chatInput.value.trim();
    if (!msg) return;
    socket.emit("chatMessage", msg);
    chatInput.value = "";
  });

  socket.on("chatMessage", ({ name, msg }) => {
    const div = document.createElement("div");
    div.textContent = `${name}: ${msg}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  });

  // JOC STARTAT
  socket.on("gameStarted", ({ category, players }) => {
    showPage(gamePage);
    categoryName.textContent = category;

    const me = players.find(p => p.id === socket.id);
    if (me) playerWord.textContent = me.word;

    voteButtons.innerHTML = "";

    players.forEach(p => {
      if (p.id === socket.id) return;
      const btn = document.createElement("button");
      btn.textContent = p.name;
      btn.addEventListener("click", () => {
        socket.emit("vote", p.id);
        voteButtons.querySelectorAll("button").forEach(b => b.disabled = true);
      });
      voteButtons.appendChild(btn);
    });
  });

  // JOC ÎNCHEIAT
  socket.on("gameEnded", () => {
    resetButton.classList.remove("hidden");
  });

  resetButton.addEventListener("click", () => {
    socket.emit("resetGame");
    resetButton.classList.add("hidden");
    showPage(categoryPage);
    readyButton.disabled = false;
  });
});
