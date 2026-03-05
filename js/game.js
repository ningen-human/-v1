// ゲーム設定
const config = {
    canvas: null,
    ctx: null,
    width: 600,
    height: 900, // 基本の高さ
    gravity: 0.5,
    jumpForce: -18,
    gameTime: 60,
    platformSpeed: 2,
};

// パララックス（視差効果）用の背景データ
let backgrounds = {
    clouds: [],
    mountains: []
};

// ゲーム状態
let gameState = {
    isRunning: false,
    score: 0,
    maxHeight: 0,
    timeLeft: config.gameTime,
    gameStartTime: 0,
    platforms: [],
    player: null,
    characterImage: null,
    cameraY: 0,
    joystickActive: false,
    joystickDirection: { x: 0, y: 0 },
    gameMode: 'timeAttack',
    bgm: null,
    highScores: {
        timeAttack: 0,
        endless: 0
    }
};

// プレイヤークラス
class Player {
    constructor() {
        this.width = 90;
        this.height = 120;
        this.x = config.width / 2 - this.width / 2;
        this.y = config.height - 250;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 5;
        this.isJumping = false;
    }

    update() {
        this.velocityY += config.gravity;
        this.y += this.velocityY;
        this.x += this.velocityX;

        if (this.x + this.width < 0) this.x = config.width;
        else if (this.x > config.width) this.x = -this.width;

        if (this.y < config.height * 0.4) {
            const heightIncrease = (config.height * 0.4 - this.y);
            gameState.cameraY += heightIncrease;
            this.y = config.height * 0.4;
            gameState.platforms.forEach(p => p.y += heightIncrease);
            gameState.score = Math.floor(gameState.cameraY / 10);
            if (gameState.score > gameState.maxHeight) gameState.maxHeight = gameState.score;
        }

        if (this.y > config.height + 100) endGame();
    }

    draw() {
        if (gameState.characterImage && gameState.characterImage.complete) {
            config.ctx.drawImage(gameState.characterImage, this.x - 15, this.y - 15, this.width + 30, this.height + 30);
        } else {
            config.ctx.fillStyle = '#66bb6a';
            config.ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    jump() { this.velocityY = config.jumpForce; this.isJumping = true; }
    moveLeft() { this.velocityX = -this.speed; }
    moveRight() { this.velocityX = this.speed; }
    stopMove() { this.velocityX = 0; }
}

// 足場クラス
class Platform {
    constructor(x, y, width = 80, type = 'normal') {
        this.x = x; this.y = y; this.width = width; this.height = 15; this.type = type;
    }

    draw() {
        config.ctx.fillStyle = this.type === 'boost' ? '#ffc107' : '#81c784';
        config.ctx.fillRect(this.x, this.y, this.width, this.height);
        if(this.type === 'boost') {
            config.ctx.fillStyle = 'white';
            config.ctx.font = '12px Arial';
            config.ctx.fillText('🚀', this.x + this.width/2 - 6, this.y - 5);
        }
    }

    checkCollision(player) {
        if (player.velocityY > 0 && 
            player.x + player.width > this.x && player.x < this.x + this.width &&
            player.y + player.height > this.y && player.y + player.height < this.y + this.height + 15) {
            return this.type;
        }
        return false;
    }
}

// 背景の初期化（パララックス）
function initBackgrounds() {
    backgrounds.clouds = [];
    for(let i=0; i<6; i++) {
        backgrounds.clouds.push({
            x: Math.random() * config.width,
            y: Math.random() * config.height,
            speed: 0.1 + Math.random() * 0.2,
            size: 40 + Math.random() * 40
        });
    }
}

// 背景の描画（パララックス）
function drawBackground() {
    const ctx = config.ctx;
    // 1. 空のグラデーション
    const grad = ctx.createLinearGradient(0, 0, 0, config.height);
    grad.addColorStop(0, '#4facfe');
    grad.addColorStop(1, '#87ceeb');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, config.width, config.height);

    // 2. 雲（横移動）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    backgrounds.clouds.forEach(c => {
        c.x += c.speed;
        if(c.x > config.width) c.x = -c.size * 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI*2);
        ctx.fill();
    });

    // 3. 山（視差効果：カメラ位置に合わせてゆっくり動く）
    ctx.fillStyle = '#5fb052';
    for(let i=-1; i<3; i++) {
        const offset = (gameState.cameraY * 0.2) % 400;
        ctx.beginPath();
        ctx.moveTo(i * 300 + 150 - offset, config.height);
        ctx.lineTo(i * 300 + 300 - offset, config.height - 150);
        ctx.lineTo(i * 300 + 450 - offset, config.height);
        ctx.fill();
    }
}

// ロゴ描画
function drawTitleLogo() {
    config.ctx.fillStyle = 'white';
    config.ctx.font = 'bold 60px sans-serif';
    config.ctx.textAlign = 'center';
    config.ctx.shadowBlur = 10;
    config.ctx.shadowColor = 'rgba(0,0,0,0.3)';
    config.ctx.fillText('🍉 さぼぴょん 🍉', config.width/2, config.height/3);
    config.ctx.shadowBlur = 0;
    if(gameState.characterImage.complete) {
        config.ctx.drawImage(gameState.characterImage, config.width/2-60, config.height/3+40, 120, 160);
    }
}

