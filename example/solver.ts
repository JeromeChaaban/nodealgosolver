import {AlgoSolver} from "../bin/algosolver";

let callback = (input) => {
    let answer = input.a * input.b;
    return answer;
};

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