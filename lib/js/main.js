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

let audioContext = new AudioContext();

let audio = new Audio('https://github.com/Dsaign/music_board/raw/main/assets/music.mp3');

const track = audioContext.createMediaElementSource(audio);
track.connect(audioContext.destination);

const audioAnalyser = audioContext.createAnalyser();
audioAnalyser.fftSize = 2048;

const bufferLength = audioAnalyser.frequencyBinCount;
const freqDomain = new Uint8Array(bufferLength);
const timeDomain = new Uint8Array(bufferLength);
audioAnalyser.getByteFrequencyData(freqDomain);
audioAnalyser.getByteTimeDomainData(timeDomain);

track.connect(audioAnalyser);

audio.volume = 0.15;
var time = 0;

let trackConnected = false;

function connectTrack(){
  
//   track.connect(audioContext.destination);

//   audioAnalyser.fftSize = 2048;
  
//   audioAnalyser.getByteFrequencyData(freqDomain);
//   audioAnalyser.getByteTimeDomainData(timeDomain);

//   track.connect(audioAnalyser);
 
  trackConnected = true;
}

function tickMusic(){
  time++;
  
  // audio
  audioAnalyser.getByteFrequencyData(freqDomain);
  audioAnalyser.getByteTimeDomainData(timeDomain);
  
  let freqAvg = 0.0;
  let timeAvg = 0.0;
  
  for(var i = 0; i < audioAnalyser.frequencyBinCount; i++){
    freqAvg += freqDomain[i];
    timeAvg += timeDomain[i];
  }
  freqAvg /= (freqDomain.length * 256.0);
  timeAvg /= (timeDomain.length * 256.0);
  
}

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
  
  if(!trackConnected){ connectTrack(); }
  
  enabled ? audio.play() : audio.pause();
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
  
  if(settings.soundEnabled){ tickMusic() }

  music_board.width = music_board.clientWidth;
  music_board.height = music_board.clientHeight;

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

  requestAnimationFrame(draw);

}

draw();