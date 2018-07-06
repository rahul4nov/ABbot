'use strict';
const
express = require('express'),
http = require('http'),
mysql =require('mysql'),
router = express.Router(),
bodyParser = require('body-parser'),
request = require('request'),
path = require('path'),
expressSession = require('express-session'),
//bootstrap = require('bootstrap'),

app = express();

var dateTime = require('node-datetime');

app.set('port', process.env.PORT || 80);

app.listen(app.get('port'), function() {
  console.log('running on port', app.get('port'));
  }); // end of port listen function

//Body Parser Middle-ware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));
app.use(expressSession({secret : 'max', saveUninitialized : false, resave : false}));
const baseURL = "http://localhost:80"
//connection to database

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
});// end of connect function  

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); //call to view folder

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
		  //return process.abort();
		      
      } else {
      console.log("Successfully called Send API for recipient %s",
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  }); // end of request
  
} // end of function


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

//onload
app.get('/', function(req,res){
   res.render('index',{
       success : req.session.success,errors : req.session.errors
   });
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
}); // end of /webhook event

// below function gets the volunteer details from the database
var get_volunteers = function (callback) 
{
  var get_volunteer_details = 'SELECT * FROM volunteers';

  con.query(get_volunteer_details, function(err, results) {
    
    callback(results); // sending callback from here
    
  }); // end of connection
    
};// end of get volunteers function


app.get('/volunteers/display',function(req,res){

     // console.log("in volunteers get method");
     get_volunteers(function(data){
      
         // console.log(data);
         // console.log(data.length);
         // console.log(data[0].volunteer_id);
         res.send(data);

     }); // end of get volunteers 

});// end of volunteers display function


