Node algo solver
==

Required :
=

- docker
- docker-compose

Starting
=

- `git clone `
- `docker-compose up -d`
- `docker exec -it nodealgosolver_node_1 bash`
- `npm install`
- `npm run init`
- Optional : edit `env.ts` credentials to connect to your RabbitMQ or MariaDB in case you want to use an async mode

Fast playing
=

- `npm run create -- nameOfYourExercice` => This command creates a new folder called exercice_nameOfYourExercice with several files in it. You are ready to go !
- `cd exercice_nameOfYourExercice`
- edit the solver.ts and input.in files situated in the newly created folder exercice_nameOfYourExercice
- `tsc && node solver.js` when you are ready (you must execute those command in exercice_nameOfYourExercice folder)

Modes
=

Three modes are existing

- sync mode
- async mode with RabbitMQ : in case there is several independent cases and you want to parallelize and use several cores of your computers or several computers. Each script treats one case at a time.
- async mode with MariaDB : in case there is ONE test case where you need to do the best score possible. In this scenario, every worker is working on the SAME input. Of course, it is useful only if your resolution includes some randomness. Ideal for Google Hash Code exercices.

Sync mode code example
=
- solver.ts

```
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
```

- Execution

`tsc && node solver.js`

- Notes

When you call algoSolver.send, you send an input object. You can put anything you want. That's exactly the same object your callback function will receive as its first argument. The second argument of send is the index of the test case, starting from 0. If you don't have any index, let it free and juste call send(data).

- Change answer decorator

Just use `new AlgoSolver(callback,parser,{"answerDecorator":(x) => x});` instead of the last line. See the options situated below for more explanations.

Options
=

- You can set an answer decorator. The base answer decorator is :
```
baseAnswerDecorator(answer,index){
    let prefix = "\n";
    if(index == 0){
        prefix = "";
    }
    return prefix + "Case #" + (index + 1) + ": " + answer;
}
```

A decorator will receive two arguments : the answer and the index of the test case. The baseAnswerDecorator will return the classic form of a test case in Google Code Jam or Facebook Hacker Cup.

But if you prefer decorate yourself your answer, you can pass an option object as a third argument to the AlgoSolver constructor :

{"answerDecorator":(x) => x}

This decorator for example lets the answer as it were.

- You can change the file where the solution has to be written

`{"outputFilename":"hello.out"}`

- You can change the better function (see the MariaDB async mode for more explanations)

`{"better":(x,y)=> Math.min }`

Async mode RabbitMQ code example
=

You can use exactly the same code as before. You don't have anything to modify. Only the execution command changes.

Just parse the input with :

`tsc && node solver.js --async --sender`

And then, once finished, launch as many readers as you need :

`node solver.js aUniqueId --async`

You can use several devices, several computers, several servers. As long as they have your code and can connect to your RabbitMQ instance.

If you want to keep solely one terminal window, just type several times :

`nohup node solver.js aUniqueId --async &`

This will run in background.

One your queue is empty, you need to compile the solution.

Just run :

`node solver.js aUniqueId --async --compile`

You are done !

Async mode MariaDB code example
=

When you want to create a competition between several workers around the SAME input, the MariaDB mode is what you need. Everything stays the same except that your answer has to be wrapped in an object with a score.

The score can be anything. But it will probably be a number that you will want to maximize or minimize.

That's what could become a callback function

```
let callback = (input) => {
    let answer = input.a * input.b;
    let score = Math.floor((Math.random() * 1000000) + 1);
    return {
        "answer":answer,
        "score":score
    };
};
```
- Sending the input

`tsc && node solver.js --async --sender --db`

- Reading the input

`node solver.js aUniqueId --async --db`

Each script will solve the input indefinitely. Obviously, if you have no randomness, you have nothing to do with this mode. When a script finds an answer, if also gets a score. It compares this score with the best score available in the database. If it has a better score, it writes it and makes it available to all other scripts working hard !

- Better function

The better function can be passed as an option to the AlgoSolver constructor. A better function will receive two scores and will choose which is the best. The base better function is the Math.max function. You can pass the Math.min function or anything custom you need. For example, you could pass this function which gives the longer string (a score could be a string or anythin else) :

let better = (x,y) => x.length >= y.length ? x : y;

As usual, you can put as much workers as you want.

- Compile the best answer

`node solver.js aUniqueId --async --db --compile`

- Notes

--hash is the same as --db option except that --hash option uses the identity answerDecorator which is generally adapted to Google Hash Code problems

- Structure creation

For example :
```
`CREATE TABLE `input` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(100) DEFAULT NULL,
  `data` longtext,
  PRIMARY KEY (`id`),
  KEY `idx_input_uuid` (`uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;


`CREATE TABLE `solution` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `input_uuid` varchar(100) DEFAULT NULL,
  `answer` longtext,
  `score` longtext,
  PRIMARY KEY (`id`),
  KEY `idx_solution_input_uuid` (`input_uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8;`
```
