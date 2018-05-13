# gamesense.workers

## Sample Config

    module.exports = {

        messageBroker: {
            name: 'rmq',
            connectionString: 'amqp://user:pass@localhost'
        },

        database: {
            name: 'prod',
            connectionString: 'mongodb://ec2-18-233-188-98.compute-1.amazonaws.com'
        },

        exchanges: [],
        queues: [
            {name: 'test_score_old',instances:2},
            {name: 'test_calculate_old'}
        ]
    };

## Installing
    sudo npm install

## Start app
    nohup gulp &