declare var require: any
declare var process: any
declare var Buffer: any
declare var Promise: any

const fs = require('fs');
const amqp = require('amqplib/callback_api');
const argParser = require('minimist');
const guid = require('uuid/v4');
const moment = require("moment");
const maria = require('mysql');

import {rabbitConnectionString} from "./env";
import {mariadbCredentials} from "./env";

class Solver {
    algoSolver:any;
    reponses:any = [];
    constructor(algoSolver:any){
        console.log("On sette l'algosolver");
        this.algoSolver = algoSolver;
    }
    decorateAnswer(answer,index = -1){
        let decorator = this.algoSolver.getAnswerDecorator();
        let decoratedAnswer = decorator(answer,index);

        return decoratedAnswer;
    }
    writeToFile(data){
        //On écrit en mode append sync dans le fichier. Le mode sync est là pour s'assurer qu'on écrit pas en ordre dispersé dans le fichier
        fs.writeFileSync(this.algoSolver.getOutputFilename(),data,{"flag":"a"});
    }
    clearFile(){
        //On efface le fichier destination
        fs.writeFileSync(this.algoSolver.getOutputFilename(),"");
    }
    send(data,index){
        console.log("Sending",index);
    }
}
class SyncSolver extends Solver {
    constructor(algoSolver:any){
        super(algoSolver);
        this.clearFile();
    }
    send(data,index){
        super.send(data,index);
        let answer = this.algoSolver.callback(data);
        this.reponses.push(answer);
        let decoratedAnswer = this.decorateAnswer(answer,index);
        this.writeToFile(decoratedAnswer);
    }
}
class AsyncSolver extends Solver {
    uuid: any;
    constructor(algoSolver:any,uuid:any){
        super(algoSolver);
        this.uuid = uuid;
    }
    read(){
        console.log("Reading",this.uuid);
    }
    compile(){
        console.log("Compiling",this.uuid);
        this.clearFile();
    }
}
class RabbitSolver extends AsyncSolver {
    channel:any;
    
