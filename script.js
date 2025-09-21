(function(){
  const grid = document.getElementById('grid');
  const search = document.getElementById('search');
  const volume = document.getElementById('volume');
  const stopAllBtn = document.getElementById('stopAll');
  const toggleDebug = document.getElementById('toggleDebug');

  const btns = [...grid.querySelectorAll('.card')];
  const keyMap = new Map();

  // Debug panel
  const dbg = document.createElement('div');
  dbg.className = 'debug-panel';
  dbg.innerHTML = '<b>Soundboard Debug</b> · load/play events will appear here';
  document.body.appendChild(dbg);
  const log = (m)=>{ if(!dbg.classList.contains('show')) return; const d=document.createElement('div'); d.textContent=m; dbg.appendChild(d); dbg.scrollTop=dbg.scrollHeight; };
  toggleDebug?.addEventListener('change',()=>{ dbg.classList.toggle('show', !!toggleDebug.checked); });

  // Initialize buttons
  btns.forEach(btn=>{
    const key = (btn.dataset.key||'').toLowerCase();
    if(key) keyMap.set(key, btn);
    const audio = btn.querySelector('audio');
    if(audio){
      audio.volume = parseFloat(volume.value);
      // Helpful event logs
      const label = btn.dataset.label || 'sound';
      audio.addEventListener('canplaythrough',()=>log(`✅ Ready: ${label}`));
      audio.addEventListener('play',()=>log(`▶️ Playing: ${label}`));
      audio.addEventListener('stalled',()=>log(`⏸️ Stalled: ${label}`));
      audio.addEventListener('waiting',()=>log(`… Buffering: ${label}`));
      audio.addEventListener('loadedmetadata',()=>log(`ℹ️ loadedmetadata: ${label}, readyState=${audio.readyState}`));
      audio.addEventListener('error',()=>{
        const e = audio.error;
        let reason='unknown';
        if(e){
          switch(e.code){
            case e.MEDIA_ERR_ABORTED: reason='aborted'; break;
            case e.MEDIA_ERR_NETWORK: reason='network'; break;
            case e.MEDIA_ERR_DECODE: reason='decode/format'; break;
            case e.MEDIA_ERR_SRC_NOT_SUPPORTED: reason='src not supported'; break;
          }
        }
        log(`❌ Error: ${label} (${reason})`);
      });
    }
    btn.addEventListener('click',()=>play(btn));
  });

  function play(btn){
    const audio = btn.querySelector('audio');
    if(!audio) return;
    try { audio.pause(); audio.currentTime = 0; } catch(e){}
    try { audio.load(); } catch(e){}
    audio.volume = parseFloat(volume.value);
    const p = audio.play();
    if(p && typeof p.catch==='function'){ p.catch(()=>{}); }
    flash(btn);
  }

  function flash(btn){
    btn.style.outline = '3px solid var(--accent)';
    btn.style.outlineOffset = '2px';
    setTimeout(()=>{ btn.style.outline='none'; }, 120);
  }

  function stopAll(){
    btns.forEach(b=>{
      const a = b.querySelector('audio');
      if(a && !a.paused){ a.pause(); a.currentTime = 0; }
    });
  }

  // Search filter
  search.addEventListener('input', ()=>{
    const q = search.value.trim().toLowerCase();
    btns.forEach(b=>{
      const label = (b.dataset.label||'').toLowerCase();
      const cat = (b.dataset.category||'').toLowerCase();
      b.classList.toggle('hidden', !(label.includes(q) || cat.includes(q)));
    });
  });

  // Keyboard controls
  window.addEventListener('keydown',(e)=>{
    const k = (e.key||'').toLowerCase();
    if(k==='escape'){ stopAll(); return; }
    if(document.activeElement===search) return;
    const btn = keyMap.get(k);
    if(btn){ e.preventDefault(); play(btn); }
  });

  // Volume slider
  volume.addEventListener('input',()=>{
    const v = parseFloat(volume.value);
    btns.forEach(b=>{
      const a = b.querySelector('audio');
      if(a) a.volume = v;
    });
  });

  stopAllBtn.addEventListener('click', stopAll);
})();
