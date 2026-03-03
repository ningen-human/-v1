// ゲーム設定
const config = {
    canvas: null,
    ctx: null,
    width: 600,
    height: 600,
    gravity: 0.5,
    jumpForce: -18, // 1.5倍に強化（元: -12）
    gameTime: 60, // 1分間
    platformSpeed: 2,
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
    gameMode: 'timeAttack', // 'timeAttack' または 'endless'
    bgm: null,
    highScores: {
        timeAttack: 0,
        endless: 0
    }
};

// プレイヤークラス
class Player {
    constructor() {
        this.width = 90; // 1.5倍に拡大（元: 60）
        this.height = 120; // 1.5倍に拡大（元: 80）
        this.x = config.width / 2 - this.width / 2;
        this.y = config.height - 200;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 5;
        this.isJumping = false;
    }

    update() {
        // 重力を適用
        this.velocityY += config.gravity;
        this.y += this.velocityY;

        // 左右の移動
        this.x += this.velocityX;

        // 画面端の処理（反対側から出る）
        if (this.x + this.width < 0) {
            this.x = config.width;
        } else if (this.x > config.width) {
            this.x = -this.width;
        }

        // 上に上がったらスコア更新
        if (this.y < config.height / 2) {
            const heightIncrease = (config.height / 2 - this.y) / 10;
            gameState.cameraY += heightIncrease;
            this.y = config.height / 2;
            
            // プラットフォームを下に移動
            gameState.platforms.forEach(platform => {
                platform.y += heightIncrease;
            });

            // 新しいスコアを更新
            gameState.score = Math.floor(gameState.cameraY / 10);
            if (gameState.score > gameState.maxHeight) {
                gameState.maxHeight = gameState.score;
            }
        }

        // 画面下に落ちたらゲームオーバー
        if (this.y > config.height + 100) {
            endGame();
        }
    }

    draw() {
        if (gameState.characterImage && gameState.characterImage.complete) {
            config.ctx.save();
            // キャラクターを描画
            config.ctx.drawImage(
                gameState.characterImage,
                this.x - 15,
                this.y - 15,
                this.width + 30,
                this.height + 30
            );
            config.ctx.restore();
        } else {
            // 画像が読み込まれていない場合の代替表示
            config.ctx.fillStyle = '#66bb6a';
            config.ctx.fillRect(this.x, this.y, this.width, this.height);
            config.ctx.fillStyle = 'white';
            config.ctx.font = '40px Arial';
            config.ctx.textAlign = 'center';
            config.ctx.fillText('🌵', this.x + this.width / 2, this.y + this.height / 2);
        }
    }

    jump() {
        if (!this.isJumping) {
            this.velocityY = config.jumpForce;
            this.isJumping = true;
        }
    }

    moveLeft() {
        this.velocityX = -this.speed;
    }

    moveRight() {
        this.velocityX = this.speed;
    }

    stopMove() {
        this.velocityX = 0;
    }
}

// プラットフォームクラス
class Platform {
    constructor(x, y, width = 80, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = 15;
        this.type = type; // 'normal' または 'boost' (2倍ジャンプ)
    }

    draw() {
        if (this.type === 'boost') {
            // 2倍ジャンププラットフォーム（黄色）
            config.ctx.fillStyle = '#ffc107';
            config.ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // 影
            config.ctx.fillStyle = '#ff9800';
            config.ctx.fillRect(this.x, this.y + this.height - 3, this.width, 3);
            
            // ロケットアイコン
            config.ctx.font = '12px Arial';
            config.ctx.fillText('🚀', this.x + this.width / 2 - 6, this.y - 5);
        } else {
            // 通常プラットフォーム（緑色）
            config.ctx.fillStyle = '#81c784';
            config.ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // 影を追加
            config.ctx.fillStyle = '#66bb6a';
            config.ctx.fillRect(this.x, this.y + this.height - 3, this.width, 3);
        }
    }

    checkCollision(player) {
        if (player.velocityY > 0 && // 下に移動中
            player.x + player.width > this.x &&
            player.x < this.x + this.width &&
            player.y + player.height > this.y &&
            player.y + player.height < this.y + this.height + 10) {
            return this.type; // タイプを返す
        }
        return false;
    }
}

