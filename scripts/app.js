// @ts-check
/** @type {HTMLCanvasElement} */
// @ts-ignore
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;

/**
 * @param {number} pt
 */
function parabollicEasing(pt) {
	let x = pt * 4 - 2;
	let y = x * x * -1 + 4;
	return y / 4;
}

class KeyboardState {
	constructor() {
		this.isAccelerating = false;
		this.isBraking = false;
		this.registerEventHandlers();
	}

	registerEventHandlers() {
		window.addEventListener("keydown", (e) => {
			switch (e.key) {
				case "a":
				case "ArrowLeft":
					this.isBraking = true;
					break;
				case "d":
				case "ArrowRight":
					this.isAccelerating = true;
					break;
			}
		});

		window.addEventListener("keyup", (e) => {
			switch (e.key) {
				case "a":
				case "ArrowLeft":
					this.isBraking = false;
					break;
				case "d":
				case "ArrowRight":
					this.isAccelerating = false;
					break;
			}
		});
	}
}

class Player {
	/**
	 * @param {Array<SafePlatform>} [platforms]
	 */
	constructor(platforms) {
		this.platforms = platforms;
		this.maxBounceHeight = canvas.height / 2;
		this.yOfLastBounce = 0;
		this.x = canvas.width * 0.25;
		this.y = 0;
		this.bounceTime = 1000;
		this.timeSinceLastBounce = 0;
		this.radius = 16;
		this.color = 0;
		this.prevY = 0;
		this.leftSide = this.x - this.radius / 2;
		this.rightSide = this.x + this.radius / 2;
	}

	/**
	 * @param {number} elapsedTime
	 */
	update(elapsedTime) {
		this.timeSinceLastBounce += elapsedTime;
		const isMovingDown = this.timeSinceLastBounce > this.bounceTime / 2;
		this.color += 1;

		let ef = parabollicEasing(this.timeSinceLastBounce / this.bounceTime);
		this.y = this.yOfLastBounce - ef * this.maxBounceHeight;

		this.platforms.forEach((p) => {
			let isInside =
				this.rightSide >= p.x && this.leftSide <= p.x + p.width;
			let isPlatformBelowMe =
				isInside && (this.y < p.y || this.prevY < p.y);

			if (
				isMovingDown &&
				isPlatformBelowMe &&
				this.y + this.radius >= p.y
			) {
				this.timeSinceLastBounce = 0;
				this.yOfLastBounce = p.y;

				let event = new CustomEvent("bkb-bounce", { detail: p });
				document.dispatchEvent(event);
			}
		});

		this.prevY = this.y;
	}

	render() {
		ctx.save();
		ctx.fillStyle = `hsla(${this.color}, 100%, 50%, 1)`;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
		ctx.fill();
		ctx.restore();
	}
}

class Game {
	/**
	 * @param {KeyboardState} kb
	 */
	constructor(kb) {
		this.kb = kb;
		this.speed = 0;
		this.maxSpeed = 100;
		this.accelerationRate = 2;
		this.accelerationInterval = 100;
		this.timeSinceLastAcceleration = 0;
		this.score = 0;
		this.scoreX = 0;
		this.scoreY = 95;
		this.wireUpListeners();

		this.bgImage = new Image();
		this.bgImage.src = "/images/bubble.jpg";
		this.imageX = 0;
	}

	/**
	 * @param {number} elapsedTime
	 */
	update(elapsedTime) {
		this.timeSinceLastAcceleration += elapsedTime;

		if (
			this.kb.isAccelerating &&
			this.speed < this.maxSpeed &&
			this.timeSinceLastAcceleration >= this.accelerationInterval
		) {
			this.speed += this.accelerationRate;
			this.timeSinceLastAcceleration = 0;
		}

		if (this.kb.isBraking) {
			this.speed = 0;
			this.timeSinceLastAcceleration = 0;
		}

		if (
			!this.kb.isAccelerating &&
			!this.kb.isBraking &&
			this.timeSinceLastAcceleration >= this.accelerationInterval &&
			this.speed > 0
		) {
			this.speed -= this.accelerationRate;
			this.timeSinceLastAcceleration = 0;
		}
	}

	render() {
		ctx.save();
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = "hsla(120, 100%, 50%, 0.2)";
		ctx.drawImage(this.bgImage, 0, 0);
		ctx.restore();

		ctx.save();
		ctx.fillStyle = "black";
		ctx.strokeStyle = "white";
		ctx.font = "80px karma";
		ctx.fillText(`score-${this.score}`, this.scoreX, this.scoreY);
		ctx.strokeText(`score-${this.score}`, this.scoreX, this.scoreY);
		ctx.restore();
	}

