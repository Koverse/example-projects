var moment = require('moment');
const axios = require('axios');

// searches and returns all docs containing search term
async function getData(req, res, next) {
    try 
    {
  
      console.log("Reading jwt cookie in /getData: " + req.cookies.jwt)
      // gets data from the last 5 minutes every 10 seconds
      let now = moment().subtract("5", "minutes").format("X")
      
      axios.post('https://api.staging.koverse.com/query', 
      {
        "datasetId": "9b452877-a363-4303-9fa8-15672a1f62e1",
        "expression": "SELECT * FROM \"9b452877-a363-4303-9fa8-15672a1f62e1\" where \"timestamp\" > " + now,
        "limit": 200,
        "offset": 0
      },
      {
        headers: {
          "Authorization": "Bearer " + req.cookies.jwt         
        }
      })
      .then(response => {
        console.log("Received data ");
        res.send(response.data)
      })
      .catch(err => {
        console.log(err)
        console.log("Issue receiving data")
      })
    } catch (err) {
      console.error(`Error:`, err.message);
      next(err);
    }
  }

module.exports = {
    getData
};