declare var require: any
declare var process: any
declare var Buffer: any
declare var Promise: any

const fs = require('fs');
const amqp = require('amqplib/callback_api');
const argParser = require('minimist');
const guid = require('uuid/v4');
const moment = require("moment");

import {rabbitConnectionString} from "./env";

export class AlgoSolver {
    callback:any;
    channel:any;
    uuid:any;
    async:boolean=false;
    reponses:any = [];
    options:any;

    constructor(callback:any, parser:any,options:any={}) {
        this.callback = callback;
        this.options = options;

        //Extraction des arguments
        let args = argParser(process.argv.slice(2));

        if(args.async){
            this.async = true;
        }

        //Si on n'est pas en mode asynchrone
        if(!this.async){
            console.log("Lancement en mode direct");
            fs.writeFileSync("output.out","");
            return parser(this);
        }

        //Si on n'est pas en mode direct c'est qu'on est en mode async
        console.log("Lancement en mode async");
        if(!args.sender && args._.length == 0){
            console.log("Aucun id de queue fourni et pas de mode sender ou compile sélectionné !");
            process.exit();
        }

        //On se connecte
        let rabbitConnected = new Promise(function(resolve:any,reject:any){
            amqp.connect(rabbitConnectionString, function(err, conn) {
              conn.createChannel(function(err, ch) {
                resolve(ch);
              });
            });
        });

        //Une fois la connexion réalisée
        rabbitConnected.then(ch => {
            this.channel = ch;
            if(args.sender){
                this.uuid = moment().format("YYYYMMDD_HHmmss") + "_" + guid().replace(/-/g,"");
                console.log("Le script écrira dans la queue : ",this.uuid);
                console.log("Pour lire : node solver.js",this.uuid,"--async");
                ch.assertQueue(this.uuid, {durable: true});
                return parser(this);
            }

            this.uuid = args._[0];
            let uuidReponse = this.uuid + "_reponse";
            console.log("Nb messages",ch.assertQueue(this.uuid, {durable: true}));
            ch.assertQueue(uuidReponse, {durable: true});
            ch.prefetch(1);

            //Si on doit compiler les résultats
            if(args.compile){
                console.log("Compiling",this.uuid);
                ch.consume(uuidReponse,function(msg) {
                    let objetParse = JSON.parse(msg.content.toString());
                    console.log("Nouvel objet reçu",objetParse);
                    this.reponses.push(objetParse);
                    ch.ack(msg);
                }, {noAck: false});
                return;
            }

            //Si on doit traiter le flux
            console.log("Reading",this.uuid);
            ch.consume(this.uuid,function(msg) {
                let objetParse = JSON.parse(msg.content.toString());
                console.log("Nouvel objet reçu",objetParse);
                let answer = callback(objetParse["input"]);
                console.log("Réponse à l'input",answer);
                ch.sendToQueue(uuidReponse, new Buffer(JSON.stringify({answer:answer,index:objetParse.index})), {persistent: true});
                ch.ack(msg);
            }, {noAck: false});

        });
    }
    extraireLignes(filename:string,callback) {
        console.log("Extraction du fichier",filename);
        fs.readFile(filename, 'utf8', function(err, contents) {
            let lignes = contents.split("\n");
            callback(lignes);
        });
    }
    send(data,index=-1){
        //Si on est en mode direct (et non async), on résout directement le cas
        if(!this.async){
            let answer = this.callback(data);
            this.reponses.push(answer);

            let decorator = this.decorateAnswer;
            if(this.options && this.options.answerDecorator){
                decorator = this.options.answerDecorator;
            }

            let decoratedAnswer = decorator(answer,index);

            //On écrit en mode append sync dans le fichier
            return fs.writeFileSync("output.out",decoratedAnswer,{"flag":"a"});
        }
        console.log("Sending",index);
        //Sinon on envoie sur la queue
        this.channel.sendToQueue(this.uuid, new Buffer(JSON.stringify({index:index,input:data})), {persistent: true});
    }
    decorateAnswer(answer,index){
        let prefix = "\n";
        if(index == 0){
            prefix = "";
        }
        return prefix + "Case #" + (index + 1) + ": " + answer;
    }
}