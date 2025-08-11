const ROWS = 6,
    COLS = 5;
const boardEl = document.getElementById('board');
const input = document.getElementById('ghost');
const msg = document.getElementById('msg');
let gamesData = [];

let launchChannelId = null;

async function initDiscord() {
    await sdk.ready(); // Wait until Discord client is ready

    // Get launch context (DM or channel)
    const context = await sdk.commands.getChannel();
    launchChannelId = context.id;
    console.log("Launched from channel:", launchChannelId);
}

initDiscord();


async function loadWords(url) {
    try {
        const txt = await fetch(url, {
            cache: 'no-store'
        }).then(r => r.text());
        // keep 5-letter alpha words, de-duped
        const set = new Set(txt.split(/\r?\n/).map(s => s.trim()).filter(w => /^[a-z]{5}$/i.test(w)));
        const arr = [...set];
        if (arr.length) return arr;
    } catch {
        console.error("Failed to load words");
    }
    return ["super", "yeats", "tonka", "green", "music"]; // fallback
}

const WORDS = await loadWords('words.txt?v=1')
let answer, row, col, grid;

function pick() {
    return WORDS[(Math.random() * WORDS.length) | 0].toUpperCase();
}

let winStreak = 0;

function showPopup(word){
    const pop = document.createElement('div');
    pop.className = 'popup';
    pop.innerHTML = `
        <div>WORD WAS: <b>${word}</b></div>
        <div>WIN STREAK: ${winStreak}</div>
        <button id="keep">KEEP GOING</button>
        <button id="stop">STOP</button>
    `;
    document.body.appendChild(pop);

    document.getElementById('keep').onclick = () => {
        document.body.removeChild(pop);
        newGame();
    };
    document.getElementById('stop').onclick = () => {
        document.body.removeChild(pop);
        stopAndGenerate();
        winStreak = 0;
        msg.textContent = "Game stopped.";
    };
}
newGame();

function newGame() {
    answer = pick();
    row = 0;
    col = 0;
    grid = Array.from({
        length: ROWS
    }, () => Array(COLS).fill(""));
    msg.textContent = "";
    input.value = "";
    render();
}

function render() {
    boardEl.innerHTML = "";
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const d = document.createElement('div');
            d.className = "cell" + (grid[r][c] ? " filled" : "");
            if (r < row) {
                const ch = grid[r][c];
                d.classList.add(
                    ch === answer[c] ? "g" : (answer.includes(ch) ? "y" : "x")
                );
            }
            d.textContent = grid[r][c] || "";
            boardEl.appendChild(d);
        }
    }
}

function score(guess, target) {
    const out = Array(COLS).fill("x");
    const freq = {};
    for (let i = 0; i < COLS; i++) {
        const t = target[i],
            g = guess[i];
        if (g === t) {
            out[i] = "g";
            freq[g] = (freq[g] || 0) - 1;
        } else freq[t] = (freq[t] || 0) + 1;
    }
    for (let i = 0; i < COLS; i++) {
        if (out[i] !== "x") continue;
        const g = guess[i];
        if ((freq[g] || 0) > 0) {
            out[i] = "y";
            freq[g]--;
        }
    }
    return out;
}

function commit(){
    const word = (input.value || grid[row].join("")).toUpperCase();
    if (word.length !== COLS){ msg.textContent = "5 letters"; return; }
    grid[row] = word.split("");
    row++; col = 0; input.value = "";
    render();
    boardEl.classList.add('row-reveal');
    setTimeout(()=>boardEl.classList.remove('row-reveal'), 320);

    if (word === answer){ 
        winStreak++; 
        gamesData.push({ colors: grid.slice(0, row).map(r => score(r.join(""), answer)) });
        showPopup(answer); 
        return; 
    }
    if (row === ROWS){ 
        gamesData.push({ colors: grid.slice(0, row).map(r => score(r.join(""), answer)) });
        msg.textContent = `Answer: ${answer}`; 
        setTimeout(newGame, 1500); 
    }
}

