const music_board = document.querySelector("#music_board"),
  board = music_board.getContext("2d"),
  strokeColor = "#314284";

// ANIMATED BACKGROUND
// const mouseScale = 0.25;
// music_board.addEventListener("mousemove", e => {
//   const x = e.offsetX / music_board.clientWidth * 100 - 50;
//   const y = e.offsetY / music_board.clientHeight * 100 - 50;
//   music_board.style.setProperty("--mouseX", `${(x * mouseScale).toFixed(3)}%`);
//   music_board.style.setProperty("--mouseY", `${(y * mouseScale).toFixed(3)}%`);
// });

function asymmetricGaussian(x, peak, sigma, amplitude, asymmetryFactor) {
  const gauss = amplitude * Math.exp(-Math.pow(x - peak, 2) / (2 * sigma * sigma));
  // Aumenta os valores após o pico
  const asymmetry = 1 + asymmetryFactor * (x >= peak ? 1 : 0);
  return gauss * asymmetry;
}

let startTime = new Date().getTime();
let timeRotation = 0;
let wavePosition = 0; // Controla a posição da onda

const colors = Array(50).fill(strokeColor); 

let arcs = colors.map((color, index) => {
  return {
    color
  }
});

// form controls
const rg_volume = document.getElementById("rg_volume");
rg_volume.oninput = function () {
  document.querySelector("#sliders_container .volume span").innerHTML = this.value;
  setVolume(this.value);
}

// Audio URL
const audioUrl = 'https://raw.githubusercontent.com/Dsaign/music_board/main/assets/music.mp3';

let isPlaying = false;
let audioLoaded = false; // Flag para verificar se o áudio foi carregado

// Contexto de audio
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const gainNode = audioContext.createGain();

// Analisador de audio
const analyser = audioContext.createAnalyser();
analyser.fftSize = 128;

function setVolume(volume) {
  // Garante que o valor do volume esta entre 0 e 1
  let clampedVolume = parseFloat((volume / 100).toFixed(2));
  // Define o valor do ganho para controlar o volume
  gainNode.gain.value = clampedVolume;
}

function getPeaks(data) {
  // Função mantida do código original
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

  peaks.sort(function (a, b) {
    return b.volume - a.volume;
  });

  peaks = peaks.splice(0, peaks.length * 0.5);

  peaks.sort(function (a, b) {
    return a.position - b.position;
  });

  return peaks;
}

// Fonte de audio
let audioSource = audioContext.createBufferSource();
let audioBuffer = null;

function connectNodes(buffer) {
  audioSource.buffer = buffer;
  audioSource.connect(gainNode)
    .connect(analyser)
    .connect(audioContext.destination);
  audioSource.loop = true;
  setVolume(rg_volume.value);
}

// Função para permitir upload de música pelo usuário
function setupFileUpload() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'audio/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  // Botão visível para upload
  // const uploadButton = document.createElement('button');
  // uploadButton.textContent = 'Upload Música';
  // uploadButton.className = 'upload-btn';
  // uploadButton.addEventListener('click', () => fileInput.click());
  // document.body.appendChild(uploadButton);

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const arrayBuffer = event.target.result;
        audioContext.decodeAudioData(arrayBuffer)
          .then(buffer => {
            audioBuffer = buffer;
            audioLoaded = true;
            // Parar a animação de respiração e iniciar a visualização de áudio
            if (isPlaying) {
              audioSource.stop();
            }
            audioSource = audioContext.createBufferSource();
            connectNodes(buffer);
            audioSource.start(0);
            isPlaying = true;
          })
          .catch(err => console.error('Erro ao decodificar o áudio:', err));
      };
      reader.readAsArrayBuffer(file);
    }
  });
}

// Obtendo o audio via Fetch para exemplo inicial
window.onload = () => {
  fetch(audioUrl)
    .then(response => response.arrayBuffer())
    .then(data => {
      return audioContext.decodeAudioData(data);
    })
    .then(buffer => {
      audioBuffer = buffer;
      audioLoaded = true;
      connectNodes(buffer);
      setVolume(rg_volume.value);
  
      // Botão de toggle
      createButtons(buffer);
  
      // Criando o setup para upload de arquivo
      setupFileUpload();
  
      // Iniciar com a animação de respiração
      createVisual(analyser);
    })
    .catch(error => {
      console.error('Erro ao carregar o áudio:', error);
      // Mesmo sem áudio, iniciar a animação de respiração
      createVisual(analyser);
      setupFileUpload();
    });
};

