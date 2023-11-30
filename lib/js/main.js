const music_board = document.querySelector("#music_board"),
      board = music_board.getContext("2d"),
      strokeColor = "#546fdc";

let startTime = new Date().getTime();

const colors = Array(25).fill(strokeColor);

let arcs = colors.map((color, index) => {
  return {
    color
  }
});

// Audio URL
const audioUrl = 'https://raw.githubusercontent.com/Dsaign/music_board/main/assets/music.mp3';
// Contexto de audio
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let isPlaying = false;

// Analisador de audio
const analyser = audioContext.createAnalyser();
analyser.fftSize = 64; // Tamanho da FFT (Fast Fourier Transform)

// Fonte de audio
let audioSource = audioContext.createBufferSource();

// Obtendo o audio via Fetch
fetch(audioUrl)
  .then(response => response.arrayBuffer())
  .then(data => {
    // Decodificando o audio
    return audioContext.decodeAudioData(data);
  })
  .then(buffer => {
    // Conectando o buffer ao analisador
    audioSource.buffer = buffer;
    audioSource.connect(analyser);
    analyser.connect(audioContext.destination);

    // botao de toggle
    createButtons(buffer);

    // Criando o grafico
    createVisual(analyser);
  })
  .catch(error => console.error('Erro ao carregar o áudio:', error));

const get = selector => document.querySelector(selector);

const toggles = {
  sound: get("#sound-toggle")
}

const settings = {
  soundEnabled: false, // User still must interact with screen first
  pulseEnabled: true // Pulse will only show if sound is enabled as well
}

const handleSoundToggle = (enabled = !settings.soundEnabled) => {
  settings.soundEnabled = enabled;
  toggles.sound.dataset.toggled = enabled;
  isPlaying = !enabled;
  document.getElementById("toggle_btn").click();
}

document.onvisibilitychange = () => handleSoundToggle(false);

music_board.onclick = () => handleSoundToggle();
music_board.ontouchend = () => handleSoundToggle();

const calculateDynamicOpacity = (currentTime, lastImpactTime, baseOpacity, maxOpacity, duration) => {
  const timeSinceImpact = currentTime - lastImpactTime,
        percentage = Math.min(timeSinceImpact / duration, 1),
        opacityDelta = maxOpacity - baseOpacity;

  return maxOpacity - (opacityDelta * percentage);
}

const determineOpacity = (currentTime, lastImpactTime, baseOpacity, maxOpacity, duration) => {
  if (!settings.pulseEnabled) return baseOpacity;
  return calculateDynamicOpacity(currentTime, lastImpactTime, baseOpacity, maxOpacity, duration);
}

const drawArc = (x, y, radius, start, end, action = "stroke") => {
  board.beginPath();
  board.arc(x, y, radius, start, end);
  if (action === "stroke") board.stroke();
  else board.fill();
}

function createVisual(analyser){

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const draw = () => {

    analyser.getByteFrequencyData(dataArray);

    music_board.width = music_board.clientWidth;
    music_board.height = music_board.clientHeight;

    let x = 0;
    const currentTime = new Date().getTime(),
          elapsedTime = (currentTime - settings.startTime) / 1000;

    const length = Math.min(music_board.width, music_board.height) * 0.9,
          offset = (music_board.width - length) / 2;

    const start = {
      x: offset,
      y: music_board.height / 2
    }

    const end = {
      x: music_board.width - offset,
      y: music_board.height / 2
    }

    const center = {
      x: music_board.width / 2,
      y: music_board.height / 2
    }

    const base = {
      length: end.x - start.x,
      minAngle: 0,
      startAngle: 0,
      maxAngle: 2 * Math.PI
    }

    base.initialRadius = base.length * 0.05;
    base.circleRadius = base.length * 0.006;
    base.clearance = base.length * 0.03;
    base.spacing = (base.length - base.initialRadius - base.clearance) / 2 / colors.length;

    // properties of board
    board.strokeStyle = strokeColor;
    board.lineWidth = 2;

    // draw horizontal line
    // board.beginPath();
    // board.moveTo(start.x, start.y);
    // board.lineTo(end.x, end.y);
    // board.stroke();

    // Draw Arcs
    arcs.forEach((arc, index) => {

      let radius = base.initialRadius + (base.spacing * index);
      const offset = base.circleRadius * (5 / 3) / radius;
      let radiusVariation;
      
      radiusVariation = dataArray[index] / 255;
      radius += radius * (radiusVariation / 4);
      
      // console.log(radiusVariation);
      
      drawArc(center.x, center.y, radius, Math.PI + offset, (1.5 * Math.PI) - offset);
      drawArc(center.x, center.y, radius, offset, (Math.PI / 2) - offset);
      drawArc(center.x, center.y, radius, (1.5 * Math.PI) + offset, 0 - offset);
      drawArc(center.x, center.y, radius, (Math.PI / 2) + offset, Math.PI - offset);

      board.globalAlpha = radiusVariation;

    });

    requestAnimationFrame(draw);
  }
  draw();
}

function createButtons(buffer) {
  const playButton = document.createElement('button');
  playButton.textContent = 'Play';
  playButton.id = "toggle_btn";
  playButton.classList.add("hidden");
  playButton.addEventListener('click', () => {
    if (!isPlaying) {
      audioSource = audioContext.createBufferSource();
      audioSource.buffer = buffer;
      audioSource.connect(analyser);
      analyser.connect(audioContext.destination);
      audioSource.start(0);
      isPlaying = true;
      playButton.textContent = 'Stop';
    } else {
      if(audioSource.context.state == "running"){
        audioSource.stop();
        isPlaying = false;
        playButton.textContent = 'Play';
      }
    }
  });
  document.body.appendChild(playButton);
}