function generatePlatforms() {
    gameState.platforms = [new Platform(config.width/2-40, config.height-150, 80)];
    for (let i = 0; i < 25; i++) {
        const x = Math.random() * (config.width - 80);
        const y = config.height - 250 - (i * 100);
        const type = Math.random() < 0.2 ? 'boost' : 'normal';
        gameState.platforms.push(new Platform(x, y, 70 + Math.random()*30, type));
    }
}

function initGame() {
    config.canvas = document.getElementById('gameCanvas');
    config.ctx = config.canvas.getContext('2d');

    // スマホ時は画面比率に合わせて高さを拡張（30%以上広く）
    if (window.innerWidth <= 600) {
        const ratio = window.innerHeight / window.innerWidth;
        config.height = config.width * ratio;
    }
    config.canvas.width = config.width;
    config.canvas.height = config.height;

    initBackgrounds();
    gameState.characterImage = new Image();
    gameState.characterImage.src = 'https://www.genspark.ai/api/files/s/d8C1jqJd';
    gameState.characterImage.onload = () => { if(!gameState.isRunning) { drawBackground(); drawTitleLogo(); } };

    gameState.bgm = new Audio('audio/bgm.m4a');
    gameState.bgm.loop = true;
    loadHighScores();
    setupInput();

    document.getElementById('timeAttackButton').onclick = () => selectMode('timeAttack');
    document.getElementById('endlessButton').onclick = () => selectMode('endless');
    document.getElementById('startButton').onclick = startGame;
    document.getElementById('restartButton').onclick = restartGame;
}

function setupInput() {
    setupJoystick();
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') gameState.player.moveLeft();
        if (e.key === 'ArrowRight') gameState.player.moveRight();
    });
    document.addEventListener('keyup', () => gameState.player.stopMove());
}

function setupJoystick() {
    const joystick = document.getElementById('joystick');
    const knob = document.getElementById('joystickKnob');
    let isDragging = false;
    const maxDist = 24;

    const move = (e) => {
        if (!isDragging) return;
        const rect = joystick.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        let dx = touch.clientX - (rect.left + rect.width/2);
        let dy = touch.clientY - (rect.top + rect.height/2);
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > maxDist) { dx *= maxDist/dist; dy *= maxDist/dist; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        if (dx < -8) gameState.player.moveLeft();
        else if (dx > 8) gameState.player.moveRight();
        else gameState.player.stopMove();
    };

    joystick.onmousedown = joystick.ontouchstart = (e) => { isDragging = true; e.preventDefault(); };
    window.onmousemove = window.ontouchmove = move;
    window.onmouseup = window.ontouchend = () => { isDragging = false; knob.style.transform = 'translate(0,0)'; if(gameState.player) gameState.player.stopMove(); };
}

function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    gameState.isRunning = true;
    gameState.score = 0;
    gameState.maxHeight = 0;
    gameState.cameraY = 0;
    gameState.gameStartTime = Date.now();
    gameState.player = new Player();
    generatePlatforms();
    if (gameState.bgm) gameState.bgm.play().catch(()=>{});
    if (gameState.gameMode === 'timeAttack') startTimer();
    gameLoop();
}

function startTimer() {
    const itv = setInterval(() => {
        if (!gameState.isRunning) return clearInterval(itv);
        gameState.timeLeft = config.gameTime - Math.floor((Date.now() - gameState.gameStartTime)/1000);
        if (gameState.timeLeft <= 0) { gameState.timeLeft = 0; endGame(); }
        updateUI();
    }, 200);
}

function updateUI() {
    document.getElementById('score').textContent = gameState.maxHeight + 'm';
    document.getElementById('timer').textContent = gameState.timeLeft + '秒';
}

function gameLoop() {
    if (!gameState.isRunning) return;
    drawBackground();

    gameState.player.update();
    gameState.platforms.forEach(p => {
        const col = p.checkCollision(gameState.player);
        if (col) { gameState.player.velocityY = col === 'boost' ? config.jumpForce * 2 : config.jumpForce; }
    });

    if (gameState.platforms[gameState.platforms.length-1].y > -200) {
        const x = Math.random() * (config.width - 80);
        const y = gameState.platforms[gameState.platforms.length-1].y - 100;
        gameState.platforms.push(new Platform(x, y, 70+Math.random()*30, Math.random()<0.1?'boost':'normal'));
    }
    gameState.platforms = gameState.platforms.filter(p => p.y < config.height + 100);

    gameState.platforms.forEach(p => p.draw());
    gameState.player.draw();
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameState.isRunning = false;
    if (gameState.bgm) gameState.bgm.pause();
    const isNew = gameState.maxHeight > gameState.highScores[gameState.gameMode];
    if (isNew) { gameState.highScores[gameState.gameMode] = gameState.maxHeight; saveHighScores(); }
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'block';
    document.getElementById('finalScore').textContent = gameState.maxHeight + 'm';
    document.getElementById('highScoreCelebration').style.display = isNew ? 'block' : 'none';
}

function selectMode(m) { gameState.gameMode = m; document.getElementById('modeScreen').style.display = 'none'; document.getElementById('startScreen').style.display = 'block'; }
function restartGame() { location.reload(); }
function loadHighScores() { const s = localStorage.getItem('sabopyon_scores'); if(s) gameState.highScores = JSON.parse(s); }
function saveHighScores() { localStorage.setItem('sabopyon_scores', JSON.stringify(gameState.highScores)); }

window.addEventListener('load', initGame);
