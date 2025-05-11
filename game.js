// קבועים
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 20;
const PLAYER_SPEED = 3;
const ENEMY_SPEED = 2;

// צבעים
const COLORS = {
    BLUE: '#0000FF',
    RED: '#FF0000',
    WHITE: '#FFFFFF',
    BLACK: '#000000',
    YELLOW: '#FFFF00'
};

// רמות שחקנים
const PLAYER_LEVELS = {
    "רות אלירז": { grade: 4, difficulty: "easy" },
    "חירות מוריה": { grade: 5, difficulty: "medium" },
    "יאיר אביחי": { grade: 7, difficulty: "hard" }
};

// משתנים גלובליים
let canvas, ctx;
let player = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    direction: [0, 0],
    lives: 3,
    score: 0,
    name: "רות אלירז",
    level: "easy",
    trophies: 0,
    isChampion: false
};
let enemies = [];
let food = [];
let currentQuestion = null;
let showingQuestion = false;
let keys = {};
let maze = [];
const MAZE_ROWS = 30;
const MAZE_COLS = 28;
let enemyChaseActive = false;
let enemyChaseTimeout = null;

// מעקב אחרי מפגשים עם אויבים
let enemyEncounterState = [];
const MAX_QUESTIONS_PER_ENCOUNTER = 2;

// מבנה מבוך קלאסי (פשוט, ניתן להרחיב)
const SIMPLE_MAZE = [
    "############################",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o####.#####.##.#####.####o#",
    "#.####.#####.##.#####.####.#",
    "#..........................#",
    "#.####.##.########.##.####.#",
    "#.####.##.########.##.####.#",
    "#......##....##....##......#",
    "######.##### ## #####.######",
    "     #.##### ## #####.#     ",
    "     #.##          ##.#     ",
    "     #.## ###--### ##.#     ",
    "######.## #      # ##.######",
    "      .   #      #   .      ",
    "######.## #      # ##.######",
    "     #.## ######## ##.#     ",
    "     #.##          ##.#     ",
    "     #.## ######## ##.#     ",
    "######.## ######## ##.######",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o..##................##..o#",
    "###.##.##.########.##.##.###",
    "###.##.##.########.##.##.###",
    "#......##....##....##......#",
    "#.##########.##.##########.#",
    "#..........................#",
    "############################"
];

function setPlayer(name) {
    player.name = name;
    player.level = PLAYER_LEVELS[name].difficulty;
    player.x = CANVAS_WIDTH / 2;
    player.y = CANVAS_HEIGHT / 2;
    player.lives = 3;
    player.score = 0;
    player.trophies = 0;
    player.isChampion = false;
    player.direction = [0, 0];
    enemies = [];
    food = [];
    maze = SIMPLE_MAZE.map(row => row.split(''));
    placeEntitiesFromMaze();
    enemies.forEach(e => e.direction = [1, 0]);
    updateLives();
    updateScore();
    enemyChaseActive = false;
    if (enemyChaseTimeout) clearTimeout(enemyChaseTimeout);
    enemyChaseTimeout = setTimeout(() => { enemyChaseActive = true; }, 10000);
}

function getOpenPositions(count) {
    // מחזיר מערך של מיקומים פתוחים (לא קיר, לא אוכל מיוחד)
    let positions = [];
    for (let row = 0; row < maze.length; row++) {
        for (let col = 0; col < maze[row].length; col++) {
            if (maze[row][col] === '.' && !(row === 14 && (col === 13 || col === 14))) {
                positions.push({row, col});
            }
        }
    }
    // ערבוב ובחירה אקראית
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    return positions.slice(0, count);
}

function placeEntitiesFromMaze() {
    // Reset food and enemies
    food = [];
    enemies = [];
    enemyEncounterState = [];
    for (let row = 0; row < maze.length; row++) {
        for (let col = 0; col < maze[row].length; col++) {
            let cell = maze[row][col];
            let x = col * GRID_SIZE + GRID_SIZE / 2;
            let y = row * GRID_SIZE + GRID_SIZE / 2;
            if (cell === '.') {
                food.push({ x, y, collected: false });
            } else if (cell === 'o') {
                food.push({ x, y, collected: false }); // special food
            } else if (cell === '-') {
                // player start
                player.x = x;
                player.y = y;
            }
        }
    }
    // פיזור אויבים במיקומים פתוחים אקראיים
    let enemyPositions = getOpenPositions(3);
    for (let i = 0; i < enemyPositions.length; i++) {
        let {row, col} = enemyPositions[i];
        enemies.push({
            x: col * GRID_SIZE + GRID_SIZE / 2,
            y: row * GRID_SIZE + GRID_SIZE / 2,
            direction: [1, 0],
            encounter: {inContact: false, questionsAsked: 0}
        });
        enemyEncounterState.push({inContact: false, questionsAsked: 0});
    }
}