    constructor(algoSolver:any,uuid:any){
        super(algoSolver,uuid);

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
            this.channel.assertQueue(this.uuid, {durable: true});

            if(this.algoSolver.sender){
                console.log("Le script écrira dans la queue : ",this.uuid);
                console.log("Pour lire : node solver.js",this.uuid,"--async");
                this.algoSolver.parser(this.algoSolver);
                return;
            }

            //Si on doit compiler les résultats
            if(this.algoSolver.compile){
                this.compile();
                return;
            }

            //Si on doit traiter le flux
            this.read();
            return;
        });
    }
    getAnswerUuid() {
        let uuidReponse = this.uuid + "_reponse";
        return uuidReponse;
    }
    send(data,index) {
        super.send(data,index);
        this.channel.sendToQueue(this.uuid, new Buffer(JSON.stringify({index:index,input:data})), {persistent: true});
    }
    read() {
        super.read();
        this.channel.prefetch(1);
        let uuidAnswer = this.getAnswerUuid();
        this.channel.assertQueue(uuidAnswer, {durable: true});

        this.channel.consume(this.uuid,(msg) => {
            let objetParse = JSON.parse(msg.content.toString());
            console.log("Nouvel objet reçu",objetParse);
            let answer = this.algoSolver.callback(objetParse["input"]);
            console.log("Réponse à l'input",answer);
            this.channel.sendToQueue(uuidAnswer, new Buffer(JSON.stringify({answer:answer,index:objetParse.index})), {persistent: true});
            this.channel.ack(msg);
        }, {noAck: false});

    }
    compile() {
        super.compile();
        this.channel.prefetch(false);
        let uuidAnswer = this.getAnswerUuid();

        //On a besoin du nombre de messages à compiler, d'où le callback
        this.channel.assertQueue(uuidAnswer, {durable: true},(err,info) => {
            let nbMessages = info.messageCount;
            console.log("Il y a",nbMessages,"messages à compiler");
            this.channel.consume(uuidAnswer,(msg) => {
                let objetParse = JSON.parse(msg.content.toString());
                console.log("Nouvel objet reçu",objetParse);
                this.reponses.push(objetParse);
                if(this.reponses.length == nbMessages){
                    //On trie les réponses suivant leur index pour générer un fichier cohérent
                    this.reponses.sort((x,y) => {
                        return x.index - y.index;
                    });
                    let decoratedAnswers = this.reponses.map((reponse) => this.decorateAnswer(reponse.answer,reponse.index));
                    this.writeToFile(decoratedAnswers.join(""));
                    process.exit();
                }
            }, {noAck: false});
        });
        
    }
}
class MariadbSolver extends AsyncSolver {
    connection:any;
    sent:boolean = false;
    constructor(algoSolver:any,uuid:any) {
        super(algoSolver,uuid);

        this.connection = maria.createConnection(mariadbCredentials);

        //Une fois la connexion réalisée
        if(this.algoSolver.sender){
            console.log("Le script écrira dans la queue : ",this.uuid);
            console.log("Pour lire : node solver.js",this.uuid,"--async --db");
            this.algoSolver.parser(this.algoSolver);
            return;
        }

        //Si on doit compiler les résultats
        if(this.algoSolver.compile){
            this.compile();
            return;
        }

        //Si on doit traiter le flux
        this.read();
    }
    send(data,index) {
        super.send(data,index);
        if(this.sent){
            console.log("Le mode db n'est censé envoyer qu'un input !");
            return;
        }
        let stringifiedData = JSON.stringify({index:index,input:data});
        this.sent = true;
        this.connection.query(`INSERT INTO input (uuid,data) VALUES ("${this.uuid}",${this.connection.escape(stringifiedData)})`, function (error, results, fields) {
            console.log(error,results,fields);
            process.exit();
        });
    }
    read() {
        super.read();
        this.connection.query(`SELECT data FROM input WHERE uuid = "${this.uuid}" LIMIT 1`, (error, results, fields) => {
            console.log(error,results,fields);
            if(results.length != 1){
                console.log("Il n'y a aucun résultat dans la table input correspond à cet uuid");
            }

            let objetParse = JSON.parse(results[0]["data"]);

            let boucle = () => {
                let metaAnswer = this.algoSolver.callback(objetParse["input"]);
                //Le callback délivre un score
                if(metaAnswer.score == undefined || metaAnswer.answer === undefined){
                    console.log("Il n'y a aucun intérêt à ne pas renvoyer de score");
                    process.exit();
                }

                let score = metaAnswer.score;
                let answer = metaAnswer.answer;
                let stringifiedAnswer = JSON.parse(answer);
                let stringifiedScore = JSON.parse(score);

                //On récupère le score maximum
                this.connection.query(`SELECT score FROM solution WHERE input_uuid = "${this.uuid}"`, (error, results, fields) => {
                    let okInsertion = results.length == 0;
                    if(!okInsertion){
                        let better = this.algoSolver.getBetter();

                        let bestSavedScore = results.map((x) => JSON.parse(x.score)).reduce((x,y) => better(x,y));

                        console.log("Meilleur score en base",bestSavedScore);

                        if(bestSavedScore != score && better(score,bestSavedScore) == score){
                            okInsertion = true;
                        }
                    }

                    if(!okInsertion){
                        boucle();
                        return;
                    }
                    
                    console.log("Nouveau meilleur score trouvé",score);

                    this.connection.query(`INSERT INTO solution (input_uuid,answer,score) VALUES ("${this.uuid}",${this.connection.escape(stringifiedAnswer)},${this.connection.escape(stringifiedScore)})`, (error, results, fields) => {
                        console.log(error,results,fields);
                        console.log("On repart pour une boucle");
                        boucle();
                    });
                });
            };
            console.log("On entame une boucle");
            boucle();
        });
    }
    compile(){
        super.compile();
        this.connection.query(`SELECT score,answer FROM solution WHERE input_uuid = "${this.uuid}"`, (error, results, fields) => {
            if(results.length == 0){
                console.log("Aucune solution à compiler !");
                process.exit();
            }

            let better = this.algoSolver.getBetter();

            let betterWrapper = (x,y) => {
                let bestScore = better(x.score,y.score);
                if(bestScore == x.score){
                    return x;
                }
                return y;
            };

            let bestRow = results.reduce((x,y) => betterWrapper(x,y));

            console.log("Meilleur enregistrement en base",bestRow);

            let answer = JSON.parse(bestRow.answer);
            let decoratedAnswer = this.decorateAnswer(answer);
            console.log("Réponse décorée",decoratedAnswer);
            this.writeToFile(decoratedAnswer);
            return;
        });
    }
}

