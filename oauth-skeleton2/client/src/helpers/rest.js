/* eslint-disable */
// Example POST method implementation:
export const postData = async (url = "", data = {}, jwt) => {
  // Default options are marked with *
  const response = await fetch(url, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "strategy": "jwt",
      "Content-Type": "application/json",
      "Authorization": "Bearer " + jwt,
      // "Origin": "https://gs_test.dev.koverse.com"
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data), // body data type must match "Content-Type" header
  });

  if (response.status != 200){
    
  } 
  return response.json(); // parses JSON response into native JavaScript objects
};
