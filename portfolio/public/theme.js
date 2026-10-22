(function(){var t=null;try{t=localStorage.getItem('theme')}catch(e){}
document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')})();