export class AlgoSolver {
    callback:any;
    parser:any;
    options:any;
    solver:any;
    compile:boolean;
    sender:boolean;

    constructor(callback:any, parser:any,options:any={}) {
        this.callback = callback;
        this.parser = parser;
        this.options = options;

        //Extraction des arguments
        let args = argParser(process.argv.slice(2));

        //Mode hashcode
        let hash = (args.hash || args.hashCode);

        //Si l'option hash est précisée et qu'aucun answerDecorator n'est fourni, on met le décorateur identité qui ne touche pas la réponse.
        if(hash && !this.options.answerDecorator){
            this.options.answerDecorator = (x) => x;
        }

        //Si on n'est pas en mode asynchrone, on résout en mode direct
        if(!args.async){
            console.log("Lancement en mode direct");
            this.solver = new SyncSolver(this);
            return parser(this);
        }

        //Si on n'est pas en mode direct c'est qu'on est en mode async
        console.log("Lancement en mode async");

        this.sender = args.sender;
        this.compile = args.compile;

        //En mode async, soit on est lancé en mode sender, soit on est lancé en mode reader soit on est lancé en mode compiler. Le mode reader étant celui par défaut
        if(!this.sender && args._.length == 0){
            console.log("Aucun uuid de queue ou d'input fourni et pas de mode sender ou compile sélectionné !");
            process.exit();
        }

        //Soit il y a un uuid fourni, soit on en génère un ayant la forme 20170126_191058_aaaae1eef1. On peut préciser si on le veut l'id pour le mode sender, mais de toutes façons un id sera généré
        let uuid = args._.length > 0 ? args._[0] : moment().format("YYYYMMDD_HHmmss") + "_" + guid().replace(/-/g,"");

        //Si mode hashcode, on passe en mode db car aucune raison de partir sur autre chose
        if(hash || args.db){
            this.solver = new MariadbSolver(this, uuid);
            return;
        }

        this.solver = new RabbitSolver(this, uuid);
    }
    extractLines(filename:string,callback) {
        console.log("Extraction du fichier",filename);
        fs.readFile(filename, 'utf8', function(err, contents) {
            let lignes = contents.split("\n");
            callback(lignes);
        });
    }
    send(data,index=-1){
        this.solver.send(data,index);
    }
    baseAnswerDecorator(answer,index){
        let prefix = "\n";
        if(index == 0){
            prefix = "";
        }
        return prefix + "Case #" + (index + 1) + ": " + answer;
    }
    getAnswerDecorator(){
        let decorator = this.baseAnswerDecorator;
        if(this.options && this.options.answerDecorator){
            decorator = this.options.answerDecorator;
        }
        return decorator;
    }
    getBetter(){
        let better = Math.max;

        if(this.options.better){
            better = this.options.better;
        }

        return better;
    }
    getOutputFilename(){
        let filename = "output.out";

        if(this.options.outputFilename){
            filename = this.options.outputFilename;
        }

        return filename;
    }
}