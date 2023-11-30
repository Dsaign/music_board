
const music_board = document.querySelector("#music_board"),
      board = music_board.getContext("2d"),
      strokeColor = "#546fdc";

let startTime = new Date().getTime();

const colors = Array(21).fill(strokeColor);

let arcs = colors.map((color, index) => {
  return {
    color
  }
}); 

// audio nodes settings
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioAnalyser = audioContext.createAnalyser();

audioAnalyser.minDecibels = -90;
audioAnalyser.maxDecibels = -10;
audioAnalyser.smoothingTimeConstant = 0.85;

audioAnalyser.connect(audioContext.destination);

audioAnalyser.fftSize = 256; // 2048

const bufferLength = audioAnalyser.frequencyBinCount;
const audioDataArray = new Uint8Array(bufferLength);
let audio;
let drawVisual;

// connect audio

// const audio = new Audio('https://github.com/Dsaign/music_board/raw/main/assets/music.mp3');
// const track = audioContext.createMediaElementSource(audio);

// let audio,
let time = 0,
    trackConnected = false;

// async function fetchAudio() {
//   const response = await fetch('/audio');
//   const audio = await response.blob();

//   const audioURL = URL.createObjectURL(audio);
//   const audioElement = document.createElement('audio');

//   // audioElement.play();
// }

async function connectTrack(){
  try {
    const response = await fetch(
      'https://github.com/Dsaign/music_board/raw/main/assets/music.mp3'
    );
    
    const audioBlob = await response.blob();
    const audioURL = URL.createObjectURL(audioBlob);
    const audioElement = document.createElement('audio');

    audioElement.src = audioURL;
    audioElement.type = "audio/mp3";
    audioElement.muted = "true";

    document.getElementById('audio_box').appendChild(audioElement);

    const track = audioContext.createMediaElementSource(audioElement);
    console.log(audioURL);

    track.volume = 0.15;
    // const playSound = audioContext.createBufferSource();
    // track.buffer = audio;
    track.connect(audioContext.destination);
    trackConnected = true;
    console.log("connected");
    return track;
  } catch (error) {
    console.error(
      `Unable to fetch the audio file: ${error}`
    );
  }
}

// const audioElement = document.querySelector("audio");
// const track = audioContext.createMediaElementSource(audioElement);


// const gainNode = audioCtx.createGain();



// set live frequency
// ============ {
// function tickMusic(HEIGHT, WIDTH){
//   const drawBar = () => {
//     if(settings.soundEnabled){

//       // for (let i = 0; i < bufferLength; i++) {
//       //   const barHeight = audioDataArray[i];

//       //   console.log(HEIGHT - barHeight / 2);
//       //   console.log(barHeight / 2);
//       //   // canvasCtx.fillStyle = "rgb(" + (barHeight + 100) + ",50,50)";
//       //   // canvasCtx.fillRect(
//       //   //   x,
//       //   //   HEIGHT - barHeight / 2,
//       //   //   barWidth,
//       //   //   barHeight / 2
//       //   // );

//       //   // x += barWidth + 1;
//       // }
//     } else {
//       cancelAnimationFrame(drawBar);
//     }
//   }
//   drawBar();
// }
// ============ }

// const playKey = audio.play();

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

  if(!trackConnected){ audio = connectTrack(); }
  
  console.log(audio);

  if(enabled && audio){
    audio.play();
  } else {
    audio.pause();
    // cancelAnimationFrame(drawVisual);
  }
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

const draw = () => {

  music_board.width = music_board.clientWidth;
  music_board.height = music_board.clientHeight;

  // audio to visual
  audioAnalyser.getByteFrequencyData(audioDataArray);
  const barWidth = (music_board.width / bufferLength) * 2.5;

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

    const radius = base.initialRadius + (base.spacing * index);
    const offset = base.circleRadius * (5 / 3) / radius;

    // drawArc(center.x, center.y, arcRadius, 0, 2 * Math.PI);

    drawArc(center.x, center.y, radius, Math.PI + offset, (1.5 * Math.PI) - offset);
    drawArc(center.x, center.y, radius, offset, (Math.PI / 2) - offset);
    drawArc(center.x, center.y, radius, (1.5 * Math.PI) + offset, 0 - offset);
    drawArc(center.x, center.y, radius, (Math.PI / 2) + offset, Math.PI - offset);

    board.globalAlpha = determineOpacity(0, 0, 0.15, 0.85, 1000);

  });

  drawVisual = requestAnimationFrame(draw);

}

draw();