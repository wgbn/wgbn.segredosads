var app = {
    initialize: function() {
        this.bindEvents();
    },

    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        document.addEventListener('offline', this.onOffline, false);
        document.addEventListener('online', this.onOnline, false);
    },

    onDeviceReady: function() {
        app.receivedEvent('deviceready');
        
        // bloqueia backbutton
        document.addEventListener("backbutton", function(){
            var _atual = $(":mobile-pagecontainer").pagecontainer("getActivePage")[0].id;
            
            if (_atual == 'novo'){
                $(":mobile-pagecontainer").pagecontainer("change","#index");
            }
            
            if (_atual == 'comentarios'){
                $("#com_titulo, #com_texto, #com_comentarios").html("");
                $("#comentario").val("");
                $(":mobile-pagecontainer").pagecontainer("change","#index");
            }
            
            if (_atual == 'index'){
                if (device.platform == 'android' || device.platform == 'Android'){
                    navigator.app.exitApp();
                } else {
                    return true;
                }
            }
        
        }, false);
        
        // verifica o GCM
        var pushNotification;
        
        try {
            pushNotification = window.plugins.pushNotification;

            if (device.platform == 'android' || device.platform == 'Android'){
                pushNotification.register(
                    successHandler,
                    errorHandler, {
                        "senderID":"722199053079",
                        "ecb":"onNotificationGCM"
                    });
            }
        } catch(e){
            toast("push notification não suportado");
        }
        
    },
    onOffline: function(){
        $.conecta = 0;
    },
    onOnline: function(){
        //checkConnection();
        $.conecta = 1;
    },
    receivedEvent: function(id) {
        
    }
};

// funcoes GCM
function successHandler(result) {
    console.log('## GCM: result = ' + result);
}
function errorHandler(error) {
    console.log('## GCM: error = ' + error);
}

// Android receive GCM
function onNotificationGCM(e) {
    console.log('## GCM: EVENT -> RECEIVED:' + e.event);

    switch( e.event )
    {
    case 'registered':
        if ( e.regid.length > 0 )
        {
            console.log("## GCM: regID = " + e.regid);
            $.token = e.regid;
            localStorage.setItem('token',e.regid);
            atualizaToken(e.regid);
        }
    break;

    case 'message':
        if ( e.foreground ) {
            console.log('## GCM: INLINE NOTIFICATION--');

            atualizaSegredos();
            if (e.payload.tipo == 'segredo'){
                toast("Há um novo segredo de ADS, confira!");
            } else {
                toast("Comentaram um de seus segredos");
            }
                      
        } else {
            if ( e.coldstart ){
                console.log('## GCM: COLDSTART NOTIFICATION--');
            } else {
                console.log('## GCM: BACKGROUND NOTIFICATION--');
            }
        }

        $.atualiza = 1;
        console.log('## GCM: MSG = '+e.payload.message);
    break;

    case 'error':
        console.log('## GCM: ERROR -> MSG:' + e.msg);
    break;

    default:
        console.log('## GCM: EVENT -> Unknown, an event was received and we do not know what it is');
    break;
  }
}


/*
 * ###############################
 * ## carrega a qualquer pagina ##
 * ###############################
 */
$(document).one("pageshow", function() {
    $.support.cors = true; // libera acesso de outros hosts (pode nao funcionar)
    $.mobile.allowCrossDomainPages = true; // libera acesso de outros hosts (pode nao funcionar)
    $.mobile.ajaxEnabled = true; // desativa a navegacao padra ajax do jquerymobile
    $.mobile.defaultPageTransition = 'slide';
    
    // variaveis
    $.token = localStorage.getItem('token'); //console.log("token: "+$.token);
    $.sexo = localStorage.getItem('sexo'); //console.log("sexo: "+$.sexo);
    $.idade = localStorage.getItem('idade'); //console.log("idade: "+$.idade);
    $.mongoId = localStorage.getItem('mongoid'); //console.log("mongoid: "+$.mongoId);
    
    $.url = "http://segredosads-wgbn.rhcloud.com/";
    $.conecta = 1;
    $.atualiza = 1;
});

$(document).ready(function(){
    window.setTimeout(function(e){
        if (!$.mongoId){
            $(":mobile-pagecontainer").pagecontainer("change","#primeira");
        }
    }, 500);
});

