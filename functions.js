/*SETTINGS*/
const request = require('request');
const fs = require('fs');
const settings = require("./settings.json"); //parse settings to get data
const terminal = require('./js/render.js');
const $ = require('jquery');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/*internal constants setting*/
const swipelen = 10; //nuber of swipes to see in left sliding list
const textDisplayDelay = 2; //n-sec to text value hold

//timers
var cancel_timer_logout,
    cancel_timer_wrongKey,
    clear_Interval_loadAll,
    clear_interval_user_logout,
    clear_Interval_getWeatherInfo
    ;

/*This is used for set interval of automatic keys loading from server database*/
const logoutTime = settings.AUTO_USER_LOGOUT_TIME_SEC; //n-sec to automatic user logout and also user unload
var logoutTimeText = logoutTime;
const loadKeysIntervalTime = settings.AUTO_TERMINAL_LOAD_SEC; //set time of keys to load, n*60 = in minutes
var userIsLoaded = false; //if true frequentely load keys

//jquery selectors for inner text changing, only for CSS change
//server texts
const terminalServerUrl = $('.subblock-top .server-url');
const terminalServerStatus = $('.subblock-top .server-status');
//user texts
const terminalInfoText = $('.subblock-center .info-text');
const terminalUserName = $('.subblock-top .user');
const terminalUserKey= $('.subblock-top .key');
const terminalUserStatus = $('.subblock-top .user-status');
const terminalUserHours = $('.subblock-top .user-hours');
//in SystemCodeOK mode
const terminalButtonsInfoText = $('.subblock-center-buttons .info-text');
const displayButtonsBlock = $('.subblock-center-buttons');
const displayLogoutTime = $('.subblock-center-buttons .info-text-inline .logout-time-text');
/*INITIAL CALLS*/
terminal.loaderOn(); //initial load, run CSS/JS loader inmediately
$(".server-url").text(settings.URL.split("//")[1]); //load server settings to element
displayLogoutTime.text(logoutTimeText); //initial display this value

console.info("Auto terminal load time is set to: " +loadKeysIntervalTime+" seconds");
console.info("Auto user logout time is set to: "+logoutTime+" seconds");

