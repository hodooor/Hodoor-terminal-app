
function getSwipeType(swipe_type){
    switch(swipe_type){
        case "IN":
            return "incom";
        case "OUT":
            return "outgo";
        case "OBR":
            return "break";
        case "FBR":
            return "break_ret";
        case "OTR":
            return "trip";
        case "FTR":
            return "trip_ret";
    }
}