const get = selector => document.querySelector(selector);

const toggles = {
  sound: get("#sound-toggle")
};

const settings = {
  soundEnabled: false,
  pulseEnabled: true,
  startTime: new Date().getTime()
};

const handleSoundToggle = (enabled = !settings.soundEnabled) => {
  settings.soundEnabled = enabled;
  if (toggles.sound) toggles.sound.dataset.toggled = enabled;

  if (audioLoaded) {
    isPlaying = !enabled;
    document.getElementById("toggle_btn").click();
  }
};

// document.onvisibilitychange = () => handleSoundToggle(false);

let fadeOpacity = 0; // Começa invisível
const fadeDuration = 3000; // Tempo do fade-in em milissegundos
let fadeStartTime = null;

const drawArc = (x, y, radius, start, end, lineWidth, opacity, action = "stroke") => {
  board.beginPath();
  board.arc(x, y, radius, start, end);
  board.globalAlpha = opacity;
  board.lineWidth = lineWidth;
  if (action === "stroke") board.stroke();
  else board.fill();
};

function createVisual(analyser) {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  // Configurações da onda
  const totalWaveWidth = 20; // Largura da onda em índices de arco
  const maxLineWidth = 5; // Espessura máxima da linha

  // Variáveis para controle do ease-in-out
  let animationProgress = 0;
  let animationTime = 0;
  const animationDuration = 5000; // Duração total da animação em ms
  let lastTime = performance.now();
  let wavePosition = -totalWaveWidth;

  const waveProfile = (distanceFromCenter) => {
    // Converte a distância para um valor entre 0 e 1
    const normalizedDistance = Math.abs(distanceFromCenter) / (totalWaveWidth / 2);

    if (normalizedDistance >= 1) return 0; // Fora da onda

    return Math.pow(1 - normalizedDistance, 2);
    // return normalizedDistance < 0.5 ? 1 : 2 * (1 - normalizedDistance);
    // return Math.exp(-(normalizedDistance * normalizedDistance) * 4);
  };

  const draw = (currentTime) => {
    
    // Calcular o delta de tempo
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Limpar o canvas
    music_board.width = music_board.clientWidth;
    music_board.height = music_board.clientHeight;

    // Configurações de dimensão
    const length = Math.min(music_board.width, music_board.height) * 2.5,
      offset = (music_board.width - length) / 2;

    const center = {
      x: music_board.width / 2,
      y: music_board.height / 2
    };

    const base = {
      length: length,
      minAngle: 0,
      startAngle: 0,
      maxAngle: 2 * Math.PI
    };

    base.initialRadius = base.length * 0.02;
    base.circleRadius = base.length * 0.003;
    base.clearance = base.length * 0.05;
    base.spacing = (base.length - base.initialRadius - base.clearance) / 2 / colors.length;

    // Propriedades do board
    board.strokeStyle = strokeColor;

    // Verificar se estamos em modo de respiração ou de visualização de áudio
    if (isPlaying && audioLoaded) {
      // Modo de visualização de áudio
      analyser.getByteFrequencyData(dataArray);

      arcs.forEach((arc, index) => {
        let radius = base.initialRadius + (base.spacing * index);
        const offset = base.circleRadius * (5 / 3) / radius;
        let radiusVariation;

        radiusVariation = Math.abs((dataArray[index] / 255) - (index / 100));
        radius += radius * (radiusVariation / 4);

        timeRotation += radiusVariation / 10000;

        drawArc(center.x, center.y, radius, Math.PI + offset, (1.5 * Math.PI) - offset, radiusVariation * 5, radiusVariation);
        drawArc(center.x, center.y, radius, offset, (Math.PI / 2) - offset, radiusVariation * 5, radiusVariation);
        drawArc(center.x, center.y, radius, (1.5 * Math.PI) + offset, 0 - offset, radiusVariation * 5, radiusVariation);
        drawArc(center.x, center.y, radius, (Math.PI / 2) + offset, Math.PI - offset, radiusVariation * 5, radiusVariation);
      });
    } else {
      if (!fadeStartTime) fadeStartTime = currentTime; // Marca o início do fade
      // Calcula o progresso do fade-in
      const fadeProgress = (currentTime - fadeStartTime) / fadeDuration;
      fadeOpacity = Math.min(fadeProgress, 1);

      // Atualizar a posição da onda
      wavePosition += 0.1; // Velocidade da onda

      // Resetar a posição quando a onda sair completamente
      if (wavePosition > arcs.length + totalWaveWidth) {
        wavePosition = -totalWaveWidth;
      }

      // Atualizar o progresso da animação
      animationProgress += deltaTime;
      animationTime += deltaTime;
      if (animationProgress > animationDuration) {
        animationProgress = 0; // Reiniciar a animação
      }

      // Calcular a posição da onda com ease-in-out
      // Usar uma função seno para criar um efeito ease-in-out cíclico
      const normalizedProgress = animationProgress / animationDuration; // 0 a 1
      // const easeInOutProgress = (Math.sin((normalizedProgress * Math.PI * 2) - Math.PI/2) + 1) / 2; // 0 a 1 com efeito ease-in-out

      // Mapear o progresso para a posição da onda
      const easeInOutCubic = t => {
        return t < 0.5 ? 
               2 * t * t : 
               1 - Math.pow(-2 * t + 2, 2) / 2;
      };

      // const easeOutCubic = x => {
      //   return 1 - Math.pow(1 - x, 3);
      // }

      // Mapear o progresso para a posição da onda
      // Começar do centro (índice 0) e ir até o final (arcs.length)
      wavePosition = easeInOutCubic(normalizedProgress) * (arcs.length + totalWaveWidth * 2) - totalWaveWidth;
      // wavePosition = easeInOutProgress * (arcs.length + waveWidth * 2) - waveWidth;

      arcs.forEach((arc, index) => {
        let radius = base.initialRadius + (base.spacing * index);
        const offset = base.circleRadius * (5 / 3) / (radius * 1.5);

        // Distância do centro da onda
        const distanceFromCenter = index - wavePosition;
        // Calcular a intensidade da onda neste ponto
        const waveIntensity = waveProfile(distanceFromCenter);

        // Calcular a distância da onda para este arco
        // const distanceFromWave = Math.abs(index - wavePosition);

        // Calcular a espessura da linha e opacidade baseado na distância da onda
        // const lineWidth = 1 + Math.sin(2 * Math.log(maxLineWidth) * waveIntensity);
        // const lineWidth = asymmetricGaussian(normalizedProgress, index, waveIntensity, maxLineWidth, 2);
        const lineWidth = 1 + (maxLineWidth * (Math.pow(waveIntensity, 2)));
        const targetOpacity = 0.4;
        const opacity = fadeOpacity < targetOpacity ? fadeOpacity : targetOpacity + (0.2 * waveIntensity);

        // Também aplicar um efeito ease-in-out à rotação
        const rotationSpeed = 0.02;
        timeRotation = (rotationSpeed * lineWidth) / 2 + (animationTime * 0.0001);

        // Desenha os arcos com rotação
        drawArc(center.x, center.y, radius, Math.PI + offset + timeRotation, (1.5 * Math.PI) - offset + timeRotation, lineWidth, opacity);
        drawArc(center.x, center.y, radius, offset + timeRotation, (Math.PI / 2) - offset + timeRotation, lineWidth, opacity);
        drawArc(center.x, center.y, radius, (1.5 * Math.PI) + offset + timeRotation, 0 - offset + timeRotation, lineWidth, opacity);
        drawArc(center.x, center.y, radius, (Math.PI / 2) + offset + timeRotation, Math.PI - offset + timeRotation, lineWidth, opacity);
      });
    }
    requestAnimationFrame(draw);
  };

  lastTime = performance.now();
  requestAnimationFrame(draw);
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
      if (audioSource.context.state == "running") {
        audioSource.stop();
        isPlaying = false;
      }
    }
  });
  document.body.appendChild(playButton);
}