/*FUNCTIONS*/
var keysFromServer = function(){
    var user_keys;
    var current_user;
    return {
        /* loads all keys from server and stores them to user_keys
         * param: true if we want to loaduser too with current key
         */
        loadAll: function (loaduser){
            var that = this;
            //document.getElementById('online_status').innerHTML = "Loading Status";
            terminalServerStatus.text("Loading status");
            terminalServerStatus.addClass('info');

            URL = settings.URL + "/api/keys/";
            request({url:URL,headers:{"Authorization": "Token " + settings.TOKEN}},
                function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        user_keys = JSON.parse(body);
                          console.log("User keys loaded from server " + URL );
                        terminal.loaderOff();
                        terminal.SystemCodeScan();
                        terminalServerStatus.removeClass('info').removeClass('danger').addClass('success');
                        clearTimeout(cancel_timer_logout);
                        clearTimeout(cancel_timer_wrongKey);
                        clearInterval(clear_interval_user_logout);
                        logoutTimeText = logoutTime; //reset to initial value
                        updateSwipeList();
                    }/**/
                    else{
                          console.log(body);
                          console.log(error);
                        terminal.loaderOff();
                        terminal.SystemOffline();
                        terminalServerStatus.removeClass('info').addClass('danger').removeClass('success');
                    }
                    //calls all users on log
                      console.log("User keys are: ");
                      console.log(that.getAll());

                    if(loaduser){ // if we want to, we can loaduser immediately
                        that.loadUser(keyCodeReader.getCurrentKeyCode());
                    }
                    $('.server-status').text('online');
                    terminalServerStatus.removeClass('info').removeClass('danger').addClass('success');
                })
        },
        getAll: function(){return user_keys;},
        /* Loads current user to current_user variable from downloaded
         * keys and key param (must be same)
         */
        loadUser: function(key){
            var that = this;
            if(that.getAll()){ //if we got users loaded
                var filtered = that.getAll().filter(function(row){
                    if(row.id === key){ return true;
                      } else {            return false;
                    }
                });

                if(Object.keys(filtered).length === 1){
                    current_user = filtered[0];
                      console.log("Loaded user: ");
                      console.log(current_user);
                    terminalInfoText.text("Key verified");
                    userIsLoaded = true;
                      console.log("user is loaded:" +userIsLoaded);
                    var status_string = getLastActionString(current_user.user.last_swipe.swipe_type);
                    terminal.SystemCodeOK(); //call another mode to display buttons
                    clear_interval_user_logout = setInterval(function () {
                      if(logoutTimeText != 0) { //if not ZERo then countdown
                        displayLogoutTime.text(logoutTimeText--);
                      } else {
                        displayLogoutTime.text("0"); //else hold ZERO value
                      }
                    }, 1000);
                    /*set values to see in terminal*/
                      terminalUserKey.text(current_user.id+" "+current_user.key_type);
                      terminalUserName.text(current_user.user.username);
                      terminalUserHours.text(current_user.user.hours_this_month.toFixed(2)+' Hours');
                      terminalUserStatus.text(status_string);
                    clearInterval(cancel_timer_wrongKey); //must be cleared
                    switch(current_user.user.last_swipe.swipe_type){
                      case "IN" : terminal.btnShowAfterIN();  break;
                      case "OUT": terminal.btnShowIN();       break;
                      case "OBR": terminal.btnShowBreakRet(); break;
                      case "FBR": terminal.btnShowAfterIN();  break;
                      case "OTR": terminal.btnShowTripRet();  break;
                      case "FTR": terminal.btnShowAfterIN();  break;
                      case undefined: terminal.btnShowIN();   break;
                    default: console.log("Error default");    break;
                  }
                  //this timeout loggsout current user
                    cancel_timer_logout = setTimeout(function() {
                        logOut(); //logout - only as screen
                        keysFromServer.unloadUser(); //unload loaded user
                        setInterval(clear_Interval_loadAll);
                        clearTimeout(cancel_timer_wrongKey); //clear timeout for wrong key message
                     },(logoutTime+1.5)*1000) //logout in logout time + 1.5 sec - to show logout message
                }
                else {
                    current_user = undefined;
                    console.log("Wrong key!");
                    terminalInfoText.text("Wrong Key!");
                    cancel_timer_wrongKey = setTimeout(function () {
                      clearTimeout(cancel_timer_logout);
                      clearInterval(clear_interval_user_logout);
                      logoutTimeText = logoutTime; //reset to initial value
                      terminal.SystemCodeScan();
                      displayLogoutTime.text(logoutTimeText);
                    }, textDisplayDelay*1000);
                }
            }
            else{
                //alert("Server is offline. Use pen and paper :)");
                alert("Server is offline. Something is wrong, please contact administrators");
            }

        },
        getUser: function(){return current_user;},
        unloadUser: function(){
            current_user = undefined;
            userIsLoaded = false;
              console.log("user is loaded:" +userIsLoaded);
            clearTimeout(cancel_timer_logout);
            clearTimeout(cancel_timer_wrongKey);
            clearInterval(clear_interval_user_logout);
            logoutTimeText = logoutTime; //reset to initial value
            displayLogoutTime.text(logoutTimeText);
        }
    }

}();
keysFromServer.loadAll(false);//initial call, just load all keys on startup

clear_Interval_loadAll = setInterval(function () {
  if(!userIsLoaded) { //refresh keylist
    keysFromServer.loadAll(false);
      console.warn("Starting to load database");
  } else { //or nothing
      console.warn("Autoload of terminal is disabled");
  }
}, loadKeysIntervalTime*1000);


/* Loading keycodes from local reader
 */
var keyCodeReader = function (){
    key = ""; //current key
    currently_scanned_key = ""; //
    CR_SYMBOL = 13;
    return{
        //we call this, if any key was pressed (RFID reader is just keyboard)
        pressed : function (keycode){
            pressed_key = keycode.keyCode;
            if(pressed_key === CR_SYMBOL){
              terminalInfoText.text("Verifying key...");
                key = currently_scanned_key;
                console.log("Swiped key: " +key);
                /*
                If auto keys load time will be larger, this must be
                called only for one user, not for all
                */
                //keysFromServer.loadAll(true);//load keys and current user
                keysFromServer.loadUser(key);
                currently_scanned_key = "";
            }
            else{
                currently_scanned_key =
                    currently_scanned_key.concat(String.fromCharCode(pressed_key));
            }
        },
        getCurrentKeyCode: function(){return key;},
    }
}();
document.addEventListener("keydown",keyCodeReader.pressed); //if any key is pressed

