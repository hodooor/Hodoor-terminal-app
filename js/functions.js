/*Look Mom.... I am running jQuery on Electron*/
$(document).ready(function(){
  $('body').ready(function(){
    $('#loader').fadeOut('fast');
    $('#content').fadeIn('slow');
  });

  /*Define variables and constants*/
  var timeoutinterval = 10;

  /*auto-clock update*/
  function updateClock() {
    var currentDateTime = new Date(), // current date
        currentTime = currentDateTime.getHours()+":"+
                      (currentDateTime.getMinutes()<10?'0':'')+ //linear if statement
                      currentDateTime.getMinutes()+":"+ //separator :
                      (currentDateTime.getSeconds()<10?'0':'')+
                      currentDateTime.getSeconds();
      $('#block-codescan .time').text(currentTime);
    setTimeout(updateClock, 1000*1); //calback after 1000ms
  }
  /*auto-date update*/
  function updateDate() {
    var currentDateTime = new Date(), // current date
    getDayOfTheWeek = currentDateTime.getDay();
      switch(getDayOfTheWeek){
        case 0: getDayOfTheWeek = "Sun"; break;
        case 1: getDayOfTheWeek = "Mon"; break;
        case 2: getDayOfTheWeek = "Tue"; break;
        case 3: getDayOfTheWeek = "Wed"; break;
        case 4: getDayOfTheWeek = "Thu"; break;
        case 5: getDayOfTheWeek = "Fri"; break;
        case 6: getDayOfTheWeek = "Sat"; break;
      }
    currentDate = getDayOfTheWeek+" "+
                  (currentDateTime.getDate()<10?'0':'')+
                  currentDateTime.getDate()+"."+ //separator .
                  ((currentDateTime.getMonth()+1)<10?'0':'')+
                  (currentDateTime.getMonth()+1)+"."+
                  currentDateTime.getFullYear();
      $('#block-codescan .date').text(currentDate);
    setTimeout(updateDate, 1000*1*60*60); //calback after 60 minutes
  }
  updateClock(); //Update Clock
  updateDate(); //Update Date

  /*Hide/Show functions*/
  /*Initialise - do not display*/
    $('#block-offline').css('display', 'none');
    $('#block-codescan').css('display', 'none');
  /*Hide/Show functions*/
  function SystemOffline() {
    console.log('I am in offline mode');
      $('#block-offline').fadeIn();
  }
  function SystemCodeScan() {
    console.log('I am in code scan mode');
      $('#block-codescan').fadeIn();
      $('#block-codescan .subblock-center-buttons').hide();
      $('#block-codescan .subblock-center').show();
      $('.code-activated').hide();
  }
  var autoLogoutAfter;
  var autoLogoutAfterTimeInterval;
  function SystemCodeOK(autoLogoutAfter) {
    console.log('I am in code scaned DONE mode');
      $('#block-codescan').fadeIn();
      $('#block-codescan .subblock-center').hide();
      $('#block-codescan .subblock-center-buttons').show();
      $('.code-activated').show();
      $('.info-text-inline').hide();
      $('.code-activated').addClass('table-bordered');
      if(autoLogoutAfter != 'none') {
        autoLogoutAfterTimeInterval = setInterval(function () {
          $('.logout-time-text').text(autoLogoutAfter--);
          $('.info-text-inline').show();
          if (autoLogoutAfter == -1) {
            clearInterval(autoLogoutAfterTimeInterval);
            console.log('going to scan mode');
            return SystemCodeScan();
          }
        }, 1000);
      }
  }
  //SystemCodeOK(15);
  SystemCodeScan();

  /*slide-menu for last swipes*/
  var toggleState = 0;
  var HideLastSwipesMenuAfterText = timeoutinterval;
  var TimeOut, TimeInterval;
  function ShowLastSwipesMenu() {
    $('#last-swipes').css('width','350px');
      $('#last-swipes-content').fadeIn('fast');
    $('.arrow-icon').removeClass('fa-arrow-left').addClass('fa-arrow-right');
    TimeInterval = setInterval(function(){
      HideLastSwipesMenuAfterText--;
      $('#hide-last-swipes-after').text(HideLastSwipesMenuAfterText);
    }, 1000*1); //one second interval
  }
  function HideLastSwipesMenu() {
    $('#last-swipes-content').fadeOut('fast');
      $('#last-swipes').css('width','0px');
    $('.arrow-icon').removeClass('fa-arrow-right').addClass('fa-arrow-left');
    clearInterval(TimeInterval);
    HideLastSwipesMenuAfterText = timeoutinterval;
  }
  $('.menu-btn').on('click', function(){
    if(!toggleState) {
        ShowLastSwipesMenu();
        toggleState=1;
        TimeOut = setTimeout(function(){HideLastSwipesMenu();}, 1000*1*timeoutinterval); //n-seconds
    } else {
        HideLastSwipesMenu();
        toggleState=0;
        clearTimeout(TimeOut);
    }
  });
});