/*
 * ##################
 * ## pagina index ##
 * ##################
 */
$(document).delegate("#index", "pageinit", function() {
    /*$("#index .menui").click(function(){
        $("#menuu").panel("open");
    });*/
    
    $(".atualiza").click(function(){
        $.atualiza = 1;
        atualizaSegredos();
    });
    
    $("body").on('click','.btnCurtir', function(){
        var _cur = parseInt($(this).attr('data-curtida'));
        var _uid = $(this).attr('data-uid');
        
        _cur++;
        
        if ($.conecta){
            // altera
            $("#cur_"+_uid).html(_cur);
            
            $.ajax({
                url: $.url+"api.mongo.php",
                type: 'post',
                dataType: 'json',
                crossDomain : true,
                xhrFields: {
                    withCredentials: true
                },
                data: {func: 'curtir', uid: _uid, curtidas: _cur},
                success: function(res){
                    if (parseInt(res.status) == 1){
                        toast("Você curtiu isto");
                    } else {
                        _cur--;
                        $("#cur_"+_uid).html(_cur);
                        toast("Sua curtida não foi registrada");
                    }
                },
                error: function(){
                    _cur--;
                    $("#cur_"+_uid).html(_cur);
                    toast("Não foi possível contactar o servidor.");
                }
            });
        } else {
            toast("Você precisa estar conectado a internet");
        }
    });
    
    $("body").on('click','.btnComentar', function(){
        var _uid = $(this).attr('data-uid');
        var _tit = $("#tit_"+_uid).html();
        var _txt = $("#txt_"+_uid).html();
        var _tok = $(this).attr('data-token');
        
        $(":mobile-pagecontainer").pagecontainer("change","#comentarios");
        
        window.setTimeout(function(){
            $("#com_titulo").html(_tit);
            $("#com_texto").html(_txt);
            $("#com_uid").val(_uid);
            $("#com_token").val(_tok);
            atualizaComentarios(_uid);
        }, 500);
    });
});
// on show
$(document).delegate("#index", "pageshow", function() {
    window.setTimeout(function(e){
        atualizaSegredos();
    }, 500);
});

/*
 * #################
 * ## pagina novo ##
 * #################
 */
$(document).delegate("#novo", "pageinit", function() {    
    $("#novo .menui").click(function(){
        $(":mobile-pagecontainer").pagecontainer("change","#index");
    });
    
    $(".btnEnviarSegredo").click(function(){
        var _seg = $("#seusegredo").val();
        var _dt = new Date();
        
        if ($.conecta){
            if (_seg.length > 0){
                verLoader("Enviando...");
                
                $.ajax({
                    url: $.url+"api.mongo.php",
                    type: 'post',
                    dataType: 'json',
                    crossDomain : true,
                    xhrFields: {
                        withCredentials: true
                    },
                    data: {func: 'novosegredo', segredo: _seg, registro: _dt.getTime(), sexo: $.sexo, idade: $.idade, token: $.token},
                    success: function(res){
                        tiraLoader();
                        
                        if (parseInt(res.status) == 1){
                            $(":mobile-pagecontainer").pagecontainer("change","#index");
                        } else {
                            toast("Um erro ocorreu no servidor,\ntente novamente mais tarde.");
                            //$("#listaSegredos").html("<pre>"+res.err+"</pre><pre>"+res.ok+"</pre>");
                        }
                    },
                    error: function(){
                        tiraLoader();
                        toast("Não foi possível contactar o servidor.");
                    }
                });
            } else {
                toast("Você deve escrever algum segredo.");
            }
        } else {
            toast("Você precisa estar conectado a internet");
        }
    });
});
// onshow
$(document).delegate("#novo", "pageshow", function() {    
    $("seusegredo").val("");
});

/*
 * ########################
 * ## pagina comentarios ##
 * ########################
 */
