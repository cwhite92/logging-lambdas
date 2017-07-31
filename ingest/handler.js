'use strict';

const AWS = require('aws-sdk');
const uuidv4 = require('uuid/v4');
const tokenRepository = require('./token-repository');
const elasticsearch = require('elasticsearch');
const moment = require('moment');

module.exports.ingest = (event, context, callback) => {
    const input = JSON.parse(event.body);

    tokenRepository.findToken(event.headers['Authorization'].split(' ')[1], (token) => {
        const uuid = uuidv4();
        const payload = {
            data: input,
            meta: {
                uuid: uuid,
                environmentId: token.environment_id,
                ingested: new Date().toISOString()
            }
        };

        const client = new elasticsearch.Client({
            host: process.env.ES_HOST,
            port: process.env.ES_PORT || 80
        });

        client.index({
            index: moment().format('YYYY-MM-DD'),
            type: 'log',
            id: payload.meta.uuid,
            body: payload
        });
    });
};
