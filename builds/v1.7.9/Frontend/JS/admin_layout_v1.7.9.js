'use strict';
(function(){
  function qsa(sel){return Array.prototype.slice.call(document.querySelectorAll(sel));}
  function setActive(btn){qsa('.adminSideLink').forEach(function(x){x.classList.remove('active');});if(btn)btn.classList.add('active');}
  qsa('.adminSideLink').forEach(function(btn){
    btn.addEventListener('click',function(){
      var id=btn.getAttribute('data-target'),el=id&&document.getElementById(id);
      if(!el)return;
      setActive(btn);
      if(el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
  var sections=qsa('.adminAnchor');
  function syncNav(){
    var best=null,bestDist=1e9;
    sections.forEach(function(s){var r=s.getBoundingClientRect(),d=Math.abs(r.top-92);if(r.bottom>92&&d<bestDist){best=s;bestDist=d;}});
    if(!best)return;
    var btn=document.querySelector('.adminSideLink[data-target="'+best.id+'"]');
    if(btn)setActive(btn);
  }
  var ticking=false;
  window.addEventListener('scroll',function(){if(ticking)return;ticking=true;requestAnimationFrame(function(){syncNav();ticking=false;});},{passive:true});
  window.addEventListener('resize',syncNav);
  syncNav();
})();
