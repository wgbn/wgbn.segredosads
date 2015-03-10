<?php
$mongo = new MongoClient('mongodb://localhost:27017/segredos');
$db = $mongo->segredos;
$clientes = $db->clientes;
$segredos = $db->segredos;

date_default_timezone_set('America/Bahia');

if (isset($_POST['func'])){
    $out = array();
    
    // escolhe a funcao
    switch ($_POST['func']) {
        case 'registra':
            $pre = $clientes->find(array('token' => $_POST['token']))->limit(1);
            $tot = 0; foreach($pre as $p){ $tot++; }
            
            if ($tot == 0){
                $ok = $clientes->insert(array('sexo' => (int)$_POST['sexo'] ,'idade' => (int)$_POST['idade'], 'notifica' => 1, 'token' => $_POST['token']));

                if ($ok['ok'] == 1){
                    $out['status'] = 1;
                    $res = $clientes->find()->sort(array('_id' => -1))->limit(1);
                    foreach($res as $r){
                        $out['mongoid'] = "{$r['_id']}";
                    }
                } else {
                    $out['status'] = 0;
                }
            } else {
                $out['status'] = 1;
                foreach($pre as $p){
                    $out['mongoid'] = "{$p['_id']}";
                }
            }
        break;
        
        case 'novosegredo':
            $ok = $segredos->insert(array('sexo' => (int)$_POST['sexo'] ,'idade' => (int)$_POST['idade'], 'segredo' => strip_tags($_POST['segredo']), 'registro' => time(), 'curtidas' => 0, 'token' => $_POST['token']));
            if ($ok['ok'] == 1){
                $out['status'] = 1;
                
                // dispara notificacoes
                $not = $clientes->find(array('notifica' => 1));
                $to = '';
                foreach($not as $n){
                    //$to .= $n['token'].",";
                    sendPush($n['token'],"Há um novo segredo de ADS!","segredo");
                }
                //$to = rtrim($to,",");
                //sendPush($to,"Há um novo segredo de ADS!");
            } else {
                $out['status'] = 0;
            }
            break;
        
        case 'lista':
            if ($segredos->count(true) > 0){
                $seg = $segredos->find()->sort(array('_id' => -1))->limit(10);
                $ar = array();
                $idade = array(1 => "-18", 2 => "18 &cong; 25", 3 => "26 &cong; 40", 4 => "40+");
                
                foreach($seg as $s){
                    $s['registro'] = date("d/m/Y H:i", (int)$s['registro']); //round((int)$s['registro'] / 1000));
                    $s['_id'] = "{$s['_id']}";
                    $s['sexo'] = ($s['sexo'] == 1 ? 'Homem' : 'Mulher');
                    $s['idade'] = $idade[$s['idade']];
                    
                    $ar[] = $s;
                }
                
                $out['status'] = 1;
                $out['segredos'] = $ar;
            } else {
                $out['status'] = 0;
            }
            break;
        
        case 'curtir':
            $dbid = $_POST['uid'];
            $iddb = new MongoId($dbid); 
            $ok = $segredos->update(array('_id'=> $iddb), array('$set' => array("curtidas"=>(int)$_POST['curtidas'])));
            
            if ($ok['ok'] == 1){
                $out['status'] = 1;
            } else {
                $out['status'] = 0;
            }
            break;
        
        case 'token':
            $dbid = $_POST['uid'];
            $iddb = new MongoId($dbid); 
            $ok = $clientes->update(array('_id'=> $iddb), array('$set' => array("token" => $_POST['token'])));
            
            if ($ok['ok'] == 1){
                $out['status'] = 1;
            } else {
                $out['status'] = 0;
            }
            break;
        
        case 'comenta':
            $dbid = $_POST['uid'];
            $iddb = new MongoId($dbid);
        
            $comm = $segredos->find(array('_id' => $iddb))->limit(1);
            $tmp = array();
            $qtde = 0;
        
            foreach($comm as $co){
                if (isset($co['comentarios'])){
                    $com = $co['comentarios'];
                    $x = array();
                    $x['sexo'] = $_POST['sexo'];
                    $x['idade'] = $_POST['idade'];
                    $x['comentario'] = $_POST['comentario'];
                    $x['registro'] = time();
                    $com[] = $x;
                    
                    //$co['comentarios'][] = array("sexo" => $_POST['sexo'], "idade" => $_POST['idade'], "comentario" => strip_tags($_POST['comentario']), "registro" => time());
                    $qtde = (int)$co['comentadas'] + 1;
                } else {
                    $com = array();
                    $x = array();
                    $x['sexo'] = $_POST['sexo'];
                    $x['idade'] = $_POST['idade'];
                    $x['comentario'] = $_POST['comentario'];
                    $x['registro'] = time();
                    $com[] = $x;
                    
                    //$co['comentarios'][] = array("sexo" => $_POST['sexo'], "idade" => $_POST['idade'], "comentario" => strip_tags($_POST['comentario']), "registro" => time());
                    $qtde++;
                }
                
                //$tmp[] = $co['comentarios'];
            }
        
            $ok = $segredos->update(array('_id'=> $iddb), array('$set' => array("comentarios" => $com, "comentadas" => (int)$qtde)));
            
            if ($ok['ok'] == 1){
                $out['status'] = 1;
                if (isset($_POST['token']) && strlen($_POST['token']) > 5){
                    sendPush($_POST['token'],"Comentaram em um de seus segredos!","comentario");
                }
            } else {
                $out['status'] = 0;
            }
            break;
        
        case 'comentarios':
            $idade = array(1 => "-18", 2 => "18 &cong; 25", 3 => "26 &cong; 40", 4 => "40+");
            $dbid = $_POST['uid'];
            $iddb = new MongoId($dbid); 
            $res = $segredos->find(array('_id'=> $iddb));
            $tmp = array();
            
            foreach($res as $r){
                if (isset($r['comentarios'])){
                    foreach($r['comentarios'] as $c){
                        $c['sexo'] = ($c['sexo'] == 1 ? 'Homem' : 'Mulher');
                        $c['idade'] = $idade[$c['idade']];
                        $c['registro'] = date("d/m/Y H:i", (int)$c['registro']);
                        unset($c['_id']);
                        
                        $tmp[] = $c;
                    }
                    
                    $out['status'] = 1;
                    $out['comentarios'] = $tmp;
                } else {
                    $out['status'] = 1;
                }
            }
            break;
        
        default:
            $out['status'] = 0;
    }
    
    // retorna api
    header('Access-Control-Allow-Origin: *');
    header("Content-Type: text/javascript; charset=utf-8");
    echo json_encode($out);
}

