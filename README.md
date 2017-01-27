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
- cd exercice_nameOfYourExercice
- edit the solver.ts and input.in files situated in the newly created folder exercice_nameOfYourExercice
- `tsc && node solver.js` when you are ready (you must execute those command in exercice_nameOfYourExercice folder)

Modes
=

Three modes are existing

- sync mode
- async mode with RabbitMQ : in case there is several independent cases and you want to parallelize and use several cores of your computers or several computers. Each script treating one case at a time.
- async mode with MariaDB : in case there is ONE test case where you need to do the best score possible. In this scenario, every worker is working on the SAME input. Of course, it is useful only if your resolution includes some randomness. Ideal for Google Hash Code exercices.

Options

- You can set an answer decorator. The base answer decorator is :

`baseAnswerDecorator(answer,index){
    let prefix = "\n";
    if(index == 0){
        prefix = "";
    }
    return prefix + "Case #" + (index + 1) + ": " + answer;
}`

A decorator will receive two arguments : the answer and the index. The baseAnswerDecorator will return the classic form of a test case in Google Code Jam or Facebook Hacker Cup.

But if you prefer decorate yourself your answer, you can pass an option :

{
    "answerDecorator":(x) => x
}

This decorator for example lets the answer as it were.

Mode RabbitMQ
=

- node solver.js --async --sender => Mode RabbitMQ. It uses your parser function to parse input (from a file ?)
- node solver.js aUniqueId --async => Mode RabbitMQ. Consumes the queue named aUniqueId. You can launch as many scripts as you need. If you want to keep the same terminal, you can type : nohup node solver.js aUniqueId --async &

Mode MariaDB
=

- node solver.js --async --sender --db => Mode MariaDB. It uses your parser function to parse input (from a file ?). It expects a database with one table called input and one table called solution. With this mode, you are not supposed to send several inputs.
- node solver.js aUniqueId --async --db => Mode MariaDB. Check the input based on its unique id and tries to solve. Checks the solution table. If it performs, it writes in the solution table the new best solution with its score.