$(document).delegate("#comentarios", "pageinit", function() {    
    $("#comentarios .menui").click(function(){
        $("#com_titulo, #com_texto, #com_comentarios").html("");
        $("#comentario").val("");
        $(":mobile-pagecontainer").pagecontainer("change","#index");
    });
    
    $(".btnEnviarComentario").click(function(){
        var _uid = $("#com_uid").val();
        var _comenta = $("#comentario").val();
        var _tok = $("#com_token").val();
        
        if ($.conecta){
            if (_comenta.length > 0){
                verLoader("Comentando...");
                
                $.ajax({
                    url: $.url+"api.mongo.php",
                    type: 'post',
                    dataType: 'json',
                    crossDomain : true,
                    xhrFields: {
                        withCredentials: true
                    },
                    data: {func: 'comenta', uid: _uid, comentario: _comenta, sexo: $.sexo, idade: $.idade, token: _tok},
                    success: function(res){
                        tiraLoader();
                        
                        if (parseInt(res.status) == 1){
                            $("#comentario").val("");
                            atualizaComentarios(_uid);
                            $.atualiza = 1;
                        } else {
                            toast("Ocorreu um erro ao comentar\nTente novamente mais tarde.");
                        }
                        
                    },
                    error: function(){
                        tiraLoader();
                        toast("Não foi possível contactar o servidor.");
                    }
                });
            } else {
                toast("Você deve escrever algum comentário.");
            }
        } else {
            toast("Você precisa estar conectado a internet");
        }
    });
});

/*
 * #####################
 * ## pagina primeiro ##
 * #####################
 */
$(document).delegate("#primeira", "pageinit", function() {
    $(".rdSexo").click(function(){
        localStorage.setItem('sexo',$(this).val());
        $.sexo = localStorage.getItem('sexo');
    });
    $(".rdIdade").click(function(){
        localStorage.setItem('idade',$(this).val());
        $.idade = localStorage.getItem('idade');
    });
    
    $(".btnIniciar").click(function(){
        if ($.conecta){
            verLoader("Registrando...");
            
            //toast("sexo: "+$.sexo+"\nidade: "+$.idade+"\ntoken: "+$.token);
            
            $.ajax({
                url: $.url+"api.mongo.php",
                type: 'post',
                dataType: 'json',
                crossDomain : true,
                xhrFields: {
                    withCredentials: true
                },
                data: {func: 'registra', sexo: $.sexo, idade: $.idade, token: $.token},
                success: function(res){
                    tiraLoader();
                    if (parseInt(res.status) == 1){
                        console.log(res.mongoid);
                        localStorage.setItem('mongoid', res.mongoid);
                        $.mongoId = localStorage.getItem('mongoid');
                        
                        $(":mobile-pagecontainer").pagecontainer("change","#index");
                    } else {
                        toast("Um erro ocorreu no servidor,\ntente novamente mais tarde.");
                    }
                },
                error: function(){
                    tiraLoader();
                    toast("Não foi possível contactar o servidor.");
                }
            });
        } else {
            toast("Você precisa estar conectado a internt.");
        }
    });
});

/*
 * ######################
 * ### Demais funcoes ###
 * ######################
 */
function alertDismissed() {
    // nada
}

function checkConnection() {
    var networkState = navigator.connection.type;

    var states = {};
    states[Connection.UNKNOWN]  = 'Unknown connection';
    states[Connection.ETHERNET] = 'Ethernet connection';
    states[Connection.WIFI]     = 'WiFi connection';
    states[Connection.CELL_2G]  = 'Cell 2G connection';
    states[Connection.CELL_3G]  = 'Cell 3G connection';
    states[Connection.CELL_4G]  = 'Cell 4G connection';
    states[Connection.CELL]     = 'Cell generic connection';
    states[Connection.NONE]     = 'No network connection';

    alert('Connection type: ' + states[networkState]);
}

// desativa o loader
function tiraLoader(){
    // loading
    $.mobile.loading('hide');
    $("div[data-role='page']").removeClass('ui-disabled');
}

// ativa loading
function verLoader(_texto){
    // loading
    $.mobile.loading("show", {
        text: _texto,
        textVisible: true,
        theme: "a",
        html: "",
        textonly: true
    });
    $("div[data-role='page']").addClass('ui-disabled');
}

// toast
function toast(msg){
    try {
        window.plugins.toast.showLongBottom(msg);
    } catch(e){
        alert(msg);
    }
}

