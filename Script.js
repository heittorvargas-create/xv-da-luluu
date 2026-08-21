(() => {
  'use strict';

  /* =====================================================================
     Configuração — edite aqui se algum dado mudar
     ===================================================================== */
  const CONFIG = {
    address: '', // local ainda não definido — preencher quando confirmado
    whatsappNumber: '5513996752376', // DDI 55 + DDD 13 + número
    whatsappMessage: 'Olá! Estou confirmando minha presença no XV da Lulu. 💙',
    // Link do convite já hospedado (ex: "https://xvdalulu.netlify.app").
    // Deixe vazio enquanto o convite não estiver no ar — nesse caso o
    // compartilhamento usa o endereço atual da página como alternativa.
    inviteUrl: '',
  };

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let soundController = null;

  /* =====================================================================
     Reveal on scroll / on load — fade + blur suave
     ===================================================================== */
  function initReveal(container){
    const items = container.querySelectorAll('.reveal');
    if (prefersReducedMotion){
      items.forEach(el => el.classList.add('is-visible'));
      return;
    }
    items.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i * 70, 560)}ms`;
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    items.forEach(el => observer.observe(el));
  }

  /* =====================================================================
     Contagem regressiva até a festa
     ===================================================================== */
  function initCountdown(){
    const target = new Date('2026-12-05T20:00:00');
    const elDays = document.getElementById('cd-days');
    const elHours = document.getElementById('cd-hours');
    const elMin = document.getElementById('cd-min');
    const elSec = document.getElementById('cd-sec');
    if (!elDays) return;

    function pad(n){ return String(Math.max(n, 0)).padStart(2, '0'); }

    function tick(){
      const diff = target.getTime() - Date.now();
      if (diff <= 0){
        elDays.textContent = '00'; elHours.textContent = '00';
        elMin.textContent = '00'; elSec.textContent = '00';
        clearInterval(timer);
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const min = Math.floor((diff % 3600000) / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      elDays.textContent = pad(days);
      elHours.textContent = pad(hours);
      elMin.textContent = pad(min);
      elSec.textContent = pad(sec);
    }

    tick();
    const timer = setInterval(tick, 1000);
  }

  /* =====================================================================
     Bolhas subindo — canvas sutil e lento
     ===================================================================== */
  function initBubbles(){
    const canvas = document.getElementById('bubble-canvas');
    if (!canvas || prefersReducedMotion) return;
    const ctx = canvas.getContext('2d');
    let w, h, bubbles, dpr;

    function resize(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeBubble(fromBottom){
      return {
        x: Math.random() * w,
        y: fromBottom ? h + Math.random() * 60 : Math.random() * h,
        r: 2 + Math.random() * 5,
        speed: 0.25 + Math.random() * 0.5,
        drift: Math.random() * 0.6 - 0.3,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.08 + Math.random() * 0.16,
      };
    }

    function init(){
      resize();
      const count = Math.round((w * h) / 55000);
      bubbles = Array.from({ length: Math.max(10, Math.min(count, 26)) }, () => makeBubble(false));
    }

    function step(){
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#bfe0ee';
      bubbles.forEach(b => {
        b.y -= b.speed;
        b.x += Math.sin(b.y * 0.02 + b.phase) * b.drift;
        if (b.y < -10){
          Object.assign(b, makeBubble(true));
        }
        ctx.globalAlpha = b.opacity;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(step);
    }

    init();
    window.addEventListener('resize', () => { resize(); });
    requestAnimationFrame(step);
  }

  /* =====================================================================
     Som ambiente do mar — gerado via Web Audio API (sem arquivo externo)
     ===================================================================== */
  function initSound(){
    const btn = document.getElementById('btn-sound');
    if (!btn) return null;
    let ctx, isPlaying = false, nodes = null;

    function buildWaveAmbience(audioCtx){
      // ruído marrom (grave, encorpado) filtrado para lembrar o vaivém das ondas
      const bufferSize = 2 * audioCtx.sampleRate;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++){
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 700;

      const gain = audioCtx.createGain();
      gain.gain.value = 0;

      // LFO simulando o balanço das ondas
      const lfo = audioCtx.createOscillator();
      lfo.frequency.value = 0.09;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 0.05;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      noise.start();
      lfo.start();

      return { noise, lfo, gain, filter };
    }

    btn.addEventListener('click', () => {
      ensureContext();
      setPlaying(!isPlaying);
    });

    function ensureContext(){
      if (!ctx){
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        nodes = buildWaveAmbience(ctx);
      }
      if (ctx.state === 'suspended') ctx.resume();
    }

    function setPlaying(playing){
      isPlaying = playing;
      btn.setAttribute('aria-pressed', String(isPlaying));
      btn.setAttribute('aria-label', isPlaying ? 'Desativar som ambiente do mar' : 'Ativar som ambiente do mar');
      const target = isPlaying ? 0.09 : 0;
      nodes.gain.gain.cancelScheduledValues(ctx.currentTime);
      nodes.gain.gain.linearRampToValueAtTime(target, ctx.currentTime + 1.2);
    }

    // chamado pelo botão "Entrar no convite" — o toque nele já conta
    // como o gesto do usuário que os navegadores exigem para liberar áudio,
    // então o som começa sozinho nesse momento, sem precisar tocar no ícone.
    function enable(){
      ensureContext();
      if (!isPlaying) setPlaying(true);
    }

    return { enable };
  }

  /* =====================================================================
     Toast
     ===================================================================== */
  function showToast(message){
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  /* =====================================================================
     Compartilhar convite
     ===================================================================== */
  function initShare(){
    const btn = document.getElementById('btn-share');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const shareData = {
        title: 'XV da Lulu',
        text: 'Vem viver esse dia comigo, vai ser mágico! 💙 Você foi convidado(a) para o meu XV!',
        url: CONFIG.inviteUrl || window.location.href,
      };
      if (navigator.share){
        try { await navigator.share(shareData); }
        catch (err) { /* usuário cancelou — sem problema */ }
        return;
      }
      try {
        await navigator.clipboard.writeText(shareData.url);
        showToast('Link copiado! 💙');
      } catch (err) {
        showToast('Não foi possível copiar o link.');
      }
    });
  }

  /* =====================================================================
     Pix — copiar chave ao tocar
     ===================================================================== */
  function initPix(){
    const btn = document.getElementById('pix-key');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const key = btn.textContent.trim();
      try {
        await navigator.clipboard.writeText(key);
        showToast('Chave Pix copiada! 💙');
      } catch (err) {
        showToast('Não foi possível copiar. Chave: ' + key);
      }
    });
  }

  /* =====================================================================
     Modal — confirmação enviada
     ===================================================================== */
  function initRsvpModal(){
    const modal = document.getElementById('rsvp-modal');
    const closeBtn = document.getElementById('btn-modal-close');
    if (!modal) return;

    function open(){
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }
    function close(){
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }

    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    return { open, close };
  }

  /* =====================================================================
     Navegação entre páginas (SPA com transição suave)
     ===================================================================== */
  const pageEntry = document.getElementById('page-entry');
  const pageInvite = document.getElementById('page-invite');
  const pageGifts = document.getElementById('page-gifts');

  function goTo(targetPage, otherPage){
    if (targetPage.classList.contains('is-active')) return;

    if (prefersReducedMotion){
      otherPage.classList.remove('is-active');
      targetPage.classList.add('is-active');
      window.scrollTo({ top: 0 });
      return;
    }

    otherPage.classList.add('is-leaving');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
      otherPage.classList.remove('is-active', 'is-leaving');
      targetPage.classList.add('is-active', 'is-entering');
      window.scrollTo({ top: 0 });
      setTimeout(() => targetPage.classList.remove('is-entering'), 650);
    }, 420);
  }

  document.getElementById('btn-enter').addEventListener('click', (e) => {
    pulse(e.currentTarget);
    if (soundController) soundController.enable();
    setTimeout(() => goTo(pageInvite, pageEntry), 160);
  });

  document.getElementById('btn-gifts').addEventListener('click', () => {
    goTo(pageGifts, pageInvite);
  });

  document.getElementById('btn-back').addEventListener('click', () => {
    goTo(pageInvite, pageGifts);
  });

  /* =====================================================================
     Botão — pequena animação de brilho ao clicar
     ===================================================================== */
  function pulse(btn){
    btn.classList.remove('is-pressed');
    // força reflow para permitir re-disparar a animação
    void btn.offsetWidth;
    btn.classList.add('is-pressed');
  }

  /* =====================================================================
     📍 Localização — desativado até o endereço ser definido.
     Quando o local for confirmado: 1) preencha CONFIG.address, 2) remova
     o atributo "disabled" e a classe "btn--disabled" do botão no HTML,
     3) descomente o bloco abaixo.
     ===================================================================== */
  // document.getElementById('btn-location').addEventListener('click', (e) => {
  //   pulse(e.currentTarget);
  //   const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIG.address)}`;
  //   setTimeout(() => window.open(url, '_blank', 'noopener'), 180);
  // });

  /* =====================================================================
     ✅ Confirmar Presença — abre o WhatsApp com mensagem pronta
     ===================================================================== */
  const rsvpModal = initRsvpModal();

  document.getElementById('btn-confirm').addEventListener('click', (e) => {
    pulse(e.currentTarget);
    const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(CONFIG.whatsappMessage)}`;
    setTimeout(() => window.open(url, '_blank', 'noopener'), 180);
    setTimeout(() => rsvpModal.open(), 700);
  });

  /* =====================================================================
     Init
     ===================================================================== */
  initReveal(pageEntry);
  initReveal(pageInvite);
  initReveal(pageGifts);
  initCountdown();
  initBubbles();
  soundController = initSound();
  initShare();
  initPix();
})();
  
