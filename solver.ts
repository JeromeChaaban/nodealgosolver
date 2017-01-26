import {AlgoSolver} from "./algosolver";

let callback = function(input){
    return input.a * input.b;
};

let parser = function(algoSolver){
    algoSolver.extraireLignes("input.in",(lignes) => {
        let nbTests = lignes.shift();
        for(let i = 0;i < nbTests;i++){
            let [a,b] = lignes.shift().split(" ");
            algoSolver.send({a:a,b:b},i);
        }
    });
};

new AlgoSolver(callback,parser);

/*
fs.readFile('input.in', 'utf8', function(err, contents) {
    let lignes = contents.split("\n");
    let nbTests = parseInt(lignes.shift());
    console.log("Nb tests",nbTests);
    let retours = [];

    for(let i = 0;i < nbTests;i++){
        let [a,b] = lignes.shift().split(" ").map((x) => parseInt(x));
        retours.push(callback({a:a,b:b}));
    }
    
    let retoursString = retours.map((retour,index) => "Case#"+(index+1)+": "+retour).join("\n");

    fs.writeFile("output.out", retoursString, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("Fichier sauvé !");
    });
});

//
amqp.connect(connectionString, function(err, conn) {
  conn.createChannel(function(err, ch) {
    var msg = "Hello World!";

    ch.assertQueue('task_queue', {durable: true});
    ch.sendToQueue('task_queue', new Buffer(msg), {persistent: true});
    console.log(" [x] Sent '%s'", msg);
    process.exit();
  });
});
//
amqp.connect(connectionString, function(err, conn) {
  conn.createChannel(function(err, ch) {
    var q = 'task_queue';

    ch.assertQueue(q, {durable: true});
    ch.prefetch(1);
    console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q);
    ch.consume(q, function(msg) {
      var secs = msg.content.toString().split('.').length - 1;

      console.log(" [x] Received %s", msg.content.toString());
      setTimeout(function() {
        console.log(" [x] Done");
        ch.ack(msg);
      }, secs * 1000);
    }, {noAck: false});
  });
});*/

//Mode où on veut plusieurs consommateurs
//Oui mais base commune