if (isset($_GET['func'])){
    if ($_GET['func'] = 'teste'){
        $dbid = $_GET['uid'];
        $iddb = new MongoId($dbid);

        $comm = $segredos->find(array('_id' => $iddb))->limit(1);
        foreach($comm as $co){
            if (isset($co['comentarios'])){
                $cc = $co['comentarios'];
                pre($cc);
            } else { echo "nenum comentario"; }
        }
    }
}

function sendPush($to, $msg, $tipo){

    // Set POST variables
    $url = 'https://android.googleapis.com/gcm/send';

    $fields = array(
                    'registration_ids'  => array($to),
                    'data'              => array("message" => $msg, 'tipo' => $tipo),
                    );

    $headers = array(
                        'Authorization: key=AIzaSyBHQjlD4jOSNnH9c5P78yDQAtyryNAy3g0',
                        'Content-Type: application/json'
                    );

    // Open connection
    $ch = curl_init();

    // Set the url, number of POST vars, POST data
    curl_setopt( $ch, CURLOPT_URL, $url );

    curl_setopt( $ch, CURLOPT_POST, true );
    curl_setopt( $ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );

    curl_setopt( $ch, CURLOPT_POSTFIELDS, json_encode( $fields ) );

    // Execute post
    $result = curl_exec($ch);

    // Close connection
    curl_close($ch);
}
function pre($x){
    echo "<pre>";
    print_r($x);
    echo "</pre>";
}
?>