// client id: 
fetch('https://api.spotify.com/v1/search', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' // client secret
    },
    params: {
      q: 'My Chemical Romance Welcome to the Black Parade',
      type: 'track'
    }
  })
  .then(response => response.json())
  .then(data => {
    console.log(data);
  });
  
