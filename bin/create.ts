declare var process: any
declare var require: any

const argParser = require('minimist');
let ncp = require('ncp').ncp;

let args = argParser(process.argv.slice(2));

if(args._.length == 0){
    console.log("Aucun nom choisi pour le projet");
    process.exit();
}

let nomDossier = args._[0];
let nomDossierPrefixe = "exercice_" + nomDossier;

console.log("Création du dossier",nomDossierPrefixe);

ncp("example",nomDossierPrefixe , function (err) {
    if (err) {
        return console.error(err);
    }
    console.log("Dossier",nomDossierPrefixe,"créé");
});