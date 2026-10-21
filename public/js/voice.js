/**
 * Voice & Text Input Assistant
 * Uses Web Speech Recognition and Web Speech Synthesis
 */

const VoiceAssistant = (function () {
  let recognition = null;
  let isListening = false;
  let speechSynth = window.speechSynthesis || null;

  function init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isListening = true;
        updateUiState(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }

        const transcriptEl = document.getElementById('voice-transcript-text');
        if (transcriptEl) transcriptEl.textContent = `"${transcript}"`;

        if (event.results[0].isFinal) {
          handleVoiceCommand(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        stopListening();
        const feedbackEl = document.getElementById('voice-feedback-text');
        if (feedbackEl) {
          if (event.error === 'not-allowed') {
            feedbackEl.textContent = 'Microphone permission blocked. You can type below!';
          } else {
            feedbackEl.textContent = `Error: ${event.error}. You can also type your order!`;
          }
        }
      };

      recognition.onend = () => {
        stopListening();
      };
    }
  }

  function startListening() {
    if (!recognition) {
      const feedbackEl = document.getElementById('voice-feedback-text');
      if (feedbackEl) {
        feedbackEl.textContent = 'Speech recognition is not supported in this browser. Please use text input below.';
      }
      return;
    }

    try {
      if (window.AudioFX) window.AudioFX.playVoiceBeep();
      recognition.start();
    } catch (e) {
      console.warn('Recognition already started or error:', e);
    }
  }

  function stopListening() {
    isListening = false;
    updateUiState(false);
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {}
    }
  }

  function toggleListening() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  function updateUiState(listening) {
    const micCircle = document.getElementById('modal-mic-circle');
    const waveBars = document.getElementById('voice-wave-bars');
    const statusTitle = document.getElementById('voice-status-title');

    if (micCircle) {
      micCircle.classList.toggle('listening', listening);
    }
    if (waveBars) {
      waveBars.classList.toggle('active', listening);
    }
    if (statusTitle) {
      statusTitle.textContent = listening ? 'Listening to your order...' : 'Tap Mic or Type to Order';
    }
  }

  async function handleVoiceCommand(text) {
    if (!text || !text.trim()) return;

    const feedbackEl = document.getElementById('voice-feedback-text');
    if (feedbackEl) feedbackEl.textContent = 'Understanding command...';

    try {
      const res = await fetch('/api/voice/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text })
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Voice interpretation failed');
      }

      const result = data.data;
      executeIntent(result);
    } catch (err) {
      console.error(err);
      if (feedbackEl) feedbackEl.textContent = `Could not process command: ${err.message}`;
    }
  }

  function executeIntent(parsed) {
    const feedbackEl = document.getElementById('voice-feedback-text');
    let speakMessage = parsed.message || 'Done';

    switch (parsed.intent) {
      case 'ADD_TO_CART':
        if (parsed.items && parsed.items.length > 0) {
          parsed.items.forEach(item => {
            window.Cart.addItem(item, item.quantity);
          });
          speakMessage = `Added ${parsed.items.map(i => `${i.quantity} ${i.name}`).join(' and ')} to your order!`;
          if (window.showToast) window.showToast(speakMessage, 'success');
        }
        break;

      case 'REMOVE_FROM_CART':
        if (parsed.items && parsed.items.length > 0) {
          parsed.items.forEach(item => {
            window.Cart.removeItem(item.item_id);
          });
          speakMessage = `Removed ${parsed.items.map(i => i.name).join(', ')} from your order.`;
          if (window.showToast) window.showToast(speakMessage);
        }
        break;

      case 'CLEAR_CART':
        window.Cart.clearCart();
        speakMessage = 'Cleared all items from your cart.';
        if (window.showToast) window.showToast(speakMessage);
        break;

      case 'APPLY_COUPON':
        if (parsed.couponCode) {
          window.Cart.applyCouponCode(parsed.couponCode)
            .then(coupon => {
              speakMessage = `Success! Coupon ${coupon.code} applied for ${coupon.discount_percentage}% off!`;
              speakResponse(speakMessage);
              if (window.showToast) window.showToast(speakMessage, 'success');
              if (feedbackEl) feedbackEl.textContent = speakMessage;
            })
            .catch(err => {
              speakMessage = err.message;
              speakResponse(speakMessage);
              if (feedbackEl) feedbackEl.textContent = speakMessage;
            });
          return;
        }
        break;

      case 'CHECKOUT':
        closeVoiceModal();
        if (window.openCheckoutModal) window.openCheckoutModal();
        speakMessage = 'Opening Driveway Bay checkout for your order.';
        break;

      case 'TRACK_ORDER':
        if (parsed.orderNumber) {
          speakMessage = `Navigating to live tracker for order ${parsed.orderNumber}`;
          speakResponse(speakMessage);
          setTimeout(() => {
            window.location.href = `/track?order=${encodeURIComponent(parsed.orderNumber)}`;
          }, 1200);
          return;
        }
        break;

      case 'FILTER_CATEGORY':
        if (parsed.categorySlug && window.filterByCategory) {
          window.filterByCategory(parsed.categorySlug);
        }
        break;

      case 'FILTER_VEG':
        const vegToggle = document.getElementById('veg-only-toggle');
        if (vegToggle) {
          vegToggle.checked = true;
          vegToggle.dispatchEvent(new Event('change'));
        }
        break;
    }

    if (feedbackEl) feedbackEl.textContent = speakMessage;
    speakResponse(speakMessage);
  }

  function speakResponse(text) {
    if (!speechSynth || !text) return;
    try {
      speechSynth.cancel(); // Stop prior speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      speechSynth.speak(utterance);
    } catch (e) {}
  }

  function openVoiceModal() {
    const modal = document.getElementById('voice-modal-backdrop');
    if (modal) {
      modal.classList.add('open');
      const transcriptEl = document.getElementById('voice-transcript-text');
      const feedbackEl = document.getElementById('voice-feedback-text');
      if (transcriptEl) transcriptEl.textContent = 'Listening for: "Add 2 Burgers", "Checkout", etc...';
      if (feedbackEl) feedbackEl.textContent = '';
      startListening();
    }
  }

  function closeVoiceModal() {
    stopListening();
    const modal = document.getElementById('voice-modal-backdrop');
    if (modal) modal.classList.remove('open');
  }

  return {
    init,
    openVoiceModal,
    closeVoiceModal,
    toggleListening,
    handleVoiceCommand
  };
})();

window.VoiceAssistant = VoiceAssistant;