// プラットフォームを生成
function generatePlatforms() {
    gameState.platforms = [];
    
    // 初期プラットフォーム（スタート位置）
    gameState.platforms.push(new Platform(config.width / 2 - 40, config.height - 100, 80));
    
    // ランダムにプラットフォームを配置
    for (let i = 0; i < 15; i++) {
        const x = Math.random() * (config.width - 80);
        const y = config.height - 200 - (i * 80);
        const width = 60 + Math.random() * 40;
        // 20%の確率で2倍ジャンプ台を配置
        const type = Math.random() < 0.2 ? 'boost' : 'normal';
        gameState.platforms.push(new Platform(x, y, width, type));
    }
}

// ゲーム初期化
function initGame() {
    // Canvasの設定
    config.canvas = document.getElementById('gameCanvas');
    config.ctx = config.canvas.getContext('2d');
    
    // Canvas サイズを設定
    config.canvas.width = config.width;
    config.canvas.height = config.height;

    // キャラクター画像を読み込み
    gameState.characterImage = new Image();
    gameState.characterImage.crossOrigin = "anonymous";
    gameState.characterImage.src = 'https://www.genspark.ai/api/files/s/d8C1jqJd';

    // BGMを読み込み
    gameState.bgm = new Audio('audio/bgm.m4a');
    gameState.bgm.loop = true;
    gameState.bgm.volume = 0.5;

    // ローカルストレージからハイスコアを読み込み
    loadHighScores();

    // プレイヤーを作成
    gameState.player = new Player();
    
    // プラットフォームを生成
    generatePlatforms();

    // 入力処理
    setupInput();

    // モード選択ボタン（スマホ対応：touchendとclickの両方に対応）
    const timeAttackBtn = document.getElementById('timeAttackButton');
    const endlessBtn = document.getElementById('endlessButton');
    const startBtn = document.getElementById('startButton');
    const restartBtn = document.getElementById('restartButton');
    
    // タッチデバイス対応のイベント設定
    addTouchAndClickEvent(timeAttackBtn, () => selectMode('timeAttack'));
    addTouchAndClickEvent(endlessBtn, () => selectMode('endless'));
    addTouchAndClickEvent(startBtn, startGame);
    addTouchAndClickEvent(restartBtn, restartGame);
}

// ハイスコアの読み込み
function loadHighScores() {
    const saved = localStorage.getItem('sabopyon_highscores');
    if (saved) {
        gameState.highScores = JSON.parse(saved);
    }
}

// ハイスコアの保存
function saveHighScores() {
    localStorage.setItem('sabopyon_highscores', JSON.stringify(gameState.highScores));
}

// タッチとクリックの両方に対応するイベント設定
function addTouchAndClickEvent(element, callback) {
    let touchStarted = false;
    let touchMoved = false;
    
    // タッチ開始
    element.addEventListener('touchstart', (e) => {
        touchStarted = true;
        touchMoved = false;
        e.preventDefault();
    }, { passive: false });
    
    // タッチ移動（フリック検出）
    element.addEventListener('touchmove', (e) => {
        if (touchStarted) {
            touchMoved = true;
        }
    });
    
    // タッチ終了
    element.addEventListener('touchend', (e) => {
        if (touchStarted) {
            e.preventDefault();
            // タップまたは小さいフリックの場合に実行
            if (!touchMoved || touchMoved) {
                callback();
            }
            touchStarted = false;
            touchMoved = false;
        }
    }, { passive: false });
    
    // 通常のクリック（PC用）
    element.addEventListener('click', (e) => {
        // タッチイベントと重複しないように
        if (!touchStarted) {
            callback();
        }
    });
}

