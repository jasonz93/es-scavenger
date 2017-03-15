#!/usr/bin/env node
'use strict';
const Promise = require('bluebird');
const elasticsearch = require('elasticsearch');
const util = require('util');

var program = require('commander');

program.version('1.0.0')
    .command('by-days <host> <prefix> <days>')
    .action(function (host, prefix, days) {
        const client = new elasticsearch.Client({
            host: host
        });
        Promise.promisifyAll(client.indices);

        client.indices.get({
            expandWildcards: 'all',
            index: prefix + '*'
        }).then((data) => {
            let promise = Promise.resolve();
            let expiredCount = 0;
            for (let key in data) {
                (() => {
                    let name = key;
                    let indice = data[name];
                    let createAt = new Date(Number(indice.settings.index.creation_date));
                    let fromNowDays = (new Date() - createAt) / 1000 / 3600 / 24;
                    if (fromNowDays >= Number(days)) {
                        console.log('Index %s created %d days ago, deleting it.', name, fromNowDays);
                        expiredCount ++;
                        promise = promise.then(() => {
                            return client.indices.delete({
                                index: name
                            }).then((data) => {
                                console.log('Index %s deleted.', name);
                            })
                        });
                    }
                })();
            }
            console.log('Found %d expired index.', expiredCount);
        })
    });

program.parse(process.argv);



