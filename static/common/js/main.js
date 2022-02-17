set100vh()
function set100vh(){
  function setIt(){
    document.documentElement.style.setProperty('--wh', window.innerHeight + 'px' )
  }
  setIt()
  window.onresize = function(){
    setIt()
  }
}