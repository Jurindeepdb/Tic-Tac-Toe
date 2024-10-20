let boxes = document.querySelectorAll(".box");

let turn = "X";
let isGameOver = false;


boxes.forEach((box) => {
    box.innerHTML = ""; 
    box.addEventListener("click", () => {
        if (!isGameOver && box.innerHTML === "") {
            box.innerHTML = turn; 
            checkWin();
            checkDraw();
            changeTurn();
        }
    });
});

// Function to change turns
function changeTurn() {
    turn = turn === "X" ? "O" : "X"; 
    document.querySelector(".bg").style.left = turn === "X" ? "0" : "100px"; 
}

// Function to check if a player has won
function checkWin() {
    let winConditions = [
        [0, 1, 2], [0, 3, 6], [0, 4, 8],
        [1, 4, 7], [2, 4, 6], [2, 5, 8],
        [3, 4, 5], [6, 7, 8]
    ];

    for (let condition of winConditions) {
        let [a, b, c] = condition;
        if (boxes[a].innerHTML !== "" && boxes[a].innerHTML === boxes[b].innerHTML && boxes[a].innerHTML === boxes[c].innerHTML) {
            isGameOver = true;
            document.querySelector("#result").innerHTML = `${turn} wins!`;
            document.querySelector("#play-again").style.display = "block";
            highlightWinningBoxes(condition); 
            break;
        }
    }
}

// Function to highlight the winning boxes
function highlightWinningBoxes(condition) {
    condition.forEach(index => {
        boxes[index].style.backgroundColor = "#08D9D6"; 
        boxes[index].style.color = "#000"; 
    });
}

// Function to check for a draw
function checkDraw() {
    if (!isGameOver) {
        let isDraw = Array.from(boxes).every(box => box.innerHTML !== "");
        if (isDraw) {
            isGameOver = true;
            document.querySelector("#result").innerHTML = "It's a Draw!";
            document.querySelector("#play-again").style.display = "block";
        }
    }
}

// Event listener for the "Play Again" button
document.querySelector("#play-again").addEventListener("click", () => {
    resetGame();
});

// Function to reset the game
function resetGame() {
    isGameOver = false;
    turn = "X"; // Reset turn to X
    document.querySelector(".bg").style.left = "0"; 
    document.querySelector("#result").innerHTML = ""; 
    document.querySelector("#play-again").style.display = "none"; 

    boxes.forEach(box => {
        box.innerHTML = ""; // Clear all boxes
        box.style.removeProperty("background-color"); 
        box.style.color = "#fff"; 
    });
}


let toggleDarkModeBtn = document.getElementById('toggle-dark-mode');

let isDarkMode = false;


toggleDarkModeBtn.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');

    isDarkMode = !isDarkMode; 

    document.getElementById('sun-icon').style.display = isDarkMode ? 'none' : 'block';
    document.getElementById('moon-icon').style.display = isDarkMode ? 'block' : 'none';
});
