import {AlgoSolver} from "../bin/algosolver";

let callback = (input) => {
    let answer = input.a * input.b;
    return answer;
};

/** 
    In case you are using --db or --hash mode, you need to wrap the answer to the input in an object containing an answer property and a score property.
    The score can be anything. Probably you will need it to be a number and you will want to maximize or minimize this number.
    You have to give a "better" function that compares two scores and renders the best one. The base "better" function is max.
**/

/*
let callbackIfYouUseMariaDb = (input) => {
    let answer = input.a * input.b;
    let score = Math.floor((Math.random() * 1000000) + 1);
    return {
        "answer":answer,
        "score":score
    };
};*/

let parser = (algoSolver) => {
    algoSolver.extractLines("input.in",(lignes) => {
        let nbTests = lignes.shift();
        for(let i = 0;i < nbTests;i++){
            let [a,b] = lignes.shift().split(" ");
            algoSolver.send({a:a,b:b},i);
        }
    });
};

new AlgoSolver(callback,parser);