app.post('/event/push', function(req,res){  
 
  // get upcoming events from database and push that events

  var messanger_id = req.body.messanger_id;
  console.log("in events push notification");
  console.log(messanger_id);

  get_upcoming_events(messanger_id,function(data){
        
    //console.log(data);
    for(var i=0;i<data.length;i++)
    {
      let cards = [
        {
          "title":data[i].event_name,
          "image_url":"https://cdn-images-1.medium.com/1*Vkf6A8Mb0wBoL3Fw1u0paA.jpeg",
          "subtitle":data[i].event_name + " "+data[i].event_date,
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

     sendGenericMessage(messanger_id, cards);  

    }// end of for loop

  }); // end of callback of get upcoming event

}); // end of event push function

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
    //console.log(webhook_event);
    let sender_id = entry.messaging[0].sender.id;
    let recipient_id = entry.messaging[0].recipient.id;
    
    if(webhook_event.postback)
    {
      console.log("webhook postback event"+webhook_event.postback);
      handlePostback(sender_id, webhook_event.postback);
    }
    
    else
    if(webhook_event.message)
    {
      
       console.log("in webhook message event");
        if(webhook_event.message.text == 'Welcome')
        {
            console.log("in welcome message");
            
            var messageData = {
              recipient: {
                id: recipient_id
              },
              message: {
              
                "attachment":{
                  "type":"template",
                  "payload":{
                    "template_type":"button",
                    "text":"What do you want to do next?",
                    "buttons":[
                      {
                        "type":"postback",
                        "title":"Upcoming Events",
                        "payload":"1"
                      },

                      {
                        "type":"postback",
                        "title":"Give Feedback",
                        "payload":"2"
                      },

                      {
                        "type":"postback",
                        "title":"Register Volunteer Hrs",
                        "payload":"3"
                      },
                    
                    ]
                  }
                }

              }
            };
            
          callSendAPI(messageData);
        } // end of if statement

        else
        if(webhook_event.message.text == 'good')
        {
          console.log("in quick reply payload");
          let webhook_message =  webhook_event.message.quick_reply.payload
          var result = webhook_message.includes('-');
          console.log(result);
          if(result ==true) 
          {
             // here we are updating feedback rating of event in database
             let result_array = webhook_message.split("-");
             result_array = result_array.map(function (val) { return val; });
             let rating = result_array[0];
             let event_id = result_array[1];
             let rating_value = 1;
    
             console.log("rating"+rating);
             console.log("event_id"+event_id);

             // update here rating in database

             var query = "UPDATE  `events` SET "; 
                query+= "`rating` = '"+rating_value+"' ";
                query+= "WHERE `event_id` = '"+event_id+"'"; 

                con.query(query, function(err,result){
                // send message from here to user back

                var messageData = {
                  recipient: {
                    id: sender_id
                  },
                  message: {
                    "text": "Sounds good,your feedback registered successfully."
                  }
                };

                callSendAPI(messageData);

              }); // end of connection

          } // end of if of result of checking includes + event

        } // end of else if

        else
        if(webhook_event.message.text == 'better')
        {
          let webhook_message =  webhook_event.message.quick_reply.payload
          var result = webhook_message.includes('-');
          console.log(result);
          if(result ==true) 
          {
             // here we are updating feedback rating of event in database
             let result_array = webhook_message.split("-");
             result_array = result_array.map(function (val) { return val; });
             let rating = result_array[0];
             let event_id = result_array[1];
             let rating_value = 2;
    
             console.log("rating"+rating);
             console.log("event_id"+event_id);

             // update here rating in database

             var query = "UPDATE  `events` SET "; 
                query+= "`rating` = '"+rating_value+"' ";
                query+= "WHERE `event_id` = '"+event_id+"'"; 

                con.query(query, function(err,result){
                // send message from here to user back

                var messageData = {
                  recipient: {
                    id: sender_id
                  },
                  message: {
                    "text": "Sounds good,your feedback registered successfully."
                  }
                };

                callSendAPI(messageData);

              }); // end of connection

          } // end of if of result of checking includes + event

        } // end of else if

        else
        if(webhook_event.message.text == 'average')
        {
          let webhook_message =  webhook_event.message.quick_reply.payload
          var result = webhook_message.includes('-');
          console.log(result);
          if(result ==true) 
          {
             // here we are updating feedback rating of event in database
             let result_array = webhook_message.split("-");
             result_array = result_array.map(function (val) { return val; });
             let rating = result_array[0];
             let event_id = result_array[1];
             let rating_value = 3;
    
             console.log("rating"+rating);
             console.log("event_id"+event_id);

             // update here rating in database

             var query = "UPDATE  `events` SET "; 
                query+= "`rating` = '"+rating_value+"' ";
                query+= "WHERE `event_id` = '"+event_id+"'"; 

                con.query(query, function(err,result){
                // send message from here to user back

                var messageData = {
                  recipient: {
                    id: sender_id
                  },
                  message: {
                    "text": "Sounds good,your feedback registered successfully."
                  }
                };

                callSendAPI(messageData);

              }); // end of connection

          } // end of if of result of checking includes + event

        } // end of else if

        else
        if(webhook_event.message.text == '1')
        {
              console.log("in get back main menu list");
              console.log(recipient_id);
              console.log(sender_id);
              // send main menu list again

              var messageData = {
                recipient: {
                  id: sender_id
                },
                message: {
                
                  "attachment":{
                    "type":"template",
                    "payload":{
                      "template_type":"button",
                      "text":"What do you want to do next?",
                      "buttons":[
                        {
                          "type":"postback",
                          "title":"Upcoming Events",
                          "payload":"1"
                        },
    
                        {
                          "type":"postback",
                          "title":"Give Feedback",
                          "payload":"2"
                        },
    
                        {
                          "type":"postback",
                          "title":"Register Volunteer Hrs",
                          "payload":"3"
                        },
                      
                      ]
                    }
                  }
    
                }
              };
              
            callSendAPI(messageData);

        } // end of else if

        else
        { 
            // update volunteer hrs in database
            console.log("in volunteers hours updation part");
            var volunteer_hrs = webhook_event.message.text;
           // console.log(volunteer_hrs);
            /*
            if(volunteer_hrs)
            {
              console.log("volunteers hours present");
              console.log(volunteer_hrs.match(/^[0-9]+$/));
            }*/
          
            // update here volunteers hours
            
            //if(volunteer_hrs.match(/^[0-9]+$/) !=null)
            //{
                
                console.log("volunteer hrs"+volunteer_hrs);

                var query = "UPDATE  `volunteers` SET "; 
                query+= "`volunteer_hrs` = '"+volunteer_hrs+"' ";
                query+= "WHERE `volunteer_messanger_id` = '"+sender_id+"'"; 

                //console.log(query);

                con.query(query, function(err,result){
                
                  //console.log("updated successfully");
                  //console.log(result);
                // console.log(err);

                // send message from here to user back

                var messageData = {
                  recipient: {
                    id: sender_id
                  },
                  message: {
                    "text": "Sounds good,your volunteer hours registered successfully."
                  }
                };

                callSendAPI(messageData);

                }); // end of connection

            //} 

          } // end of else
    
    } // end of else if of web hook event message
    
  }); // end of body.entry.foreach loop

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } // end of body 
  else 
  {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

var get_user_info = function (sender_id, callback) 
{
 
  var PAGE_ACCESS_TOKEN = "EAAczZCe0UQgEBAFqYKqjxkJUwzz91qgeS8B01JnMsSvfQyC7g1ZBzbnYtt08ujxPqq9N9IXDweGZC78jl65COd9GoXYBVUUKUgu3Vu06NuNnxy1ZCDb7vDTnigYe5jmw5BnRZCetVKzhMFeZBAZAuipSSZCnZCX0sENZAZBOz5d4YaOowlsekIKukue";
 
  // make http request to get user information

  request('https://graph.facebook.com/v2.6/'+sender_id+'?fields=first_name,last_name,profile_pic&access_token='+PAGE_ACCESS_TOKEN, function (error, response, body) {

    if (!error && response.statusCode == 200) 
    {
      
      // sending volunteer details as response

      callback(body);
       
    } // end of if of checking response status code
    else 
    {
      console.log("Error "+response.statusCode)
    } // end of else 

  }); // end of request call


};// end of function 


var check_volunteer_messanger_id = function (sender_id, callback) 
{
     // check here volunteer messanger id is already present in database or not

     var check_messanger_already_present_query = 'SELECT volunteer_messanger_id FROM volunteers WHERE volunteer_messanger_id = ' +sender_id;

    con.query(check_messanger_already_present_query, function(err, results) {
      var numrows = results.length;
      callback(numrows); // sending callback from here
      
    }); // end of connection
   

}; // end of function

var save_volunteer_details = function(volunteer_name,volunteer_messanger_id,callback)
{
    var sql = "INSERT INTO volunteers(volunteer_name,volunteer_messanger_id) VALUES ?";  
    var values = [  
      [volunteer_name, volunteer_messanger_id],  
    ];  
    con.query(sql,[values], function (err, result) {  
      if (err) 
      {
        throw err;  
      }
      else
      {
        var response = 1;
        callback(response);
      }

  });  // end of connection
}; // end of function

var get_upcoming_events = function (sender_id, callback) 
{
    var dt = dateTime.create();
    var formatted_date = dt.format('Y-m-d');
    var current_date =  "'" + formatted_date + "'";
    
    var get_upcoming_event = 'SELECT * FROM events WHERE event_date >= '+current_date;
    
    con.query(get_upcoming_event, function(err, results) {
      var numrows = results.length;
      callback(results); // sending callback from here
      
    }); // end of database callback 

};// end of function

var get_past_events = function (sender_id, callback) 
{
    var dt = dateTime.create();
    var formatted_date = dt.format('Y-m-d');
    var current_date =  "'" + formatted_date + "'";
    
    var get_past_event = 'SELECT * FROM events WHERE event_date <= '+current_date;
    
    con.query(get_past_event, function(err, results) {
      var numrows = results.length;
      callback(results); // sending callback from here(means we are returning the results from here)
      
    }); // end of database callback 

};// end of function

function handlePostback(sender_id, received_postback)
{
  // function which handles postback of events done by user

  let response;
  
  // Get the payload for the postback
  let payload = received_postback.payload;
  console.log("payload"+payload);
  var n = payload.includes(","); // it checks whether payload contains , or not
  
  console.log("result"+n);

  if(n==true)  // means here payload contains ','
  {
     //  split here payload with ',' and get event id
      console.log("payload includes comma string")
     var array = payload.split(",");
     array = array.map(function (val) { return val; });
     console.log(array);
     console.log(array[1]);
     let event_id = array[1];

    var quick_reply_messageData = {
      recipient: {
          id: sender_id
      },

      message:{
          "text": "Please put your below rating to give feedback on selected event!",
          "quick_replies":[
              {
                  "content_type":"text",
                  "title":"good",
                  "payload":"good"+"-"+event_id
              },
              {
                  "content_type":"text",
                  "title":"better",
                  "payload":"better"+"-"+event_id
              },
              {
                  "content_type":"text",
                  "title":"average",
                  "payload":"average"+"-"+event_id
              }
          ]
      }
    };

    callSendAPI(quick_reply_messageData);

  } // end of if statement
  else
  {
    if(payload == 'START_PAYL')
    {
        // Async function to check volunteer messanger id is already present in database or not
        
      check_volunteer_messanger_id(sender_id,function(data){
          //console.log("volunterr length:"+data);
          if(data>0)
          {
              // volunteer is already present so we directly sends welcome message
              console.log("volunteer is already present");

              // create here json 

              var messageData = {
                recipient: {
                  id: sender_id
                },
                message: {
                  "text": "Welcome"
                }
              };

              callSendAPI(messageData);
              
          } // end of if
          else
          {
                // here we get volunteer details to database 
                get_user_info(sender_id, function(data){
                    var parsedBody = JSON.parse(data);
                    var volunteer_name = parsedBody.first_name +" "+ parsedBody.last_name;
                    var volunteer_messanger_id = sender_id;

                    console.log("in welcome"+volunteer_messanger_id);
                    // save volunteer details to database 

                    save_volunteer_details(volunteer_name,volunteer_messanger_id,function(data){
                      //console.log("result:"+data);

                      var messageData = {
                        recipient: {
                          id: sender_id
                        },
                        message: {
                          "text": "Welcome "+volunteer_name
                        }
                      };
          
                      callSendAPI(messageData);
                      
                    });// end of saving volunteer details
                }); // end of get user info callback function

                // create here json 
          } // end of else 

      }); // end of callback function
    
    }// end of if of chcking payload

    else
    if(payload == '1') // upcoming event
    {
    // console.log("in upcoming event");
      // make here callback to get upcoming event from database and push
      
      get_upcoming_events(sender_id,function(data){
          
        //console.log(data);
        for(var i=0;i<data.length;i++)
        {
          let cards = [
            {
              "title":data[i].event_name,
              "image_url":"https://cdn-images-1.medium.com/1*Vkf6A8Mb0wBoL3Fw1u0paA.jpeg",
              "subtitle":data[i].event_name+" "+data[i].event_date,
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

        sendGenericMessage(sender_id, cards);    

        }// end of for loop

        // send from here one message to user to come back main menu option list

        var messageData = {
          recipient: {
            id: sender_id
          },
          message: {
            "text": "Enter 1 to get back in main menu list"
          }
        };

        callSendAPI(messageData);

      }); // end of callback of get upcoming event
      
    } // end of else if

    else
    if(payload == '2') // give feedback
    {
        console.log("in give feedback option");

        // send one text message first

        var messageData = {
          recipient: {
            id: sender_id
          },
          message: {
            "text": "Select past event to give feedback"
          }
        };

        callSendAPI(messageData);

        // get past event from database to give feedback
        
        get_past_events(sender_id,function(data){
          
          //console.log(data);
          for(var i=0;i<data.length;i++)
          {
            let cards = [
              {
                "title":data[i].event_name,
                "image_url":"https://cdn-images-1.medium.com/1*Vkf6A8Mb0wBoL3Fw1u0paA.jpeg",
                "subtitle":data[i].event_name,
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
                    "title":"Submit",
                    "payload":"event"+","+data[i].event_id
                }              
              ]      
            }
          ]
    
          sendGenericMessage(sender_id, cards);    
    
          }// end of for loop

          // send from here one message to user to come back main menu option list

        var messageData = {
          recipient: {
            id: sender_id
          },
          message: {
            "text": "Enter 1 to get back in main menu list"
          }
        };

        callSendAPI(messageData);

      }); // end of callback of past event
      
    } // end of else if

    else
    if(payload == '3') // register volunteer hrs.
    {
      // console.log("in register volunteer hrs");

        // make from here one callback to register volunteer hrs in database.

        // send one text message first

        var messageData = {
          recipient: {
            id: sender_id
          },
          message: {
            "text": "Please enter your volunteer hours"
          }
        };

        callSendAPI(messageData);

    } // end of else if
}
  
}// end of function of handle postback 





