/*
    author:     FSI Yudai ISHII
*/

(function(global, $) {
    "use strict";
    $(function() {
        loadFFLSideBarConfigJs();
    });
}(this, jQuery));

var getFFLPostMessage = function() {
    // 親フレームからのツールバー選択状態情報の受信
    $(window).on('message', function(_evt) {
        var arParam = _evt.originalEvent.data.split("[,]");
        if (arParam[0] === "FFLCOM_GET_SIDEBAR_CONFIG"){
            window.parent.postMessage("FFLCOM_POST_SIDEBAR_CONFIG"+"[,]"+JSON.stringify(userApp_sidebar_config),"*");
        }
    });
};

var loadFFLSideBarConfigJs = function() {
    
    var done = false;
    var head = document.getElementsByTagName('head')[0];
    var jsFile = "./js/userApp_sidebar_config.js";
    var script = document.createElement("script");
    var type = "text/javascript";
    script.setAttribute("src", jsFile);
    script.setAttribute("type", type);
    head.appendChild(script);
    script.onload = script.onreadystatechange = function() {
        if ( !done && (!this.readyState ||
                this.readyState === "loaded" || this.readyState === "complete") ) {
            done = true;
            script.onload = script.onreadystatechange = null;
            getFFLPostMessage();
            window.parent.postMessage("FFLCOM_USERAPP_ON_READY","*");

            if ( head && script.parentNode ) {
                head.removeChild( script );
            }
        }
    };
    
};
