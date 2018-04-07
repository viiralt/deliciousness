function autocomplete (input, latInput, lngInput) {
  if(!input) return; // if no address, skip
  const dropdown = new google.maps.places.Autocomplete(input);

  dropdown.addListener('place_changed', () => {
    const place = dropdown.getPlace();
    latInput.value = place.geometry.location.lat();
    lngInput.value = place.geometry.location.lng();
  });
  // if user hits enter on the address field, don't submit the form 
  input.on('keydown', (event) => {
    if(e.keyCode === 13) event.preventDefault();
  });
}

export default autocomplete;