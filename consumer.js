var amqp = require('amqplib/callback_api');
const uuid = require('uuid/v4');
var fs = require('fs');
var util = require('util');
var sleep = require('sleep');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};



const uuidForCurrentExecution = uuid();


// func gets called inside amqp connection, 
// should accept an object to call publish on, 
// @param publisher
// object with two methods
//		@method publish
//		@method close
function MakeConsumer(func, q, connectionString) {

  	return function() {



		let connectPromise = new Promise((resolve, reject) => {
		amqp.connect(connectionString, function(err, conn) {
			if (err) {
			      console.error(err);
			      reject();
			      return;
			}

		     conn.createChannel(function(err, ch) {

		     	ch.assertQueue(q, {durable: false});

		     	console.log("RMQ: [*] Waiting for messages in %s. To exit press CTRL+C", q);

		     	let _func = async function(msg) {
		     		let content = JSON.parse(msg.content);
		     		console.log(` [x] Received ${JSON.stringify(content)}`);
		     		return await func(content, msg, conn, ch);
		     	}

		     	ch.consume(q, _func, {noAck: false});

		     }) 

     


	      
	      });
		});
	}
}

function consume(receive, q, connectionString) {
	(MakeConsumer(receive, q, connectionString))();
}

module.exports.MakeConsumer = MakeConsumer;
module.exports.consume = consume;
module.exports.uuidForCurrentExecution = uuidForCurrentExecution
	     