	wireUpListeners() {
		document.addEventListener("bkb-bounce", (e) => {
			// @ts-ignore
			let p = e.detail;
			if (p.isScoreable && !p.isScored) {
				this.score++;
				p.isScored = true;
			}
			console.log(e.detail);
		});
	}
}

class Tracer {
	/**
	 * @param {Player} p
	 * @param {Game} g
	 */
	constructor(p, g) {
		this.p = p;
		this.g = g;
		this.color = 0;

		this.x = p.x;
		this.y = p.y;

		this.isVisible = true;
		this.opacity = 1;

		this.fadeRate = 0.1;
		this.fadeInterval = 100;
		this.timeSinceFade = 0;
	}

	/**
	 * @param {number} timeElapsed
	 */
	update(timeElapsed) {
		this.timeSinceFade += timeElapsed;
		this.x -= this.g.speed;
		this.color += 6;
		this.isVisible = this.x + this.width > 0 && this.x < canvas.width;

		if (this.timeSinceFade >= this.fadeInterval) {
			this.opacity -= this.fadeRate;
			this.timeSinceFade = 0;
		}

		this.isVisible = this.opacity > 0;
	}

	render() {
		ctx.save();

		ctx.fillStyle = `hsla(${this.color}, 100%, 50%, ${this.opacity})`;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.p.radius / 2, 0, Math.PI * 2, true);
		ctx.fill();

		ctx.restore();
	}
}

class SafePlatform {
	/**
	 * @param {Game} g
	 */
	constructor(g) {
		this.game = g;
		this.width = 400;
		this.height = 32;

		this.x = 0;
		this.y = canvas.height - this.height * 1.5;

		this.isVisible = true;
	}

	/**
	 * @param {number} elapsedTime
	 */
	update(elapsedTime) {
		this.x -= this.game.speed;
		this.isVisible = this.x + this.width > 0;
	}

	render() {
		ctx.save();
		ctx.fillStyle = "hsla(0, 0%, 20%, 3)";
		ctx.fillRect(this.x, this.y, this.width, this.height);
		ctx.restore();
	}
}

class ScorePlatform {
	/**
	 * @param {Game} g
	 */
	constructor(g) {
		this.game = g;
		this.width = 32;
		this.height = canvas.height;

		this.x = 0;
		this.y = canvas.height - 98;

		this.isVisible = true;
		this.isScored = false;
		this.isScoreable = true;
	}

	/**
	 * @param {number} elapsedTime
	 */
	update(elapsedTime) {
		this.x -= this.game.speed;
		this.isVisible = this.x + this.width > 0 && this.x < canvas.width;
	}

	render() {
		if (!this.isVisible) return;
		ctx.save();
		ctx.fillStyle = "hsla(120, 10%, 100%, 100)";
		ctx.fillRect(this.x, this.y, this.width, this.height);
		ctx.restore();
	}
}

class PlatformManager {
	constructor(platforms, game) {
		this.platforms = platforms;
		this.game = game;
	}

	update() {
		let lastPlatform = platforms[platforms.length - 1];
		let furthestX = lastPlatform.x + lastPlatform.width;

		while (furthestX < canvas.width * 2) {
			let spacer = Math.floor(Math.random() * 168 + 32);

			let nextPlatformType = Math.random();

			let p;

			if (nextPlatformType < 0.1) {
				p = new SafePlatform(this.game);
			} else {
				p = new ScorePlatform(this.game);
			}

			p.x = furthestX + spacer;
			this.platforms.push(p);
			furthestX += spacer + p.width;
		}
	}
}

let kb = new KeyboardState();
let game = new Game(kb);

// let p1 = new ScorePlatform(game);
// let p2 = new ScorePlatform(game);
// let p3 = new ScorePlatform(game);

// p1.x = 400 + 50;
// p2.x = p1.x + 100;
// p3.x = p2.x + 100;

let platforms = [new SafePlatform(game)];
let pm = new PlatformManager(platforms, game);
let player = new Player(platforms);
let tracers = [new Tracer(player, game)];

let currentTime = 0;

/**
 * @param {number} timestamp
 */
function gameLoop(timestamp) {
	let timeElapsed = timestamp - currentTime;
	currentTime = timestamp;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	tracers.push(new Tracer(player, game));

	pm.update();
	let gameObjects = [game, ...tracers, player, ...platforms];

	gameObjects.forEach((o) => {
		o.update(timeElapsed);
		o.render();
	});
	tracers = tracers.filter((t) => t.isVisible);

	requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
