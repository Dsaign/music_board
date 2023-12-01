const music_board = document.querySelector("#music_board"),
      board = music_board.getContext("2d"),
      strokeColor = "#546fdc";

let startTime = new Date().getTime();
let timeRotation = 0;

const colors = Array(50).fill(strokeColor);

let arcs = colors.map((color, index) => {
  return {
    color
  }
});

// form controls
const rg_volume = document.getElementById("rg_volume");
rg_volume.oninput = function() {
  document.querySelector("#sliders_container .volume span").innerHTML = this.value;
  setVolume(this.value);
}

// Audio URL
const audioUrl = 'https://raw.githubusercontent.com/Dsaign/music_board/main/assets/music.mp3';

let isPlaying = false;

// Contexto de audio
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const gainNode = audioContext.createGain();

// Analisador de audio
const analyser = audioContext.createAnalyser();
analyser.fftSize = 128; // Tamanho da FFT (Fast Fourier Transform)
// analyser.minDecibels = -100;
// analyser.maxDecibels = 0;

// analyser.connect(gainNode);
// gainNode.connect(audioContext.destination);

function setVolume(volume) {
  // Garante que o valor do volume esta entre 0 e 1
  let clampedVolume = parseFloat((volume/100).toFixed(2));
  // Define o valor do ganho para controlar o volume
  
  gainNode.gain.value = clampedVolume;
}

function getPeaks(data) {
  // What we're going to do here, is to divide up our audio into parts.
  // We will then identify, for each part, what the loudest sample is in that
  // part.
  // It's implied that that sample would represent the most likely 'beat'
  // within that part.
  // Each part is 0.5 seconds long - or 22,050 samples.
  // This will give us 60 'beats' - we will only take the loudest half of
  // those.
  // This will allow us to ignore breaks, and allow us to address tracks with
  // a BPM below 120.
  // taken from: https://github.com/JMPerez/beats-audio-api

  var partSize = 22050,
      parts = data[0].length / partSize,
      peaks = [];

  for (var i = 0; i < parts; i++) {
    var max = 0;
    for (var j = i * partSize; j < (i + 1) * partSize; j++) {
      var volume = Math.max(Math.abs(data[0][j]), Math.abs(data[1][j]));
      if (!max || (volume > max.volume)) {
        max = {
          position: j,
          volume: volume
        };
      }
    }
    peaks.push(max);
  }

  // We then sort the peaks according to volume...
  peaks.sort(function(a, b) {
    return b.volume - a.volume;
  });

  // ...take the loundest half of those...
  peaks = peaks.splice(0, peaks.length * 0.5);

  // ...and re-sort it back based on position.
  peaks.sort(function(a, b) {
    return a.position - b.position;
  });

  return peaks;
}

// Fonte de audio
let audioSource = audioContext.createBufferSource();
function connectNodes(buffer){
  audioSource.buffer = buffer;
  audioSource.connect(gainNode)
             .connect(analyser)
             .connect(audioContext.destination);
  audioSource.loop = true;
  setVolume(rg_volume.value);
}

// Obtendo o audio via Fetch
fetch(audioUrl)
  .then(response => response.arrayBuffer())
  .then(data => {
    // Decodificando o audio
    return audioContext.decodeAudioData(data);
  })
  .then(buffer => {
    // Conectando o buffer ao analisador
    connectNodes(buffer);
    // audioSource.connect(analyser);  
    // analyser.connect(audioContext.destination);
  
    setVolume(rg_volume.value); // 0 ~ 100

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
      x: offset * 4,
      y: (music_board.height * 4) / 2
    }

    const end = {
      x: (music_board.width * 4) - offset,
      y: (music_board.height * 4) / 2
    }

    const center = {
      x: music_board.width / 2,
      y: music_board.height / 2
    }

    const base = {
      length: end.x / 2 - start.x / 2,
      minAngle: 0,
      startAngle: 0,
      maxAngle: 2 * Math.PI
    }

    base.initialRadius = base.length * 0.02;
    base.circleRadius = base.length * 0.003;
    base.clearance = base.length * 0.05;
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
      
      radiusVariation = Math.abs((dataArray[index] / 255) - (index / 100));
      radius += radius * (radiusVariation / 4);
      
      // console.log(radiusVariation);
      
      timeRotation += 0.0002 + (dataArray[index] / 255 / 1000); //radiusVariation / 10000;
     
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
      connectNodes(buffer);
      audioSource.start(0);
      isPlaying = true;
    } else {
      if(audioSource.context.state == "running"){
        audioSource.stop();
        isPlaying = false;
      }
    }
  });
  document.body.appendChild(playButton);
}