import {AlgoSolver} from "./algosolver";

let callback = (input) => {
    let answer = input.a * input.b;
    let score = Math.floor((Math.random() * 1000000) + 1);
    return {
        "answer":answer,
        "score":score
    };
};

let parser = (algoSolver) => {
    algoSolver.extraireLignes("input.in",(lignes) => {
        let nbTests = lignes.shift();
        for(let i = 0;i < nbTests;i++){
            let [a,b] = lignes.shift().split(" ");
            algoSolver.send({a:a,b:b},i);
        }
    });
};

new AlgoSolver(callback,parser);