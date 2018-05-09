var config = require('./config')
var Worker = require('./lib/Worker')
var Consumer = require('./consumer')
var Publisher = require('./publisher')
var MongoClient = require('mongodb').MongoClient

if (process.argv.length != 3) {
	throw Error('Invalid Arguments: pass one argument for relative worker path')
}

class App {

	constructor(name, config) {
		this.config = config
		this.name = name

		this.init()
	}

	init() {
		let proc, queue;

		try {

			this.config.queues.forEach(q => {

				if (q.name == this.name) {
					queue = q
				}
			})


			if (!queue) {
				console.error('Unable to find config for worker: ' + this.name)
				throw new Error()
			}

			// start worker processes for each queue
				
			proc = this.getWorker(this.name)
			if (!proc) {
				console.error("Worker does not exist")
				throw new Error()
			}

			proc.run()


		} catch (ex) {
			console.error('Unable to init worker: ' + this.name)
		}
	}

	getWorker(name) {
		try {
			let WorkerClass = Worker.get(name)
			let worker = new WorkerClass(Consumer, Publisher, MongoClient, this.config)
			worker.q = name.replace('_', '.')
			return worker
		} catch (ex) {
			console.error(ex)
			return null
		}
	}
}


var app = new App(process.argv[2], config);

module.exports = app;