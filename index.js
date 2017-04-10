var request = require('request');
const fs = require('fs');
var settings = require("./settings.json"); //for token and url get
let terminal = require('./js/functions.js');
var $ = require('jquery');

/*Buttons deppends on last swipe type*/
//PPR button logic - jaky swipe kdy

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var cancel_timer;

var terminalServerUrl = $('.subblock-top .server-url');
var terminalServerStatus = $('.subblock-top .server-status');

var terminalInfoText = $('.subblock-center .info-text');
var terminalUserName = $('.subblock-top .user');
var terminalUserKey= $('.subblock-top .key');

var terminalUserStatus = $('.subblock-top .user-status');
var terminalUserHours = $('.subblock-top .user-hours');

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
            URL = settings.URL + "/api/keys/";
            request({url:URL,headers:{"Authorization": "Token " + settings.TOKEN}},
                function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        user_keys = JSON.parse(body);
                        console.log("User keys loaded from server " + URL );
                        terminal.SystemCodeScan();
                        updateSwipeList();
                    }
                    else{
                        console.log(body)
                        console.log(error)
                        terminal.SystemOffline();
                    }
                    //calls all users on log
                    console.log("User keys are: ");
                    console.log(that.getAll());

                    if(loaduser){ // if we want to, we can loaduser immediately
                        that.loadUser(keyCodeReader.getCurrentKeyCode());
                    }
                    $('.server-status').text('online');
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
                    console.log("Loaded user: "); //PPR
                    console.log(current_user); //PPR
                    userstring.text("Key Verified");
                    userstring.css('color',"#1FD26A");
                    var status_string = getLastActionString(current_user.user.last_swipe.swipe_type);
                    if(status_string === "At Work"){ //PPR
                        //document.getElementById("status").style.color = "#1FD26A"; //PPR
                    }
                    else
                    {
                        //document.getElementById("status").style.color = "#EC3F8C"; //PPR
                    }
                    terminal.SystemCodeOK('none'); //call another mode
                    /*set values to see in terminal*/
                    terminalUserKey.text(current_user.id+" "+current_user.key_type);
                    terminalUserName.text(current_user.user.username);
                    terminalUserHours.text(current_user.user.hours_this_month.toFixed(2)+' Hours');
                    terminalUserStatus.text(status_string);

                    //disableAllButtons(); //PPR  - nahradit strukturou skryvania buttons new
/*
                    switch(current_user.user.last_swipe.swipe_type){
                    case "IN":
                        enableButtons(IN_BUTTONS); //PPR tady jen if tak visible
                    break;

                    case "OUT":
                        enableButtons(OUT_BUTTONS);
                    break;

                    case "OBR":
                        enableButtons(BREAK_BUTTONS);
                    break;

                    case "FBR":
                        enableButtons(BREAK_RET_BUTTONS);
                    break;

                    case "OTR":
                        enableButtons(TRIP_BUTTONS);
                    break;

                    case "FTR":
                        enableButtons(TRIP_RET_BUTTONS);
                    break;
                    case undefined: //probably first swipe
                        enableButtons(OUT_BUTTONS);
                    break;
                    default:
                        console.log("Error default")
                    break;
                  }*/
                    cancel_timer = setTimeout(function(){ //PPR - return SystemCodeScan
                            logOut();
                        },10000 //PPR  after 10sec - nastavim promennou
                    )
                }
                else{ //PPR - zmenit pote cele
                    current_user = undefined;
                    console.log("Wrong key!");
                    userstring.innerHTML = "Wrong Key!";
                    userstring.style.color = "#EC3F8C"
                    document.getElementById("name").style.visibility = "hidden";
                    document.getElementById("status").style.visibility = "hidden";
                    document.getElementById("keynumber").style.visibility = "hidden";
                    document.getElementById("hours_this_month").style.visibility = "hidden";
                    disableAllButtons();
                }
            }
            else{
                alert("Server is offline. Use pen and paper :)")
            }

        },
        getUser: function(){return current_user;},
        unloadUser: function(){
            current_user = undefined;
            document.getElementById("userstring").innerHTML = "Scan your key..."; //PPR zmenit na celou fci
            document.getElementById("userstring").style.color = "#FAF9F4"; //PPR zmenit na celou fci
        }
    }

}();
keysFromServer.loadAll(false);//initial call, just load all keys on startup

//update keys every minute just to get ONline status
//should be somehow change so we dont have to transmit so often
setInterval('keysFromServer.loadAll(false)', 60000); //PPR 60sec keyinterval, jen pro update keys

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
document.addEventListener("keydown",keyCodeReader.pressed)