// atualiza lista de segredos
function atualizaSegredos(){
    console.log("## atualizaSegredos()");
    
    if ($.atualiza){
        if ($.conecta){
            // limpa pagina
            $("#listaSegredos").html("");

            // exibe loading
            $("#index #carrega").show();

            // carrega
            $.ajax({
                url: $.url+"api.mongo.php",
                type: "post",
                dataType: "json",
                crossDomain : true,
                xhrFields: {
                    withCredentials: true
                },
                data: {func: 'lista'},
                success: function(res){
                    $("#carrega").hide();

                    if (parseInt(res.status) == 1){
                        var _l = '';

                        $.each(res.segredos, function(_k,_v){
                            //_l += '<ul data-role="listview" data-theme="a" class="lista">'; //data-inset="true"
                            _l += '<ul data-role="listview" data-inset="true" data-corners="false" class="lista">';
                                _l += '<li class="titulo-segredo" id="tit_'+_v._id+'">'+_v.sexo+' ('+_v.idade+' anos)</li>';
                                _l += '<li class="segredo" id="txt_'+_v._id+'"><span style="font-style: italic; display: block; font-size: .8em;">'+_v.registro+'</span>'+_v.segredo+'</li>';
                                _l += '<li class="opcoes">';
                                    _l += '<div class="ui-grid-a texto-menor">';
                                        _l += '<div class="ui-block-a borda-dir"><a href="#" class="btnCurtir" data-curtida="'+_v.curtidas+'" data-uid="'+_v._id+'"><span id="cur_'+_v._id+'">'+_v.curtidas+'</span> <img src="img/curtir.png"></a></div>';
                                        _l += '<div class="ui-block-b"><a href="#" class="btnComentar" data-comenta="'+(_v.comentadas == undefined ? 0 : _v.comentadas)+'" data-uid="'+_v._id+'" data-token="'+_v.token+'"><span id="com_'+_v._id+'">'+(_v.comentadas == undefined ? 0 : _v.comentadas)+'</span> <img src="img/comenta.png"></a></div>';
                                    _l += '</div>';
                                _l += '</li>';
                            _l += '</ul>';
                        });

                        $("#listaSegredos").html(_l);
                        $(".lista").listview();
                    } else {
                        toast("Um erro ocorreu no servidor,\ntente novamente mais tarde.");
                    }
                },
                error: function(jqXHR, textStatus, errorThrown){
                    //$("#listaSegredos").html("jqXHR: "+jqXHR+"<br>textStatus: "+textStatus+"<br>errorThrown: "+errorThrown);
                    $("#carrega").hide();
                    toast("Não foi possível contactar o servidor.");
                }
            });
        } else {
            toast("Você não está conectado a internet.");
            console.log("## atualizaSegredos() = Você não está conectado a internet.");addEventListener
        }
        
        $.atualiza = 0;
    }
}

// atualiza o token
function atualizaToken(reg){
    if ($.conecta && $.mongoId != null){
        $.ajax({
            url: $.url+"api.mongo.php",
            type: 'post',
            dataType: 'json',
            crossDomain : true,
            xhrFields: {
                withCredentials: true
            },
            data: {func: 'token', token: reg, uid: $.mongoId},
            success: function(){
                
            },
            error: function(){
                
            }
        });
    }
}

// atualiza comentarios
function atualizaComentarios(_uid){
    if ($.conecta){
        // exibe loading
        $("#comentarios #carrega").show();
        
        $.ajax({
            url: $.url+"api.mongo.php",
            type: 'post',
            dataType: 'json',
            crossDomain : true,
            xhrFields: {
                withCredentials: true
            },
            data: {func: 'comentarios', uid: _uid},
            success: function(res){
                $("#comentarios #carrega").hide();
                
                if (parseInt(res.status) == 1){
                    var _l = '';
                    if (res.comentarios != undefined){
                        //console.log(res.comentarios);
                        $.each(res.comentarios, function(_k,_v){ //console.log(_v);
                            _l += '<li class="segredo">'+_v.comentario;
                            _l += '<br><span style="color: #666; font-style: italic; font-size: .7em;">';
                            _l += _v.sexo+' ('+_v.idade+') - '+_v.registro+'</span>';
                            _l += '</li>';
                        });
                    } else {
                        _l += '<li>Nenhum comentário ainda</li>';
                    }
                    
                    $("#com_comentarios").html(_l);
                    $("#com_comentarios").listview("refresh");
                } else {
                    toast("Um erro ocorreu no servidor,\ntente novamente mais tarde.");
                }
            },
            error: function(){
                $("#comentarios #carrega").hide();
                toast("Não foi possível contactar o servidor.");
            }
        });
    } else {
        toast("Você não está conectado a internet.");
    }
}