function swipeSender(swipe_type){
    URL = settings.URL + '/api/swipes/';
    var date = new Date();
    var current_user = keysFromServer.getUser();
    terminalButtonsInfoText.text("Posting Swipe");
    if(current_user != undefined){
        var options = {
            uri : URL,
            method: 'POST',
            json: {
                    "user":keysFromServer.getUser().user.id,
                    "swipe_type":swipe_type,
                    "datetime": date.toISOString(),

            },
            headers:{"Authorization": "Token " + settings.TOKEN},
        };
        request(options, function (error, response, body) {
          if (!error && response.statusCode == 201) {
            console.log(body.id + " " + body.swipe_type + " "
            + body.user + " " + body.datetime) // Print the shortened url.
            updateSwipeList();
            keysFromServer.loadAll(false);
          }
          else{
            alert("Can't post swipe. Server is Offline. Use pen and paper :)");
          }
        });
    }
    else{
        alert("Scan Key First! User undefined...");
    }
}

//Just buttons actions
$('#btnIN').on('click', function(){
    clearTimeout(cancel_timer_logout);
    swipeSender("IN");
    keysFromServer.unloadUser();
});
$('#btnOUT').on('click', function(){
    clearTimeout(cancel_timer_logout);
    swipeSender("OUT");
    keysFromServer.unloadUser();
});
$('#btnBREAK').on('click', function(){
    clearTimeout(cancel_timer_logout);
    swipeSender("OBR");
    keysFromServer.unloadUser();
});
$('#btnBREAKOUT').on('click', function(){
    clearTimeout(cancel_timer_logout);
    swipeSender("FBR");
    keysFromServer.unloadUser();
});
$('#btnTRIP').on('click', function(){
    clearTimeout(cancel_timer_logout);
    swipeSender("OTR");
    keysFromServer.unloadUser();
});
$('#btnTRIPOUT').on('click', function(){
    clearTimeout(cancel_timer_logout);
    swipeSender("FTR");
    keysFromServer.unloadUser();
});
$('#btnEXIT').on('click', function(){ //bad, use OVIs original
  clearTimeout(cancel_timer_logout);
  clearTimeout(cancel_timer_wrongKey);
  keysFromServer.unloadUser();
  terminal.SystemCodeScan();
});

//mamages different user work-statuses
function getLastActionString(shorcut){
    switch(shorcut){
        case "IN":    return "At Work";       break;
        case "OUT":   return "Out of Work";   break;
        case "OBR":   return "On Break";      break;
        case "FBR":   return "At Work";       break;
        case "OTR":   return "On Work Trip";  break;
        case "FTR":   return "At Work";       break;
    }
}
//manages different swipe images (fontawesome icons)
function getSwipeTypeIcon(swipe_type){ //Update swipe icons depended on swipe type
    switch(swipe_type){
        case "IN":    return "fa-sign-in";       break;
        case "OUT":   return "fa-sign-out";      break;
        case "OBR":   return "fa-coffee";        break;
        case "FBR":   return "fa-clock-o";       break;
        case "OTR":   return "fa-suitcase";      break;
        case "FTR":   return "fa-share-square";  break;
    }
}