// אתחול המשחק
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    maze = SIMPLE_MAZE.map(row => row.split(''));
    setPlayer('רות אלירז');
    // מאזיני מקשים
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        // עדכון כיוון רק בלחיצה
        if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
            if (e.key === 'ArrowLeft') player.direction = [-1, 0];
            else if (e.key === 'ArrowRight') player.direction = [1, 0];
            else if (e.key === 'ArrowUp') player.direction = [0, -1];
            else if (e.key === 'ArrowDown') player.direction = [0, 1];
        }
    });
    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
        // עצור תנועה כשמשחררים חץ
        if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
            player.direction = [0, 0];
        }
    });
    // התחלת לולאת המשחק
    gameLoop();
}

// יצירת שאלה מתמטית
function generateQuestion(difficulty) {
    let num1, num2, operation, answer;
    
    if (difficulty === "easy") {
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        operation = Math.random() < 0.5 ? '+' : '-';
        answer = operation === '+' ? num1 + num2 : num1 - num2;
    } else if (difficulty === "medium") {
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        operation = '*';
        answer = num1 * num2;
    } else {
        num1 = Math.floor(Math.random() * 11) + 10;
        num2 = Math.floor(Math.random() * 10) + 1;
        operation = ['+', '-', '*'][Math.floor(Math.random() * 3)];
        answer = operation === '+' ? num1 + num2 : 
                operation === '-' ? num1 - num2 : num1 * num2;
    }
    
    return {
        text: `${num1} ${operation} ${num2} = ?`,
        answer: answer
    };
}

// בדיקת תשובה
function checkAnswer() {
    const userAnswer = parseInt(document.getElementById('answer').value);
    if (userAnswer === currentQuestion.answer) {
        player.score += 10;
        if (player.score % 10 === 0) {
            player.lives = Math.min(5, player.lives + 1);
            updateLives();
        }
        if (player.score % 50 === 0) {
            player.trophies++;
            player.isChampion = true;
            document.getElementById('championSound').play();
        }
    } else {
        player.lives--;
        updateLives();
    }
    showingQuestion = false;
    document.getElementById('question').style.display = 'none';
    document.getElementById('answer').value = '';
}

// עדכון תצוגת החיים
function updateLives() {
    let maxLives = 5;
    let hearts = '';
    for (let i = 0; i < player.lives; i++) hearts += '❤️';
    document.getElementById('lives').textContent = hearts;
}

// עדכון תצוגת הניקוד
function updateScore() {
    document.getElementById('score').textContent = `ניקוד: ${player.score}`;
}

function isWall(row, col) {
    if (row < 0 || row >= maze.length || col < 0 || col >= maze[0].length) return true;
    return maze[row][col] === '#';
}

function canMove(x, y, dx, dy) {
    // x, y are center positions
    let newX = x + dx * GRID_SIZE;
    let newY = y + dy * GRID_SIZE;
    let col = Math.floor(newX / GRID_SIZE);
    let row = Math.floor(newY / GRID_SIZE);
    return !isWall(row, col);
}

function moveEntity(entity, speed) {
    let col = Math.floor(entity.x / GRID_SIZE);
    let row = Math.floor(entity.y / GRID_SIZE);
    let [dx, dy] = entity.direction;
    if (canMove(entity.x, entity.y, dx, dy)) {
        entity.x += dx * speed;
        entity.y += dy * speed;
    } else {
        // Stop at wall
        entity.direction = [0, 0];
    }
}

function drawMaze() {
    for (let row = 0; row < maze.length; row++) {
        for (let col = 0; col < maze[row].length; col++) {
            let cell = maze[row][col];
            let x = col * GRID_SIZE;
            let y = row * GRID_SIZE;
            if (cell === '#') {
                ctx.fillStyle = '#1e3a5c';
                ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
                ctx.strokeStyle = '#4fc3f7';
                ctx.lineWidth = Math.max(2, Math.floor(GRID_SIZE/8));
                ctx.strokeRect(x + 2, y + 2, GRID_SIZE - 4, GRID_SIZE - 4);
                ctx.fillStyle = '#b3e5fc';
                ctx.fillRect(x + GRID_SIZE/3, y + GRID_SIZE/3, Math.max(3, GRID_SIZE/6), Math.max(5, GRID_SIZE/4));
            } else {
                ctx.fillStyle = '#222';
                ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
                if (row % 2 === 0 && col % 2 === 0) {
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(x + GRID_SIZE/2, y + GRID_SIZE/2, Math.max(1, GRID_SIZE/10), Math.max(1, GRID_SIZE/10));
                }
            }
        }
    }
}

