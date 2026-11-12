const root=document.querySelector('.plastic-overlay');
if(root) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),desktop=matchMedia('(min-width: 761px)');
  const buttons=[...document.querySelectorAll('[data-plastic-toggle]')];
  let controller,loading=false,failed=false,preference=null;
  try{preference=localStorage.getItem('artecool-3d');}catch{}
  const allowed=()=>desktop.matches&&(preference==='on'||(preference!=='off'&&!reduced.matches&&!navigator.connection?.saveData));
  function label() {
    const active=allowed()&&!failed;
    buttons.forEach(button=>{
      button.hidden=!desktop.matches;button.disabled=failed;
      button.setAttribute('aria-pressed',String(active));
      button.querySelector('span').textContent=failed?'3D indisponível':active?'Desativar formas 3D':'Ativar formas 3D';
    });
    root.dataset.requested=String(active);
  }
  async function configure() {
    label();
    if(controller){controller.setEnabled(allowed()&&!failed);return;}
    if(!allowed()||loading||failed)return;
    loading=true;
    try {
      const {createForegroundScene}=await import('./foreground-scene.js?v=1.6');
      if(!allowed())return;
      controller=createForegroundScene(root);root.scene3d=controller;controller.setEnabled(true);
    }catch(error){failed=true;root.dataset.state='fallback';root.dataset.enhanced='false';document.body.dataset.plasticActive='false';console.warn('Composição vetorial preservada; 3D indisponível.',error.message);}
    finally{loading=false;label();}
  }
  buttons.forEach(button=>button.addEventListener('click',()=>{
    preference=allowed()?'off':'on';
    try{localStorage.setItem('artecool-3d',preference);}catch{}
    configure();
  }));
  root.addEventListener('plastic-unavailable',()=>{failed=true;label();});
  reduced.addEventListener('change',configure);desktop.addEventListener('change',configure);
  configure();
}
