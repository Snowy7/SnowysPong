module.exports = {
  createGameState,
  gameLoop,
  handleMovement,
  initGame,
};

const canvas = {
  width: 800,
  height: 600,
};

function initGame() {
  const state = createGameState();
  return state;
}

function createGameState() {
  return {
    players: [
      {
        x: 10, // left side of canvas
        y: (canvas.height - 100) / 2, // -100 the height of paddle
        width: 10,
        height: 100,
        score: 0,
        velocity: 8,
        isright: 0,
      },
      {
        x: canvas.width - 20, // right side of canvas
        y: (canvas.height - 100) / 2, // -100 the height of paddle
        width: 10,
        height: 100,
        score: 0,
        velocity: 8,
        isright: 1,
      },
    ],

    ball: {
      x: canvas.width / 2,
      y: canvas.height / 2,
      radius: 10,
      velocityX: 5,
      velocityY: 5,
      speed: 7,
    },
  };
}

function gameLoop(state) {
  if (!state) {
    return;
  }

  const { ball } = state;
  const playerOne = state.players[0];
  const playerTwo = state.players[1];

  if (ball.x - ball.radius < 0) {
    resetBall(ball);
    playerTwo.score++;
  } else if (ball.x + ball.radius > canvas.width) {
    resetBall(ball);
    playerOne.score++;
  }

  if (playerOne.score > 10) {
    return 1;
  }

  if (playerTwo.score > 10) {
    return 2;
  }

  ball.x += ball.velocityX;
  ball.y += ball.velocityY;

  if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
    ball.velocityY = -ball.velocityY;
  }

  const player =
    ball.x + ball.radius < canvas.width / 2 ? playerOne : playerTwo;

  if (collision(ball, player)) {
    // we check where the ball hits the paddle
    let collidePoint = ball.y - (player.y + player.height / 2);
    // normalize the value of collidePoint, we need to get numbers between -1 and 1.
    // -player.height/2 < collide Point < player.height/2
    collidePoint = collidePoint / (player.height / 2);

    // when the ball hits the top of a paddle we want the ball, to take a -45degees angle
    // when the ball hits the center of the paddle we want the ball to take a 0degrees angle
    // when the ball hits the bottom of the paddle we want the ball to take a 45degrees
    // Math.PI/4 = 45degrees
    let angleRad = (Math.PI / 4) * collidePoint;

    // change the X and Y velocity direction
    const direction = ball.x + ball.radius < canvas.width / 2 ? 1 : -1;
    ball.velocityX = direction * ball.speed * Math.cos(angleRad);
    ball.velocityY = ball.speed * Math.sin(angleRad);

    // speed up the ball everytime a paddle hits it.
    ball.speed += 0.1;
  }

  return false;
}

function resetBall(ball) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.velocityX = -ball.velocityX;
  ball.speed = 7;
}

function collision(b, p) {
  const player = { ...p };
  const ball = { ...b };

  player.top = player.y;
  player.bottom = player.y + player.height;
  player.left = player.x;
  player.right = player.x + player.width;

  ball.top = ball.y - ball.radius;
  ball.bottom = ball.y + ball.radius;
  ball.left = ball.x - ball.radius;
  ball.right = ball.x + ball.radius;

  return (
    player.left < ball.right && player.top < ball.bottom && player.right > ball.left && player.bottom > ball.top
  );
}

function handleMovement(data, state, client, clientRooms) {
  const roomName = clientRooms[client.id];

  if (!roomName) {
    return;
  }
 
  if (!data) {
    return;
  }
  if (data.up) {
    if (state[roomName].players[client.number - 1] < 0) {
      return;
    }
    state[roomName].players[client.number - 1].y -= 5;
  }

  if (data.down) {
    if (
      state[roomName].players[client.number - 1].y +
      state[roomName].players[client.number - 1].height >
      canvas.height
    ) {
      return;
    }
    state[roomName].players[client.number - 1].y += 5;
  }
}
