// script.js (bugfix version)
// Core game state
let boxes = Array.from(document.querySelectorAll(".box"));
let turn = "X";
let isGameOver = false;
let isAIMode = false;
let playerSymbol = "X"; // human player symbol when AI is on
let aiSymbol = "O";

// board: "" | "X" | "O"
let board = Array(9).fill("");

// AI scoreboard key (stores { user: number, ai: number, draw: number })
const SCORE_KEY_AI = "tictactoeAIScore";

// DOM elements
const resultEl = document.getElementById("result");
const playAgainBtn = document.getElementById("play-again");
const bgEl = document.querySelector(".bg");
const aiToggle = document.getElementById("ai-toggle");
const symbolModal = document.getElementById("symbol-modal");
const chooseXBtn = document.getElementById("choose-x");
const chooseOBtn = document.getElementById("choose-o");
const scoreUser = document.getElementById("score-user");
const scoreAi = document.getElementById("score-ai");
const scoreDraw = document.getElementById("score-draw");
const resetScoreBtn = document.getElementById("reset-score");
const changeSymbolBtn = document.getElementById("change-symbol");
const scoreboardEl = document.getElementById("scoreboard");

// dark mode elements
const toggleDarkModeBtn = document.getElementById('toggle-dark-mode');
const sunIcon = document.getElementById('sun-icon');
const moonIcon = document.getElementById('moon-icon');
let isDarkMode = false;

// win conditions
const winConditions = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
];

let lastWinningTriplet = null;

// single AI timeout handle to avoid duplicate scheduling
let aiTimeout = null;

// AI score storage in window._aiScore
loadAIScore();
init();
renderAIScore();
updateTurnIndicator();

// ---------- Initialization ----------
function init(){
    boxes.forEach((box, idx) => {
        box.innerHTML = "";
        box.style.removeProperty("background-color");
        box.style.removeProperty("color");
        box.addEventListener("click", () => handleHumanMove(idx));
    });

    playAgainBtn.addEventListener("click", resetGame);
    aiToggle.addEventListener("change", onAIToggle);
    chooseXBtn.addEventListener("click", () => onSymbolChosen("X"));
    chooseOBtn.addEventListener("click", () => onSymbolChosen("O"));
    resetScoreBtn.addEventListener("click", resetAIScore);
    changeSymbolBtn.addEventListener("click", () => {
        symbolModal.style.display = "flex";
    });

    // dark mode toggle
    toggleDarkModeBtn.addEventListener('click', function() {

        const parent = document.querySelector('.content');
        const allChildren = parent.querySelectorAll('*');  // All descendants
        if(!isDarkMode){
            allChildren.forEach(child => {
            child.style.borderColor = 'white';
            })
        }
        else{
            allChildren.forEach(child =>{
                child.style.borderColor = 'black';
            })
        }
        const targets = [
            document.querySelector('header'),
            document.getElementById('mc'),
            document.getElementById('choose-x'),
            document.getElementById('choose-o'),
            document.getElementById('ai-toggle'),
            document.getElementById('reset-score'),
            document.getElementById('change-symbol'),
        ].filter(Boolean);

        function apply() {
            targets.forEach(el => {
            el.classList.toggle('dark-mode');
            });
        }

        document.querySelectorAll('.box').forEach(e => {
            e.classList.toggle('dark-mode');
        });
        document.body.classList.toggle('dark-mode');
        isDarkMode = !isDarkMode;
        sunIcon.style.display = isDarkMode ? 'none' : 'block';
        moonIcon.style.display = isDarkMode ? 'block' : 'none';
        apply();
    });

    // Initially hide scoreboard (shows only in AI mode)
    updateScoreboardVisibility();
}

// ---------- UI helpers ----------
function updateTurnIndicator() {
    bgEl.style.left = turn === "X" ? "0" : "100px";
}

function showResult(text){
    resultEl.innerHTML = text;
    playAgainBtn.style.display = "block";
}

function hideResult(){
    resultEl.innerHTML = "";
    playAgainBtn.style.display = "none";
}

// ---------- Move handling ----------
function handleHumanMove(idx){
    if (isGameOver) return;
    if (board[idx] !== "") return;

    // If AI mode on, ensure it is human's turn
    if (isAIMode && turn !== playerSymbol) return;

    makeMove(idx, turn);
    postMoveActions();
}

function makeMove(idx, symbol){
    board[idx] = symbol;
    boxes[idx].innerHTML = symbol;
}

function postMoveActions(){
    if (checkWin()){
        isGameOver = true;
        showResult(`${turn} wins!`);
        // update AI scoreboard only if AI mode is on
        if (isAIMode) {
            updateAIScoreFromWinner(turn);
            saveAIScore();
            renderAIScore();
        }
        clearAITimeout(); // no further AI moves
        return;
    }

    if (checkDraw()){
        isGameOver = true;
        showResult("It's a Draw!");
        if (isAIMode) {
            window._aiScore.draw++;
            saveAIScore();
            renderAIScore();
        }
        clearAITimeout();
        return;
    }

    changeTurn();

    // if AI's turn, schedule AI move (safe single-scheduler)
    if (!isGameOver && isAIMode && turn === aiSymbol){
        scheduleAIMove(250);
    }
}

function changeTurn(){
    turn = (turn === "X") ? "O" : "X";
    updateTurnIndicator();
}

