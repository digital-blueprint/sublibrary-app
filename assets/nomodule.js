document.addEventListener('DOMContentLoaded', function () {
  function findAllCustomElements(nodes) {
    var allCustomElements = [];
    var nodes = document.querySelectorAll('*');
    for (var i = 0, el; el = nodes[i]; ++i) {
      if (el.localName.indexOf("-") != -1 && el.toString().indexOf("HTMLUnknownElement") != -1) {
        allCustomElements.push(el);
      }
    }
    return allCustomElements;
  }

  var nodes = findAllCustomElements();
  for (var i = 0, el; el = nodes[i]; ++i) {
    nodes[0].innerHTML = "<span style='border: 1px solid red; font-size: 0.8em; opacity: 0.5; padding: 0.2em;'>☹ Your browser is not supported ☹</span>";
  }
});