// ציור המשחק
function draw() {
    // ציור מבוך עירוני
    drawMaze();
    // ציור אוכל
    food.forEach(f => {
        if (!f.collected) {
            ctx.fillStyle = COLORS.WHITE;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    // ציור אויבים
    enemies.forEach(e => {
        ctx.save();
        ctx.shadowColor = '#f00';
        ctx.shadowBlur = 10;
        ctx.fillStyle = COLORS.RED;
        ctx.beginPath();
        ctx.arc(e.x, e.y, GRID_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
    // ציור שחקן
    ctx.save();
    ctx.shadowColor = '#00f';
    ctx.shadowBlur = 10;
    ctx.fillStyle = COLORS.BLUE;
    ctx.beginPath();
    ctx.arc(player.x, player.y, GRID_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // עדכון תצוגת הניקוד
    updateScore();
}

function enemyChaseAI(enemy) {
    // כיוון שמקרב לאזור השחקן, אם אין קיר
    let px = Math.round(player.x / GRID_SIZE);
    let py = Math.round(player.y / GRID_SIZE);
    let ex = Math.round(enemy.x / GRID_SIZE);
    let ey = Math.round(enemy.y / GRID_SIZE);
    let options = [];
    if (py < ey && !isWall(ey - 1, ex)) options.push([0, -1]);
    if (py > ey && !isWall(ey + 1, ex)) options.push([0, 1]);
    if (px < ex && !isWall(ey, ex - 1)) options.push([-1, 0]);
    if (px > ex && !isWall(ey, ex + 1)) options.push([1, 0]);
    if (options.length > 0) {
        enemy.direction = options[Math.floor(Math.random() * options.length)];
    } else {
        // אם אין כיוון פנוי, בחר אקראי (ולא תעצור)
        let dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        let valid = dirs.filter(d => !isWall(ey + d[1], ex + d[0]));
        if (valid.length > 0) enemy.direction = valid[Math.floor(Math.random()*valid.length)];
        else enemy.direction = dirs[Math.floor(Math.random()*dirs.length)]; // תמיד תזוז
    }
}

// עדכון מצב המשחק
function update() {
    if (!showingQuestion) {
        moveEntity(player, PLAYER_SPEED);
        // תנועת אויבים (רדיפה אחרי השחקן אחרי 10 שניות)
        enemies.forEach((e, idx) => {
            if (enemyChaseActive) {
                // אם לא יכול לזוז בכיוון הנוכחי, בחר כיוון חדש
                if (!canMove(e.x, e.y, e.direction[0], e.direction[1])) {
                    enemyChaseAI(e);
                }
                enemyChaseAI(e);
                moveEntity(e, ENEMY_SPEED);
            } else {
                // גם בהמתנה, האויבים ינועו אקראית
                if (e.direction[0] === 0 && e.direction[1] === 0) {
                    let dirs = [[1,0],[-1,0],[0,1],[0,-1]];
                    e.direction = dirs[Math.floor(Math.random()*dirs.length)];
                }
                moveEntity(e, ENEMY_SPEED);
            }
            // בדיקת התנגשות עם אויב
            let touching = Math.abs(player.x - e.x) < GRID_SIZE && Math.abs(player.y - e.y) < GRID_SIZE;
            if (touching) {
                if (!e.encounter.inContact) {
                    e.encounter.inContact = true;
                    e.encounter.questionsAsked = 0;
                }
                if (e.encounter.questionsAsked < MAX_QUESTIONS_PER_ENCOUNTER && !showingQuestion) {
                    currentQuestion = generateQuestion(player.level);
                    showingQuestion = true;
                    document.getElementById('questionText').textContent = currentQuestion.text;
                    document.getElementById('question').style.display = 'block';
                    e.encounter.questionsAsked++;
                }
            } else {
                e.encounter.inContact = false;
                e.encounter.questionsAsked = 0;
            }
        });
        // בדיקת התנגשות עם אוכל
        food.forEach(f => {
            if (!f.collected && Math.abs(player.x - f.x) < GRID_SIZE && Math.abs(player.y - f.y) < GRID_SIZE) {
                f.collected = true;
                player.score++;
                if (player.score % 10 === 0) {
                    player.lives = Math.min(5, player.lives + 1);
                    updateLives();
                }
                if (player.score % 50 === 0) {
                    player.trophies++;
                    player.isChampion = true;
                    document.getElementById('championSound').play();
                }
            }
        });
    }
}

// לולאת המשחק
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

window.onload = function() {
    init();
}; 