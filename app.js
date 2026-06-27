(function () {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const transcriptEl = document.getElementById('transcript');
  const interimEl = document.getElementById('interim');
  const placeholderEl = document.getElementById('placeholder');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const wordCountEl = document.getElementById('wordCount');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');
  const box = document.querySelector('.transcript-box');
  const languageSelect = document.getElementById('languageSelect');
  const continuousToggle = document.getElementById('continuousToggle');
  const interimToggle = document.getElementById('interimToggle');
  const toast = document.getElementById('toast');

  let recognition = null;
  let finalText = '';
  let toastTimer = null;
  let restartPending = false;

  function showToast(msg, duration = 2200) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
  }

  function setStatus(state, message) {
    statusDot.className = 'dot' + (state === 'listening' ? ' active' : state === 'error' ? ' error' : '');
    statusText.textContent = message;
  }

  function updateWordCount() {
    const words = finalText.trim().split(/\s+/).filter(Boolean).length;
    wordCountEl.textContent = words + (words === 1 ? ' word' : ' words');
  }

  function updatePlaceholder() {
    placeholderEl.style.display = (finalText || interimEl.textContent) ? 'none' : '';
  }

  function renderFinal() {
    transcriptEl.textContent = finalText;
    updateWordCount();
    updatePlaceholder();
    box.scrollTop = box.scrollHeight;
  }

  if (!SpeechRecognition) {
    setStatus('error', 'Not supported in this browser');
    startBtn.disabled = true;
    showToast('Speech recognition is not supported. Try Chrome or Edge.', 5000);
    return;
  }

  function buildRecognition() {
    const r = new SpeechRecognition();
    r.lang = languageSelect.value;
    r.continuous = continuousToggle.checked;
    r.interimResults = interimToggle.checked;

    r.onstart = () => {
      setStatus('listening', 'Listening...');
      box.classList.add('listening');
      startBtn.disabled = true;
      stopBtn.disabled = false;
    };

    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalText += (finalText && !finalText.endsWith('\n') ? ' ' : '') + t.trim();
          renderFinal();
        } else {
          interim += t;
        }
      }
      interimEl.textContent = interim ? ' ' + interim : '';
      updatePlaceholder();
    };

    r.onerror = (e) => {
      if (e.error === 'no-speech') return;
      if (e.error === 'aborted') return;
      setStatus('error', 'Error: ' + e.error);
      showToast('Error: ' + e.error);
    };

    r.onend = () => {
      interimEl.textContent = '';
      box.classList.remove('listening');
      if (restartPending) {
        restartPending = false;
        return;
      }
      if (continuousToggle.checked && startBtn.disabled) {
        // auto-restart for browsers that end early in continuous mode
        try { r.start(); return; } catch (_) {}
      }
      setStatus('', 'Ready');
      startBtn.disabled = false;
      stopBtn.disabled = true;
    };

    return r;
  }

  startBtn.addEventListener('click', () => {
    recognition = buildRecognition();
    try {
      recognition.start();
    } catch (e) {
      setStatus('error', 'Could not start');
      showToast('Could not start microphone: ' + e.message);
    }
  });

  stopBtn.addEventListener('click', () => {
    restartPending = true;
    if (recognition) recognition.stop();
    setStatus('', 'Stopped');
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  copyBtn.addEventListener('click', async () => {
    const text = finalText.trim();
    if (!text) { showToast('Nothing to copy'); return; }
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard!');
    } catch (_) {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied!');
    }
  });

  clearBtn.addEventListener('click', () => {
    finalText = '';
    interimEl.textContent = '';
    renderFinal();
    updatePlaceholder();
    showToast('Cleared');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      if (startBtn.disabled) {
        stopBtn.click();
      } else {
        startBtn.click();
      }
    }
  });

  updatePlaceholder();
})();
