var servicesTab = document.getElementById('services-tab');
var servicesPanel = document.getElementById('services-panel');

var closeNav = document.getElementById('closeNav');


servicesTab.addEventListener('click', function (event) {
  event.preventDefault(); // prevent the default link behavior
  if (servicesPanel.style.display === 'none') {
    servicesPanel.style.display = 'block';
    servicesPanel.setAttribute('aria-hidden', 'false');
    servicesTab.setAttribute('aria-expanded', 'true');
  } else {
    servicesPanel.style.display = 'none';
    servicesPanel.setAttribute('aria-hidden', 'true');
    servicesTab.setAttribute('aria-expanded', 'false');
  }
});

closeNav.addEventListener('click', function (event) {
  event.preventDefault();


  servicesPanel.style.display = 'none';
  servicesPanel.setAttribute('aria-hidden', 'true');
  servicesTab.setAttribute('aria-expanded', 'false');
});