//update swipes in sliding left menu list
function updateSwipeList() {
    var weekday = new Array();
    weekday[0]=  "Sun";
    weekday[1] = "Mon";
    weekday[2] = "Tue";
    weekday[3] = "Wed";
    weekday[4] = "Thu";
    weekday[5] = "Fri";
    weekday[6] = "Sat";

    URL = settings.URL + "/api/swipes/"; //read swipes from API
    request({url:URL,headers:{"Authorization": "Token " + settings.TOKEN}}, function (error, response, body) {
        if (!error && response.statusCode == 200) { //if there is an error
            var swipes = JSON.parse(body);
            var date;
            var NUM_OF_SWIPES;
            if(swipes.length < swipelen){
                NUM_OF_SWIPES = swipes.length;
            }
            else{ //if there are more than 12 swipes
                NUM_OF_SWIPES = swipelen;
            }
            var str = "";
            for(i =0; i < NUM_OF_SWIPES; i++){
                date = new Date(swipes[i].datetime);
                hours = date.getHours();
                minutes = date.getMinutes();
                seconds = date.getSeconds();
                if (hours < 10) {hours = "0" + hours;}
                if (minutes < 10) {minutes = "0" + minutes;}
                if (seconds < 10) {seconds = "0" + seconds;}
                image = "<i class='fa "+ getSwipeTypeIcon(swipes[i].swipe_type)+"' >"+"</i>"; //EDIT THIS
                str +=
                "<li>" +
                    image + " " +
                    weekday[date.getDay()]+ " " +
                    hours + ":" + minutes +":" + seconds + " " +
                    getUserName(swipes[i].user) +
                "</li>";
            }
            $(".last-swipes-list").html(str); //render in <ul> based list
        }
    })
}
/*eof DISPLAY SWIPES IN TOGGLE MENU LIST*/
function getUserName(user_id){
    var keys = keysFromServer.getAll();
    if(keys){
        for(var i= 0; i < keys.length; i++){
            if(keys[i].user.id === user_id){
                return keys[i].user.username;
            }
        }
    }
    return 0; //is not expected
}

/*Hides mouse cursor if we are on arm architecture*/
if(process.arch == "arm"){
    var entirePage = document.querySelectorAll("*");
    for (var i = 0; i < entirePage.length; i++) {
        entirePage[i].style.cursor = "none";
    }
}

//logout function
function logOut(){
    terminalButtonsInfoText.text('Logging out...');
    setTimeout(function(){
        terminal.SystemCodeScan();
    },500)
}

/*MODULES*/
if(settings.WEATHER_MODULE_ENABLED) {
  var getWeatherInfo = function() {
    var weather = require('weather-js');
    const weatherBlockTempText = [
      $('.weather-block .icon i'),
      $('.weather-block .text'),
      $('.weather-block .location')
    ];

    const city = settings.CITY;
    const country = settings.COUNTRY;
    const temperatureUnit = settings.UNIT;

    weather.find({
      search: city,
      degreeType: temperatureUnit
      }, function(err, result) {
          if(err) {
            console.log(err);
          } else {
            console.info("Weather was updated");
            var temperature = (result[0].current.temperature);
            var feelslike = (result[0].current.feelslike);
            var region = (result[0].location.name);
            var skycode = (result[0].current.skycode);
            var skytext = (result[0].current.skytext);
            console.log(skytext);
            switch(skytext){
                case "Clear"        :    skytext = "wi-horizon-alt"; break;
                case "Cloudy"       :    skytext = "wi-cloudy"; break;
                case "Sunny"        :    skytext = "wi-day-sunny"; break;
                case "Snow"         :    skytext = "wi-day-snow"; break;
                case "Thunderstorm" :    skytext = "wi-thunderstorm"; break;
                case "Rain"         :    skytext = "wi-day-sleet"; break;
                case "Showers"      :    skytext = "wi-showers"; break;
                case "Rain Showers" :    skytext = "wi-showers"; break;
                case "Windy"        :    skytext = "wi-day-windy"; break;
                default             :    skytext = "wi-thermometer"; break;
            }
            weatherBlockTempText[0].addClass(skytext);
            weatherBlockTempText[1].text(temperature +" °C" );
            weatherBlockTempText[2].text(region);
          }
        }
      );
    }
  getWeatherInfo(); //initial call
  clear_Interval_getWeatherInfo = setInterval(function () {
    console.info("Repeating getWeatherInfo every: "+settings.WEATHER_REFRESH_TIME_SEC+" seconds");
    getWeatherInfo(); //call this function frequentelly
  }, settings.WEATHER_REFRESH_TIME_SEC*1000); //how often depends on settings
} else {
  clearInterval(clear_Interval_getWeatherInfo);
  $('.subblock-center .weather-block').hide();
  $('.subblock-center .info-block').css('width', '100%');
}
