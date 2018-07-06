'use strict';
const
express = require('express'),
router = express.Router(),
bodyParser = require('body-parser'),
request = require('request'),
bodyParser = require('body-parser'),
mysql = require('mysql'),
app = express();
app.set('port', process.env.PORT || 80);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.listen(app.get('port'), function() {
console.log('running on port', app.get('port'));
});


// make here databse connection 
var con = mysql.createConnection({  
  host: "localhost",  
  user: "root",  
  password: "", 
  database: 'ab-events',
  port: '3306'
}); 

// this is the callback which connectes to mysql server

con.connect(function(err) {  
  if (err) throw err;  
  console.log("Connected!");  

});  



function callSendAPI(messageData) {
	/*
	function to send message back to bot
	*/
	var PAGE_ACCESS_TOKEN = "EAAczZCe0UQgEBAFqYKqjxkJUwzz91qgeS8B01JnMsSvfQyC7g1ZBzbnYtt08ujxPqq9N9IXDweGZC78jl65COd9GoXYBVUUKUgu3Vu06NuNnxy1ZCDb7vDTnigYe5jmw5BnRZCetVKzhMFeZBAZAuipSSZCnZCX0sENZAZBOz5d4YaOowlsekIKukue";
	//console.log("in call send API");
	//console.log(messageData);
	
	request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
		  console.log("Successfully sent message with id %s to recipient %s",
          messageId, recipientId);
		  return process.abort();
		      
      } else {
      console.log("Successfully called Send API for recipient %s",
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });
  
}


function sendTextMessage(recipientId, messageText) {
	/*
		function which takes recipient id and message text and makes json 
		call function "call send API" to send actual message
	*/
	//console.log(recipientId);
	//console.log(messageText);
	
	var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
	
}

function sendGenericMessage(recipientId, cards)
{
  //console.log("in generic message");
  //console.log(recipientId);
 
	var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: cards
        }
      }
    }
  };
  callSendAPI(messageData);
}


function get_user_info(sender_id)
{
  // console.log("in user info function");
  // console.log(sender_id);
  var PAGE_ACCESS_TOKEN = "EAAczZCe0UQgEBAFqYKqjxkJUwzz91qgeS8B01JnMsSvfQyC7g1ZBzbnYtt08ujxPqq9N9IXDweGZC78jl65COd9GoXYBVUUKUgu3Vu06NuNnxy1ZCDb7vDTnigYe5jmw5BnRZCetVKzhMFeZBAZAuipSSZCnZCX0sENZAZBOz5d4YaOowlsekIKukue";
 
  // make http request to get user information

  request('https://graph.facebook.com/v2.6/'+sender_id+'?fields=first_name,last_name,profile_pic&access_token='+PAGE_ACCESS_TOKEN, function (error, response, body) {

    if (!error && response.statusCode == 200) {
      console.log(body); 
      console.log("after body");
      var parsedBody = JSON.parse(body);
      console.log(parsedBody);

      var volunteer_name = parsedBody.first_name +" "+ parsedBody.last_name;
      var volunteer_messanger_id = sender_id;

      // check here volunteer messanger id is present in database or not
       
      // here we insert the volunteer details into database table
      
        var sql = "INSERT INTO volunteers(volunteer_name,volunteer_messanger_id) VALUES ?";  
        var values = [  
          [volunteer_name, volunteer_messanger_id],  
        ];  
        con.query(sql,[values], function (err, result) {  
        if (err) throw err;  
       
        });  // end of connection
        
    } // end of if of checking response status code
    else 
    {
      console.log("Error "+response.statusCode)
    } // end of else 

  }); // end of request call


}// end of function 


// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {  
 
  let body = req.body;
  //console.log(body);

  // Checks this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

    // Gets the message. entry.messaging is an array, but 
    // will only ever contain one message, so we get index 0
    let webhook_event = entry.messaging[0];
    let sender_id = entry.messaging[0].sender.id;
	  let recipient_id = entry.messaging[0].recipient.id;
    let messageText = "Welcome to AB Bot";
    
    //console.log(sender_id);

    // call function from here to get user info

    get_user_info(sender_id);

    /*
    var sql = "Select * from events";  
    con.query(sql, function (err, result) {  
      if (err) throw err;  
      });*/



    /*
	  let cards = [
           {
            "title":"Events",
            "image_url":"https://cdn-images-1.medium.com/1*Vkf6A8Mb0wBoL3Fw1u0paA.jpeg",
            "subtitle":"AB Event",
            "default_action": {
              "type": "web_url",
              "url": "https://petersfancybrownhats.com/view?item=103",
              "messenger_extensions": false,
              "webview_height_ratio": "tall",
              //"fallback_url": "https://petersfancybrownhats.com/"
            },
            "buttons":[
              {
                "type":"postback",
                "title":"Share",
                "payload":"DEVELOPER_DEFINED_PAYLOAD"
              }              
            ]      
          }
        ]	 
		
	    //sendTextMessage(sender_id, messageText);
	    sendGenericMessage(sender_id, cards);
        */
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } 
  else 
  {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});


// this endpoint only for validating webhook with facebook
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === 'fb_time_bot') {
    console.log("webhook verified");
	  res.status(200).send(req.query['hub.challenge']);
  } 
  else 
  {
    console.error("Verification failed. Make sure the validation tokens match.");
    res.status(403).end();
  }
});



