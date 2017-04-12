const request = require('request');
const fs = require('fs');
const settings = require("./settings.json"); //for token and url get
const terminal = require('./js/functions.js');
const $ = require('jquery');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const swipelen = 10; //nuber of swipes to see in left sliding list
const logoutTime = 5; //n-sec to automatic user logout and also user unload
const textDisplayDelay = 2; //n-sec to text value hold

//timers
var cancel_timer_logout,
    cancel_timer_wrongKey,
    clear_Interval_loadAll
    ;

/*This is used for set interval of automatic keys loading from server database*/
const loadKeysIntervalTime = 1*60; //set time of keys to load, n*60 = in minutes
var userIsLoaded = false; //if true frequentely load keys
startLoadingKeysInterval(userIsLoaded); //initial call of repeating function

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
//in another mode
const terminalButtonsInfoText = $('.subblock-center-buttons .info-text');
const displayButtonsBlock = $('.subblock-center-buttons');

terminal.loaderOn(); //initial load, run CSS/JS loader inmediately

console.info("repeat startLoadingKeysInterval function after: " +loadKeysIntervalTime/60+" minutes");
console.info("autouserload is every: "+logoutTime+" seconds");

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
                        updateSwipeList();
                    }
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
                    if(row.id === key){
                        return true;
                    }
                    else{
                        return false;
                    }
                });

                var userstring = terminalInfoText;

                if(Object.keys(filtered).length === 1){
                    current_user = filtered[0];
                      console.log("Loaded user: ");
                      console.log(current_user);
                    userstring.text("Key verified");
                    userIsLoaded = true;
                      console.log("user is loaded:" +userIsLoaded);
                    var status_string = getLastActionString(current_user.user.last_swipe.swipe_type);
                    terminal.SystemCodeOK(logoutTime); //call another mode to display buttons
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
                    userstring.text("Wrong Key!");
                    cancel_timer_wrongKey = setTimeout(function () {
                      //terminal.resetAll();
                      clearTimeout(cancel_timer_logout);
                      terminal.SystemCodeScan();
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
              startLoadingKeysInterval(userIsLoaded);
            clearTimeout(cancel_timer_logout);
            clearTimeout(cancel_timer_wrongKey);
        }
    }

}();
keysFromServer.loadAll(false);//initial call, just load all keys on startup

//update keys every minute just to get ONline status
//should be somehow change so we dont have to transmit so often
function startLoadingKeysInterval(userIsLoaded) {
  if(userIsLoaded == false) {
    clear_Interval_loadAll = setInterval(function () {
      keysFromServer.loadAll(false);
      console.log("Starting to load database");
    }, loadKeysIntervalTime*1000);
  } else
  if(userIsLoaded == true){
    clearInterval(clear_Interval_loadAll);
  }
}



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
            //resetAll();
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

/*
function disableAllButtons(){

    BUTTONS = ["incom","outgo","break","break_ret","trip","trip_ret","cancel"];

    for(var i=0; i < BUTTONS.length; i++){
        disableButton(BUTTONS[i]);
    }
}

function enableAllButtons(){
    BUTTONS = ["incom","outgo","break","break_ret","trip","trip_ret","cancel"];
    for(var i=0; i < BUTTONS.length; i++){
        enableButton(BUTTONS[i]);
    }
}

function disableButton(button){
    ICON_PREFIX = "but_";
    ICON_POSTFIX = "_icon";
    DISABLE_OPACITY = 0.2;

    b = document.getElementById(button);
    b.disabled = true;
    i = document.getElementById(ICON_PREFIX+button+ICON_POSTFIX);
    i.style.opacity = DISABLE_OPACITY;
}

function enableButton(button){
    ICON_PREFIX = "but_";
    ICON_POSTFIX = "_icon";
    ENABLE_OPACITY = 1;

    b = document.getElementById(button);
    b.disabled = false;
    i = document.getElementById(ICON_PREFIX+button+ICON_POSTFIX);
    i.style.opacity = ENABLE_OPACITY;
}

function enableButtons(buttons){
    for(var i=0; i < buttons.length; i++){
        enableButton(buttons[i]);
    }
}
disableAllButtons();
*/

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
  //resetAll();
  clearTimeout(cancel_timer_logout);
  clearTimeout(cancel_timer_wrongKey);
  keysFromServer.unloadUser();
  terminal.SystemCodeScan();
});

//mamages different user work-statuses
function getLastActionString(shorcut){
    switch(shorcut){
        case "IN":
            return "At Work";
        case "OUT":
            return "Out of Work";
        case "OBR":
            return "On Break";
        case "FBR":
            return "At Work";
        case "OTR":
            return "On Work Trip";
        case "FTR":
            return "At Work";
    }
}

//manages different swipe images (fontawesome icons)
function getSwipeType(swipe_type){ //Update swipe icons depended on swipe type
    switch(swipe_type){
        case "IN":
            return "fa-sign-in";
        case "OUT":
            return "fa-sign-out";
        case "OBR":
            return "fa-coffee";
        case "FBR":
            return "fa-clock-o";
        case "OTR":
            return "fa-suitcase";
        case "FTR":
            return "fa-share-square";
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
                image = "<i class='fa "+ getSwipeType(swipes[i].swipe_type)+"' >"+"</i>"; //EDIT THIS
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
                return keys[i].user.username
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

//load server settings to element
$(".server-url").text(settings.URL.split("//")[1]);

//logout function
function logOut(){
    terminalButtonsInfoText.text('Logging out...');
    setTimeout(function(){
        //resetAll();
        terminal.SystemCodeScan();
    },500)
}