// モード選択
function selectMode(mode) {
    gameState.gameMode = mode;
    
    // 画面切り替え
    document.getElementById('modeScreen').style.display = 'none';
    document.getElementById('startScreen').style.display = 'block';
    
    // モードに応じて表示を変更
    if (mode === 'timeAttack') {
        document.getElementById('startTitle').innerHTML = '1分間でどこまで高く<br>登れるかな？';
        document.getElementById('timeLimitText').textContent = '• 制限時間は1分間';
    } else {
        document.getElementById('startTitle').innerHTML = '時間無制限！<br>どこまでも高く登ろう！';
        document.getElementById('timeLimitText').textContent = '• 時間無制限！落下するまで挑戦！';
    }
}

// 入力設定
function setupInput() {
    // ジョイスティック
    setupJoystick();

    // キーボード操作（デスクトップ用）
    document.addEventListener('keydown', (e) => {
        if (!gameState.isRunning) return;
        
        if (e.key === ' ' || e.key === 'ArrowUp') {
            e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
            gameState.player.moveLeft();
        } else if (e.key === 'ArrowRight') {
            gameState.player.moveRight();
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            gameState.player.stopMove();
        }
    });
}

// ジョイスティック設定
function setupJoystick() {
    const joystick = document.getElementById('joystick');
    const knob = document.getElementById('joystickKnob');
    const maxDistance = 30; // ジョイスティックの最大移動距離
    let startX = 0, startY = 0;
    let isDragging = false;

    function handleStart(e) {
        e.preventDefault();
        isDragging = true;
        const rect = joystick.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
        gameState.joystickActive = true;
    }

    function handleMove(e) {
        if (!isDragging || !gameState.isRunning) return;
        e.preventDefault();
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        let deltaX = clientX - startX;
        let deltaY = clientY - startY;
        
        // 距離を制限
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > maxDistance) {
            deltaX = (deltaX / distance) * maxDistance;
            deltaY = (deltaY / distance) * maxDistance;
        }
        
        // ノブの位置を更新
        knob.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        
        // プレイヤーの移動
        const normalizedX = deltaX / maxDistance;
        gameState.joystickDirection.x = normalizedX;
        
        if (normalizedX < -0.3) {
            gameState.player.moveLeft();
        } else if (normalizedX > 0.3) {
            gameState.player.moveRight();
        } else {
            gameState.player.stopMove();
        }
    }

    function handleEnd(e) {
        e.preventDefault();
        isDragging = false;
        gameState.joystickActive = false;
        gameState.joystickDirection = { x: 0, y: 0 };
        knob.style.transform = 'translate(0, 0)';
        gameState.player.stopMove();
    }

    // タッチイベント
    joystick.addEventListener('touchstart', handleStart);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
    
    // マウスイベント
    joystick.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
}

// ゲーム開始
function startGame() {
    // 画面切り替え
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    
    // ゲーム状態をリセット
    gameState.isRunning = true;
    gameState.score = 0;
    gameState.maxHeight = 0;
    gameState.timeLeft = config.gameTime;
    gameState.cameraY = 0;
    gameState.gameStartTime = Date.now();
    
    // プレイヤーとプラットフォームをリセット
    gameState.player = new Player();
    generatePlatforms();
    
    // BGM再生
    if (gameState.bgm) {
        gameState.bgm.currentTime = 0;
        gameState.bgm.play().catch(e => console.log('BGM再生エラー:', e));
    }
    
    // タイマー開始（タイムアタックモードのみ）
    if (gameState.gameMode === 'timeAttack') {
        document.getElementById('timer').parentElement.style.display = 'flex';
        startTimer();
    } else {
        document.getElementById('timer').parentElement.style.display = 'none';
    }
    
    // ゲームループ開始
    gameLoop();
}

// タイマー
function startTimer() {
    const timerInterval = setInterval(() => {
        if (!gameState.isRunning) {
            clearInterval(timerInterval);
            return;
        }

        const elapsed = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
        gameState.timeLeft = config.gameTime - elapsed;

        if (gameState.timeLeft <= 0) {
            gameState.timeLeft = 0;
            clearInterval(timerInterval);
            endGame();
        }

        updateUI();
    }, 100);
}

// UI更新
function updateUI() {
    document.getElementById('score').textContent = gameState.maxHeight + 'm';
    document.getElementById('timer').textContent = gameState.timeLeft + '秒';
}