function swipeSender(swipe_type){
    URL = settings.URL + '/api/swipes/';
    var date = new Date();
    var current_user = keysFromServer.getUser();
    document.getElementById("userstring").innerHTML = "Posting Swipe";
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


document.getElementById('incom').addEventListener('click', function(){
    clearTimeout(cancel_timer);
    swipeSender("IN");
    disableAllButtons();
    document.getElementById("name").style.visibility = "hidden";
    document.getElementById("status").style.visibility = "hidden";
    document.getElementById("keynumber").style.visibility = "hidden";
    document.getElementById("hours_this_month").style.visibility = "hidden";
    keysFromServer.unloadUser();
}, false);
document.getElementById('outgo').addEventListener('click', function(){
    clearTimeout(cancel_timer);
    swipeSender("OUT");
    disableAllButtons();
    document.getElementById("name").style.visibility = "hidden";
    document.getElementById("status").style.visibility = "hidden";
    document.getElementById("keynumber").style.visibility = "hidden";
    document.getElementById("hours_this_month").style.visibility = "hidden";
    keysFromServer.unloadUser();
}, false);
document.getElementById('break').addEventListener('click', function(){
    clearTimeout(cancel_timer);
    swipeSender("OBR");
    disableAllButtons();
    document.getElementById("name").style.visibility = "hidden";
    document.getElementById("status").style.visibility = "hidden";
    document.getElementById("keynumber").style.visibility = "hidden";
    document.getElementById("hours_this_month").style.visibility = "hidden";
    keysFromServer.unloadUser();
}, false);
document.getElementById('break_ret').addEventListener('click', function(){
    clearTimeout(cancel_timer);
    swipeSender("FBR");
    disableAllButtons();
    document.getElementById("name").style.visibility = "hidden";
    document.getElementById("status").style.visibility = "hidden";
    document.getElementById("keynumber").style.visibility = "hidden";
    document.getElementById("hours_this_month").style.visibility = "hidden";
    keysFromServer.unloadUser();
}, false);
document.getElementById('trip').addEventListener('click', function(){
    clearTimeout(cancel_timer);
    swipeSender("OTR");
    disableAllButtons();
    document.getElementById("name").style.visibility = "hidden";
    document.getElementById("status").style.visibility = "hidden";
    document.getElementById("keynumber").style.visibility = "hidden";
    document.getElementById("hours_this_month").style.visibility = "hidden";
    keysFromServer.unloadUser();
}, false);
document.getElementById('trip_ret').addEventListener('click', function(){
    clearTimeout(cancel_timer);
    swipeSender("FTR");
    disableAllButtons();
    document.getElementById("name").style.visibility = "hidden";
    document.getElementById("status").style.visibility = "hidden";
    document.getElementById("keynumber").style.visibility = "hidden";
    document.getElementById("hours_this_month").style.visibility = "hidden";
    keysFromServer.unloadUser();
}, false);

document.getElementById('cancel').addEventListener('click', function(){
    clearTimeout(cancel_timer);
    disableAllButtons();
    keysFromServer.unloadUser();
    document.getElementById("name").style.visibility = "hidden";
    document.getElementById("status").style.visibility = "hidden";
    document.getElementById("keynumber").style.visibility = "hidden";
    document.getElementById("hours_this_month").style.visibility = "hidden";
}, false);



*/
/*
function updateClock() {
    // Gets the current time
    var now = new Date();
    var d = new Date();
    var weekday = new Array(7);
    weekday[0]=  "Sun";
    weekday[1] = "Mon";
    weekday[2] = "Tue";
    weekday[3] = "Wed";
    weekday[4] = "Thu";
    weekday[5] = "Fri";
    weekday[6] = "Sat";

    var wday = weekday[d.getDay()];
    // Get the hours, minutes and seconds from the current time
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var seconds = now.getSeconds();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var year = now.getFullYear();
    // Format hours, minutes and seconds
    if (hours < 10) {
        hours = "0" + hours;
    }
    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    if (seconds < 10) {
        seconds = "0" + seconds;
    }

    // Gets the element we want to inject the clock into
    var time = document.getElementById('clock');
    var date = document.getElementById('date');

    // Sets the elements inner HTML value to our clock data
    time.innerHTML = hours + ':' + minutes + ':' + seconds;
    date.innerHTML = wday + '  ' + day + "." + month + "." + year;
}
*/

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

// This function gets the current time and injects it into the DOM
//setInterval('updateClock()', 200);

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
            var swipelen = 10;
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

function logOut(){
    document.getElementById("userstring").innerHTML = "Logging out...";
    document.getElementById("userstring").style.color = "#FAF9F4";
    disableAllButtons();
    setTimeout(function(){
        enableButton("cancel")
        document.getElementById('cancel').click();
    },500
    )
}