function stopAndGenerate() {
    const cols = 3, cellSize = 40, tileGap = 4, tileRadius = 6;
    const padding = 40, labelHeight = 28;
    const gamesToShow = gamesData.slice(-6);
    const rows = Math.ceil(gamesToShow.length / cols);

    const boardWidth = COLS * (cellSize + tileGap) - tileGap;
    const boardHeight = ROWS * (cellSize + tileGap) - tileGap;

    const canvas = document.createElement('canvas');
    canvas.width = cols * (boardWidth + padding) + padding;
    canvas.height = rows * (boardHeight + padding + labelHeight) + padding;

    const ctx = canvas.getContext('2d');

    // Background fill
    ctx.fillStyle = '#121213';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';

    gamesToShow.forEach((game, index) => {
        const colIndex = index % cols;
        const rowIndex = Math.floor(index / cols);

        const startX = padding + colIndex * (boardWidth + padding);
        const startY = padding + rowIndex * (boardHeight + padding + labelHeight) + labelHeight;

        // Label
        ctx.fillStyle = '#fff';
        ctx.fillText(`Game ${index + 1}`, startX + boardWidth / 2, startY - 8);

        // Calculate centering offsets
        const usedRows = game.colors.length;
        const usedCols = game.colors[0].length;
        const offsetX = (COLS - usedCols) * (cellSize + tileGap) / 2;
        const offsetY = (ROWS - usedRows) * (cellSize + tileGap) / 2;

        // Draw tiles
        game.colors.forEach((r, y) => {
            r.forEach((color, x) => {
                const tileX = startX + offsetX + x * (cellSize + tileGap);
                const tileY = startY + offsetY + y * (cellSize + tileGap);

                ctx.fillStyle = color === 'g' ? '#538d4e' :
                                color === 'y' ? '#b59f3b' : '#3a3a3c';

                // Rounded tile
                ctx.beginPath();
                ctx.moveTo(tileX + tileRadius, tileY);
                ctx.lineTo(tileX + cellSize - tileRadius, tileY);
                ctx.quadraticCurveTo(tileX + cellSize, tileY, tileX + cellSize, tileY + tileRadius);
                ctx.lineTo(tileX + cellSize, tileY + cellSize - tileRadius);
                ctx.quadraticCurveTo(tileX + cellSize, tileY + cellSize, tileX + cellSize - tileRadius, tileY + cellSize);
                ctx.lineTo(tileX + tileRadius, tileY + cellSize);
                ctx.quadraticCurveTo(tileX, tileY + cellSize, tileX, tileY + cellSize - tileRadius);
                ctx.lineTo(tileX, tileY + tileRadius);
                ctx.quadraticCurveTo(tileX, tileY, tileX + tileRadius, tileY);
                ctx.closePath();
                ctx.fill();

                // Black border
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        });
    });

    async function sendImageToChannel(canvas) {
        if (!launchChannelId) return console.warn("No channel detected.");

        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        const formData = new FormData();
        formData.append("file", blob, "summary.png");

        await fetch(`https://discord.com/api/v10/channels/${launchChannelId}/messages`, {
            method: "POST",
            headers: {
                Authorization: `Bot ${YOUR_BOT_TOKEN}` // Needs your bot token
            },
            body: formData
        });
    }

    const img = document.createElement('img');
    img.src = canvas.toDataURL();
    document.body.appendChild(img);

    sendImageToChannel(canvas);
}

// optional keyboard support
window.addEventListener('keydown', e => {
    if (e.key === 'Enter') return commit();
    if (e.key === 'Backspace') {
        if (col > 0) {
            col--;
            grid[row][col] = "";
            render();
        }
        return;
    }
    if (/^[a-z]$/i.test(e.key) && col < COLS && row < ROWS) {
        grid[row][col++] = e.key.toUpperCase();
        render();
    }
});

document.getElementById('enter').onclick = commit;
document.getElementById('new').onclick = newGame;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('stop').onclick = () => {
        document.body.removeChild(pop);
        stopAndGenerate();
        winStreak = 0;
        msg.textContent = "Game stopped.";
    }
});