// ゲームループ
function gameLoop() {
    if (!gameState.isRunning) return;

    // 画面クリア
    config.ctx.clearRect(0, 0, config.width, config.height);
    
    // 背景描画（空のグラデーション）
    const gradient = config.ctx.createLinearGradient(0, 0, 0, config.height);
    gradient.addColorStop(0, '#87ceeb');
    gradient.addColorStop(1, '#e0f7ff');
    config.ctx.fillStyle = gradient;
    config.ctx.fillRect(0, 0, config.width, config.height);

    // プレイヤー更新
    gameState.player.update();

    // プラットフォームとの衝突判定
    gameState.platforms.forEach(platform => {
        const collisionType = platform.checkCollision(gameState.player);
        if (collisionType) {
            if (collisionType === 'boost') {
                // 2倍ジャンプ
                gameState.player.velocityY = config.jumpForce * 2;
            } else {
                // 通常ジャンプ
                gameState.player.velocityY = config.jumpForce;
            }
            gameState.player.isJumping = true;
        }
    });

    // 新しいプラットフォームを生成
    if (gameState.platforms[gameState.platforms.length - 1].y > 0) {
        for (let i = 0; i < 3; i++) {
            const x = Math.random() * (config.width - 80);
            const y = gameState.platforms[gameState.platforms.length - 1].y - 80 - Math.random() * 40;
            const width = 60 + Math.random() * 40;
            // 20%の確率で2倍ジャンプ台を配置
            const type = Math.random() < 0.2 ? 'boost' : 'normal';
            gameState.platforms.push(new Platform(x, y, width, type));
        }
    }

    // 画面外のプラットフォームを削除
    gameState.platforms = gameState.platforms.filter(platform => platform.y < config.height + 100);

    // プラットフォーム描画
    gameState.platforms.forEach(platform => platform.draw());

    // プレイヤー描画
    gameState.player.draw();

    // スコア更新
    updateUI();

    // 次のフレーム
    requestAnimationFrame(gameLoop);
}

// ゲーム終了
function endGame() {
    gameState.isRunning = false;
    
    // BGM停止
    if (gameState.bgm) {
        gameState.bgm.pause();
    }
    
    // ハイスコアチェック
    const currentHighScore = gameState.highScores[gameState.gameMode];
    const isNewHighScore = gameState.maxHeight > currentHighScore;
    
    if (isNewHighScore) {
        gameState.highScores[gameState.gameMode] = gameState.maxHeight;
        saveHighScores();
    }
    
    // 結果を表示
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'block';
    document.getElementById('finalScore').textContent = gameState.maxHeight + 'm';
    
    // ハイスコア表示
    const modeText = gameState.gameMode === 'timeAttack' ? '1分タイムアタック' : 'エンドレス';
    document.getElementById('highScoreDisplay').textContent = 
        `${modeText} ハイスコア: ${gameState.highScores[gameState.gameMode]}m`;
    
    // ハイスコア更新時の特別表示
    if (isNewHighScore && gameState.maxHeight > 0) {
        document.getElementById('highScoreCelebration').style.display = 'block';
        document.getElementById('normalResultTitle').style.display = 'none';
    } else {
        document.getElementById('highScoreCelebration').style.display = 'none';
        document.getElementById('normalResultTitle').style.display = 'block';
    }
    
    // メッセージを表示
    const message = getResultMessage(gameState.maxHeight);
    document.getElementById('resultMessage').textContent = message;
}

// 結果メッセージ
function getResultMessage(score) {
    if (score < 50) {
        return '🌱 いいスタートです！次はもっと高く登れるよ！';
    } else if (score < 100) {
        return '🌿 すごい！サボてんちゃんも喜んでます！';
    } else if (score < 200) {
        return '🌵 すばらしい！とても上手ですね！';
    } else if (score < 300) {
        return '🌟 驚異的！ジャンプの達人ですね！';
    } else {
        return '👑 伝説級！サボてんちゃんマスター認定！';
    }
}

// リスタート
function restartGame() {
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('modeScreen').style.display = 'block';
}

// ページ読み込み時に初期化
window.addEventListener('load', initGame);
