'use strict';(function(){var N='http://www.w3.org/2000/svg';var D={
home:'M3 10.5 10 4l7 6.5V18H5v-7.5 M8 18v-5h4v5',
account:'M7 7a3 3 0 1 0 6 0 3 3 0 0 0-6 0 M4 18c.6-3.1 2.6-4.7 6-4.7s5.4 1.6 6 4.7',
wallet:'M3 6.5h12.5A1.5 1.5 0 0 1 17 8v8.5H4.5A1.5 1.5 0 0 1 3 15V6.5Zm0 1V5a2 2 0 0 1 2-2h9v3.5 M12 11h5 M14 11h.1',
ledger:'M5 3h10v14H5z M8 7h4 M8 10h4 M8 13h4',
key:'M12 8a4 4 0 1 1-1.2 2.85L6 15.65V18H3.7v-2.3H6v-2.3h2.3l1.45-1.45 M14 8h.1',
vault:'M4 3h12v14H4z M7 6h6v8H7z M10 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4 M10 7v2 M10 11v2',
shared:'M6 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5 M14 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M2.5 17c.4-3 2-4.5 4-4.5s3.6 1.5 4 4.5 M10.5 17c.3-2.3 1.5-3.5 3.3-3.5 1.8 0 3 1.2 3.7 3.5',
loan:'M3 6h14 M5 6V4h10v2 M5 9h10v8H5z M8 12h4 M10 10v4',
swap:'M3 7h11l-2.5-2.5 M14 7l-2.5 2.5 M17 13H6l2.5-2.5 M6 13l2.5 2.5',
bank:'M2 7 10 3l8 4 M3 7h14 M4 16h12 M3 18h14 M5 8v7 M9 8v7 M13 8v7 M17 8v7',
shield:'M10 2l6 2v5c0 4-2.3 6.8-6 9-3.7-2.2-6-5-6-9V4l6-2z'
};function svg(name){var s=document.createElementNS(N,'svg'),p=document.createElementNS(N,'path');s.setAttribute('viewBox','0 0 20 20');s.setAttribute('aria-hidden','true');s.setAttribute('class','iaIcon');p.setAttribute('d',D[name]||D.wallet);s.appendChild(p);return s}window.IATBIcons={make:svg,names:Object.keys(D)};function apply(){var a=document.querySelectorAll('[data-ia-icon]');for(var i=0;i<a.length;i++){var el=a[i];while(el.firstChild)el.removeChild(el.firstChild);el.appendChild(svg(el.getAttribute('data-ia-icon')))}}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();})();