// ---------- Win/Draw detection ----------
function checkWin(){
    for (let condition of winConditions){
        const [a,b,c] = condition;
        if (board[a] !== "" && board[a] === board[b] && board[a] === board[c]){
            lastWinningTriplet = condition;
            highlightWinningBoxes(condition);
            return true;
        }
    }
    lastWinningTriplet = null;
    return false;
}

function highlightWinningBoxes(condition){
    condition.forEach(i => {
        boxes[i].style.backgroundColor = "#08D9D6";
        boxes[i].style.color = "#000";
    });
}

function checkDraw(){
    return board.every(cell => cell !== "");
}

// ---------- AI ----------
// Guard: ensure AI only plays when it's actually AI's turn
function aiMakeMove(){
    // Important guards to avoid stray moves:
    if (isGameOver) return;
    if (turn !== aiSymbol) return;

    const emptyIndices = board.map((v,i) => v === "" ? i : -1).filter(i => i !== -1);

    // 1) winning move for AI
    for (let idx of emptyIndices){
        const copy = board.slice();
        copy[idx] = aiSymbol;
        if (wouldWin(copy, aiSymbol)){
            makeMove(idx, aiSymbol);
            postMoveActions();
            return;
        }
    }
    // 2) block player winning move
    for (let idx of emptyIndices){
        const copy = board.slice();
        copy[idx] = playerSymbol;
        if (wouldWin(copy, playerSymbol)){
            makeMove(idx, aiSymbol);
            postMoveActions();
            return;
        }
    }
    // 3) random pick
    if (emptyIndices.length > 0){
        const rand = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        makeMove(rand, aiSymbol);
        postMoveActions();
    }
}

function wouldWin(testBoard, symbol){
    for (let condition of winConditions){
        const [a,b,c] = condition;
        if (testBoard[a] === symbol && testBoard[b] === symbol && testBoard[c] === symbol){
            return true;
        }
    }
    return false;
}

// Schedule AI with single timeout: clears previous schedule before setting a new one
function scheduleAIMove(delayMs = 250){
    clearAITimeout();
    aiTimeout = setTimeout(() => {
        aiTimeout = null;
        aiMakeMove();
    }, delayMs);
}

function clearAITimeout(){
    if (aiTimeout !== null) {
        clearTimeout(aiTimeout);
        aiTimeout = null;
    }
}

// ---------- Reset / New Game ----------
function resetGame(startAIIfX = true){
    // startAIIfX = true keeps previous behaviour: if aiSymbol === "X" then AI plays first.
    // We added this param for callers that want explicit control, but important guard is
    // scheduling via scheduleAIMove (single-scheduler)
    isGameOver = false;
    turn = "X";
    board = Array(9).fill("");
    lastWinningTriplet = null;
    boxes.forEach(box => {
        box.innerHTML = "";
        box.style.removeProperty("background-color");
        box.style.removeProperty("color");
    });
    hideResult();
    updateTurnIndicator();

    clearAITimeout();

    if (isAIMode && startAIIfX && aiSymbol === "X"){
        scheduleAIMove(250);
    }
}

// ---------- AI mode and symbol selection ----------
function onAIToggle(e){
    isAIMode = e.target.checked;
    updateScoreboardVisibility();

    if (isAIMode){
        // ask player to choose symbol when enabling AI
        symbolModal.style.display = "flex";
    } else {
        // turned off -> clear AI scoreboard view, reset symbols to defaults
        playerSymbol = "X";
        aiSymbol = "O";
        // ensure no stray AI schedule
        clearAITimeout();
    }
}

function onSymbolChosen(symbol){
    playerSymbol = symbol;
    aiSymbol = (symbol === "X") ? "O" : "X";
    symbolModal.style.display = "none";

    // reset game and explicitly schedule AI only once if needed
    // pass startAIIfX = false to avoid double-scheduling in case caller also schedules
    resetGame(false);

    // If player chose O, AI goes first -> schedule a single AI move
    if (playerSymbol === "O"){
        scheduleAIMove(250);
    }
}

// ---------- AI scoreboard (localStorage) ----------
function loadAIScore(){
    const raw = localStorage.getItem(SCORE_KEY_AI);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            window._aiScore = {
                user: parsed.user || 0,
                ai: parsed.ai || 0,
                draw: parsed.draw || 0
            };
            return;
        } catch(e){}
    }
    window._aiScore = { user: 0, ai: 0, draw: 0 };
}

function saveAIScore(){
    localStorage.setItem(SCORE_KEY_AI, JSON.stringify(window._aiScore));
}

function updateAIScoreFromWinner(winnerSymbol){
    if (!isAIMode) return;
    if (winnerSymbol === aiSymbol) window._aiScore.ai++;
    else if (winnerSymbol === playerSymbol) window._aiScore.user++;
    // else unknown symbol (shouldn't happen)
}

function renderAIScore(){
    scoreUser.textContent = window._aiScore.user;
    scoreAi.textContent = window._aiScore.ai;
    scoreDraw.textContent = window._aiScore.draw;
}

function resetAIScore(){
    window._aiScore = { user: 0, ai: 0, draw: 0 };
    saveAIScore();
    renderAIScore();
}

function updateScoreboardVisibility(){
    if (aiToggle.checked){
        scoreboardEl.style.display = "flex";
    } else {
        scoreboardEl.style.display = "none";
    }
}

// ---------- initial behaviour ----------
loadAIScore();
renderAIScore();
updateTurnIndicator();
