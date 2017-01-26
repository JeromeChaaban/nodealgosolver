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